#!/usr/bin/env python3
"""The Grok bridge: Pipeline hands Grok bot a job, Grok hands back a result file.

Contract: CONTRACT-grok-bridge.md. Two job types and nothing else:

  call        Grok shows Caleb a Call card in its own chat. Nothing dials until he taps it. The card
              lasts 30 minutes.
  hard_draft  Grok writes a draft. Pipeline shows it in the compose box. Pipeline is still the only sender.

This module never sends a text or an email and never dials. It builds the job, checks Grok's own limits
before the job leaves, posts it to the webhook routine, and reads result files by job_id. app.py owns the
gates that need the CRM (Do Not Contact, quiet hours, the live host).

Standard library only. `python3 bridge.py --test` runs the offline checks.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta
from pathlib import Path

VERSION = 1
JOB_TYPES = ("call", "hard_draft")
# What a call may be for. Scripted calls are short and narrow. An assisted call opens as a virtual assistant
# and moves to Caleb's phone. Price, offer, contract or attorney talk always moves to Caleb.
PURPOSES = {
    "showing_confirmation": "Confirm a showing",
    "appointment_reminder": "Appointment reminder",
    "requested_callback": "Callback they asked for",
    "assisted_intro": "Open the call, then hand to Caleb",
}
RESULT_STATUSES = ("dial_card_shown", "completed", "canceled", "expired", "failed", "draft_ready")
FINAL = ("completed", "canceled", "expired", "failed", "draft_ready")

# Grok's own limits (from Grok, 2026-11-10). Checked here so a job that cannot run never leaves the Mac.
MAX_CALLS_24H = 10
MAX_CALLS_PER_NUMBER_24H = 4
SCRIPT_LIMIT = 2000
CARD_MINUTES = 30
# Grok does not call Washington or Illinois. An area code is where a number was issued, not where the person
# lives now, so this is a first check and not a promise.
NO_CALL_AREA_CODES = {
    "WA": {"206", "253", "360", "425", "509", "564"},
    "IL": {"217", "224", "309", "312", "331", "447", "464", "618", "630", "708", "730", "773", "779", "815", "847", "861", "872"},
}


class BridgeError(Exception):
    pass


def e164(phone: str) -> str:
    """'(225) 555-0100' -> '+12255550100'. United States numbers only."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10 or digits[0] in "01":
        raise BridgeError("Grok only calls United States numbers, and this is not a ten digit one")
    return "+1" + digits


def blocked_state(phone_e164: str) -> str:
    area = phone_e164[2:5]
    return next((st for st, codes in NO_CALL_AREA_CODES.items() if area in codes), "")


def check_call_limits(log: list[dict], phone_e164: str, at: datetime) -> None:
    """Raise when this call would pass Grok's caps. Counts jobs that really left (status 'posted')."""
    st = blocked_state(phone_e164)
    if st:
        raise BridgeError(f"Grok does not call {'Washington' if st == 'WA' else 'Illinois'} numbers (area code {phone_e164[2:5]})")
    since = at - timedelta(hours=24)
    calls = [r for r in log if r.get("job_type") == "call" and r.get("status") == "posted"
             and datetime.fromisoformat(r["at"]) > since]
    if len(calls) >= MAX_CALLS_24H:
        raise BridgeError(f"call limit: {len(calls)} of {MAX_CALLS_24H} Grok calls in the last 24 hours")
    same = sum(1 for r in calls if r.get("to") == phone_e164)
    if same >= MAX_CALLS_PER_NUMBER_24H:
        raise BridgeError(f"call limit: {same} of {MAX_CALLS_PER_NUMBER_24H} Grok calls to this number in the last 24 hours")


def build_job(job_type: str, person: dict, at: datetime, *, purpose: str = "", objective: str = "", context: str = "",
              draft_instructions: str = "", transfer_to: str = "", writeback: dict | None = None, job_id: str = "") -> dict:
    """One job, shaped as the contract says. Raises when it would not fit Grok's rules."""
    if job_type not in JOB_TYPES:
        raise BridgeError("job_type must be call or hard_draft")
    if not str(person.get("person_id") or "").strip():
        raise BridgeError("every job is tied to a person_id so the result can be logged")
    objective, context, draft_instructions = objective.strip(), context.strip(), draft_instructions.strip()
    out_person = {"person_id": str(person["person_id"]), "display_name": person.get("display") or person.get("display_name") or "",
                  "band": person.get("band") or "", "relationship": person.get("relationship") or person.get("stage") or ""}
    if job_type == "call":
        if purpose not in PURPOSES:
            raise BridgeError("a call needs one of these purposes: " + ", ".join(PURPOSES))
        if not objective:
            raise BridgeError("a call needs one line saying what it should get done")
        if len(objective) + len(context) > SCRIPT_LIMIT:
            raise BridgeError(f"too long for a call: {len(objective) + len(context)} characters, Grok's voice agent takes {SCRIPT_LIMIT}")
        out_person["phone_e164"] = e164(person.get("phone") or person.get("phone_e164") or "")
        if purpose == "assisted_intro" and not transfer_to:
            raise BridgeError("an assisted call needs Caleb's number to hand over to: set PIPELINE_TRANSFER_TO in ~/.aire/pipeline.env")
    else:
        if not draft_instructions:
            raise BridgeError("a hard draft needs a line saying what the message has to do")
    return {
        "v": VERSION, "job_id": job_id or str(uuid.uuid4()), "job_type": job_type,
        "requested_at": at.isoformat(timespec="seconds"), "source": "pipeline", "person": out_person,
        "purpose": purpose if job_type == "call" else "", "objective": objective, "additional_context": context,
        "draft_instructions": draft_instructions or None,
        "transfer_to_e164": e164(transfer_to) if (job_type == "call" and transfer_to) else None,
        "result_writeback": writeback or {"method": "google_drive", "hint": "Pipeline Bridge Results"},
    }


def post_job(job: dict, url: str, key: str = "", auth_header: str = "", opener=urllib.request.urlopen, timeout: int = 20) -> int:
    """POST the job to Grok's webhook routine. 2xx only means Grok accepted the job, never that a call
    happened or a draft exists. The key and header come from ~/.aire/pipeline.env and are never logged."""
    if not url.lower().startswith("https://"):
        raise BridgeError("the Grok webhook URL is missing or is not https: set PIPELINE_GROK_WEBHOOK_URL in ~/.aire/pipeline.env")
    headers = {"Content-Type": "application/json", "User-Agent": "pipeline-bridge/1"}
    if auth_header:
        headers["Authorization"] = auth_header
    elif key:
        headers["Authorization"] = "Bearer " + key
    req = urllib.request.Request(url, data=json.dumps(job).encode("utf-8"), headers=headers, method="POST")
    try:
        with opener(req, timeout=timeout) as resp:
            code = getattr(resp, "status", 200)
    except urllib.error.HTTPError as e:
        raise BridgeError(f"Grok's webhook refused the job (HTTP {e.code})") from None
    except (urllib.error.URLError, OSError) as e:
        raise BridgeError(f"Grok's webhook could not be reached ({getattr(e, 'reason', e)})") from None
    if not 200 <= code < 300:
        raise BridgeError(f"Grok's webhook answered HTTP {code}")
    return code


def read_results(folder: Path) -> dict[str, dict]:
    """Every well formed result file in the folder, by job_id. A file that is not a result is skipped, not
    trusted: the folder may be a synced Drive folder."""
    out: dict[str, dict] = {}
    if not folder or not Path(folder).is_dir():
        return out
    for f in sorted(Path(folder).glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if not isinstance(d, dict) or d.get("status") not in RESULT_STATUSES or not isinstance(d.get("job_id"), str):
            continue
        out[d["job_id"]] = {"job_id": d["job_id"], "status": d["status"], "outcome": str(d.get("outcome") or "")[:80],
                            "summary": str(d.get("summary") or "")[:500],
                            "draft_text": (str(d["draft_text"])[:4000] if d.get("draft_text") else None),
                            "finished_at": str(d.get("finished_at") or "")[:40]}
    return out


def card_expired(entry: dict, at: datetime) -> bool:
    """A posted call with no result after the card's life plus a little slack. Grok's own 'expired' file wins
    when it arrives. This only stops the screen from waiting forever."""
    return (entry.get("job_type") == "call" and entry.get("status") == "posted" and not entry.get("result")
            and at - datetime.fromisoformat(entry["at"]) > timedelta(minutes=CARD_MINUTES + 10))


def run_tests() -> int:
    import tempfile
    from zoneinfo import ZoneInfo

    failures = 0

    def check(cond, label):
        nonlocal failures
        print(("ok   " if cond else "FAIL ") + label)
        failures += 0 if cond else 1

    def refuses(fn, word, label):
        try:
            fn()
            check(False, label)
        except BridgeError as e:
            check(word in str(e), label)

    t = datetime(2026, 11, 10, 14, 0, tzinfo=ZoneInfo("America/Chicago"))
    who = {"person_id": "247", "display": "Taylor Sample", "phone": "(225) 555-0100", "band": "hot", "stage": "client"}
    check(e164("(225) 555-0100") == "+12255550100" and e164("1-225-555-0100") == "+12255550100", "phone numbers become +1 and ten digits")
    refuses(lambda: e164("+44 20 7946 0958"), "United States", "a number outside the United States is refused")
    j = build_job("call", who, t, purpose="showing_confirmation", objective="Confirm tomorrow's 2 pm showing.", transfer_to="225-555-0111", job_id="j1")
    check(j["v"] == 1 and j["job_id"] == "j1" and j["person"]["phone_e164"] == "+12255550100" and j["transfer_to_e164"] == "+12255550111"
          and j["source"] == "pipeline" and j["draft_instructions"] is None, "a call job has the contract's fields")
    check(set(j) == {"v", "job_id", "job_type", "requested_at", "source", "person", "purpose", "objective", "additional_context",
                     "draft_instructions", "transfer_to_e164", "result_writeback"}, "no field outside the contract")
    refuses(lambda: build_job("call", who, t, purpose="price_talk", objective="x"), "purposes", "a call for anything off the list is refused")
    refuses(lambda: build_job("call", who, t, purpose="appointment_reminder", objective=""), "one line", "a call with no objective is refused")
    refuses(lambda: build_job("call", who, t, purpose="appointment_reminder", objective="x", context="y" * 2000), "too long", "a script past 2,000 characters is refused")
    refuses(lambda: build_job("call", who, t, purpose="assisted_intro", objective="Open, then hand over."), "PIPELINE_TRANSFER_TO", "an assisted call needs a number to hand over to")
    refuses(lambda: build_job("text", who, t), "job_type", "there is no text job: Pipeline is the one sender")
    d = build_job("hard_draft", who, t, draft_instructions="They are upset about the inspection. Calm, no promises.")
    check(d["job_type"] == "hard_draft" and "phone_e164" not in d["person"] and d["transfer_to_e164"] is None and d["purpose"] == "",
          "a hard draft carries no phone number")
    refuses(lambda: build_job("hard_draft", who, t), "what the message", "a hard draft with no instructions is refused")
    refuses(lambda: build_job("call", {"display": "No Id"}, t, purpose="appointment_reminder", objective="x"), "person_id", "a job with no person is refused")

    posted = lambda mins, to="+12255550100": {"job_type": "call", "status": "posted", "to": to, "at": (t - timedelta(minutes=mins)).isoformat()}
    check_call_limits([posted(10), posted(20), posted(30)], "+12255550100", t)
    check(True, "three calls to one number in a day is allowed")
    refuses(lambda: check_call_limits([posted(m) for m in (10, 20, 30, 40)], "+12255550100", t), "to this number", "the fifth call to one number is refused")
    refuses(lambda: check_call_limits([posted(m, f"+1225555{m:04d}") for m in range(1, 11)], "+12255550199", t), "10 of 10", "the eleventh call in 24 hours is refused")
    check_call_limits([posted(25 * 60 + m, f"+1225555{m:04d}") for m in range(1, 11)], "+12255550199", t)
    check(True, "calls older than 24 hours do not count")
    check_call_limits([{**posted(5), "status": "dry-run"}] * 20, "+12255550100", t)
    check(True, "dry runs never count against the caps")
    refuses(lambda: check_call_limits([], "+12065550100", t), "Washington", "a Washington area code is refused")
    refuses(lambda: check_call_limits([], "+13125550100", t), "Illinois", "an Illinois area code is refused")

    seen = {}

    class FakeResp:
        status = 202
        def __enter__(self): return self
        def __exit__(self, *a): return False

    def opener(req, timeout=0):
        seen.update(url=req.full_url, auth=req.get_header("Authorization"), body=json.loads(req.data), method=req.get_method())
        return FakeResp()
    check(post_job(j, "https://example.invalid/hook", auth_header="Key abc", opener=opener) == 202 and seen["auth"] == "Key abc"
          and seen["body"]["job_id"] == "j1" and seen["method"] == "POST", "the job is posted as JSON with the header from the env file")
    post_job(j, "https://example.invalid/hook", key="k1", opener=opener)
    check(seen["auth"] == "Bearer k1", "with only a key, it goes as a Bearer header")
    refuses(lambda: post_job(j, "", opener=opener), "PIPELINE_GROK_WEBHOOK_URL", "no webhook URL is refused with the line to add")
    refuses(lambda: post_job(j, "http://example.invalid/hook", opener=opener), "https", "a plain http webhook is refused")

    def boom(req, timeout=0):
        raise urllib.error.HTTPError(req.full_url, 401, "no", {}, None)
    refuses(lambda: post_job(j, "https://example.invalid/hook", key="secret-key", opener=boom), "HTTP 401", "a refused job says so")
    try:
        post_job(j, "https://example.invalid/hook", key="secret-key", opener=boom)
    except BridgeError as e:
        check("secret-key" not in str(e), "the key never shows in an error")

    tmp = Path(tempfile.mkdtemp())
    (tmp / "j1.json").write_text(json.dumps({"v": 1, "job_id": "j1", "status": "completed", "outcome": "answered", "summary": "Confirmed 2 pm.", "draft_text": None, "finished_at": "2026-11-10T14:06:00-06:00"}))
    (tmp / "j2.json").write_text(json.dumps({"v": 1, "job_id": "j2", "status": "draft_ready", "outcome": "draft_ready", "summary": "", "draft_text": "Hey Taylor, I hear you."}))
    (tmp / "junk.json").write_text("{not json")
    (tmp / "other.json").write_text(json.dumps({"job_id": "j9", "status": "sent_a_text"}))
    (tmp / "list.json").write_text("[1, 2]")
    got = read_results(tmp)
    check(set(got) == {"j1", "j2"} and got["j1"]["outcome"] == "answered" and got["j2"]["draft_text"].startswith("Hey Taylor"),
          "result files are read by job_id, anything else in the folder is skipped")
    check(read_results(tmp / "missing") == {}, "a missing result folder is just empty")
    check(card_expired({"job_type": "call", "status": "posted", "at": (t - timedelta(minutes=41)).isoformat()}, t)
          and not card_expired({"job_type": "call", "status": "posted", "at": (t - timedelta(minutes=20)).isoformat()}, t)
          and not card_expired({"job_type": "call", "status": "posted", "result": {"status": "completed"}, "at": (t - timedelta(hours=3)).isoformat()}, t),
          "a call with no result 40 minutes on reads as expired, one with a result does not")
    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run_tests() if "--test" in sys.argv else 0)
