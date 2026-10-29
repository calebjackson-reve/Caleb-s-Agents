#!/usr/bin/env python3
"""AIRE Pipeline: a local web app and installable PWA over the CRM engine's feed.json.

Standard library only. Run it with the system Python:

    python3 server.py                       # http://127.0.0.1:8787, localhost only
    python3 server.py --host 0.0.0.0 --token SECRET   # on Tailscale, token required in the URL

Reads (never writes): feed.json, aire/follow-up/out/text-queue.json and email-queue.json, predrafts.json.
Writes through the engine only: `crm.py touch` and `crm.py done`, both gated and audited by crm.py.
Nothing sends itself. A send is dry run unless the server was started with --live-send AND the request
carries approve=true from the confirm step in the app. Local outcomes (called, skipped, snoozed, sent
by hand) live in $AIRE_HOME/pipeline/state.json, never in git.

Paths (env first, then defaults):
  AIRE_HOME         ~/.aire
  AIRE_FEED         <repo>/aire/crm/feed.json
  AIRE_FOLLOWUP     <repo>/aire/follow-up      (the drafting library and its Gmail sign-in)
  AIRE_QUEUES       $AIRE_FOLLOWUP/out         (text-queue.json, email-queue.json)
  AIRE_PREDRAFTS    $AIRE_HOME/pipeline/predrafts.json
  AIRE_CRM_ENGINE   <repo>/aire/crm/crm.py
  AIRE_CRM_PYTHON   $AIRE_HOME/venv/bin/python, else this interpreter
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import pathlib
import secrets
import subprocess
import sys
import threading
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from zoneinfo import ZoneInfo

HERE = pathlib.Path(__file__).resolve().parent
REPO_AIRE = HERE.parent
STATIC = HERE / "static"
CENTRAL = ZoneInfo("America/Chicago")
FEED_MAX_AGE = 2 * 3600          # the LaunchAgent rebuilds every 15 minutes; 2 hours means it stopped
SNOOZE_DAYS = 3
UNDO_WINDOW = 10 * 60            # a local outcome can be undone for 10 minutes


def env_path(name: str, default: pathlib.Path) -> pathlib.Path:
    v = os.environ.get(name, "").strip()
    return pathlib.Path(v).expanduser() if v else default


AIRE_HOME = env_path("AIRE_HOME", pathlib.Path.home() / ".aire")
FEED = env_path("AIRE_FEED", REPO_AIRE / "crm" / "feed.json")
FOLLOWUP = env_path("AIRE_FOLLOWUP", REPO_AIRE / "follow-up")
QUEUES = env_path("AIRE_QUEUES", FOLLOWUP / "out")
PREDRAFTS = env_path("AIRE_PREDRAFTS", AIRE_HOME / "pipeline" / "predrafts.json")
ENGINE = env_path("AIRE_CRM_ENGINE", REPO_AIRE / "crm" / "crm.py")
_venv = AIRE_HOME / "venv" / "bin" / "python"
ENGINE_PY = os.environ.get("AIRE_CRM_PYTHON") or (str(_venv) if _venv.exists() else sys.executable)
STATE = env_path("AIRE_PIPELINE_STATE", AIRE_HOME / "pipeline" / "state.json")
SEND_LOG = STATE.with_name("send-log.jsonl")

LOCK = threading.Lock()


# ----------------------------------------------------------------------------- helpers

def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def parse_iso(value: str) -> dt.datetime | None:
    try:
        v = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return v if v.tzinfo else v.replace(tzinfo=dt.timezone.utc)
    except (ValueError, TypeError):
        return None


def central_today() -> dt.date:
    return dt.datetime.now(CENTRAL).date()


def read_json(path: pathlib.Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json_private(path: pathlib.Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    tmp.replace(path)


def fingerprint(subject: str, body: str) -> str:
    """Same shape as the old app: sha256(subject + newline + body)."""
    return hashlib.sha256((subject + "\n" + body).encode()).hexdigest()


def phone_digits(value: str) -> str:
    d = "".join(ch for ch in str(value or "") if ch.isdigit())
    return d[-10:] if len(d) >= 10 else d


# ----------------------------------------------------------------------------- local state

def load_state() -> dict:
    s = read_json(STATE, {})
    s.setdefault("outcomes", [])     # {id, person_id, kind, at, undone_at, revisit}
    s.setdefault("sends", [])        # {id, person_id, channel, fingerprint, at, status, template_id}
    return s


def save_state(s: dict) -> None:
    write_json_private(STATE, s)


def active_outcomes(state: dict, person_id: str) -> list[dict]:
    return [o for o in state["outcomes"] if o["person_id"] == person_id and not o.get("undone_at")]


def person_status(state: dict, person_id: str, today: dt.date) -> dict:
    """What this app did locally for a person: done today, snoozed until, skipped today."""
    out = {"done_today": False, "snoozed_until": "", "skipped_today": False, "last_kind": ""}
    for o in active_outcomes(state, person_id):
        day = (parse_iso(o["at"]) or now_utc()).astimezone(CENTRAL).date()
        if o["kind"] == "snooze" and o.get("revisit") and o["revisit"] > today.isoformat():
            out["snoozed_until"] = o["revisit"]
        elif o["kind"] == "skip" and day == today:
            out["skipped_today"] = True
        elif o["kind"] in ("called", "sent", "no_reply", "touched") and day == today:
            out["done_today"] = True
        out["last_kind"] = o["kind"]
    return out


def used_template_ids(state: dict) -> dict[str, set[str]]:
    used: dict[str, set[str]] = {}
    for s in state["sends"]:
        if s.get("template_id") and s.get("status") in ("sent", "handed_off", "live_sent"):
            used.setdefault(str(s["person_id"]), set()).add(s["template_id"])
    return used


# ----------------------------------------------------------------------------- feed assembly

def load_feed() -> tuple[dict | None, str]:
    """(feed, problem). problem is '' when the feed is usable."""
    if not FEED.exists():
        return None, f"No feed yet. Expected {FEED}. Run: python3 aire/crm/crm.py feed"
    feed = read_json(FEED, None)
    if not isinstance(feed, dict):
        return None, "feed.json is not valid JSON. The next refresh replaces it."
    if feed.get("header_ok") is False:
        cols = ", ".join(feed.get("missing_columns") or []) or "unknown columns"
        return None, f"The CRM sheet header lost a column this tool needs ({cols}). Nothing here can be trusted until it is restored."
    return feed, ""


def feed_age(feed: dict) -> dict:
    at = parse_iso(feed.get("generated_at", ""))
    seconds = int((now_utc() - at).total_seconds()) if at else None
    return {"generated_at": feed.get("generated_at", ""), "age_seconds": seconds,
            "stale": seconds is None or seconds > FEED_MAX_AGE}


def load_queues() -> dict:
    tq = read_json(QUEUES / "text-queue.json", {}) or {}
    eq = read_json(QUEUES / "email-queue.json", {}) or {}
    texts = {str(d.get("person_id")): d for d in tq.get("drafts", []) if d.get("person_id")}
    emails = {str(d.get("person_id")): d for d in eq.get("drafts", []) if d.get("person_id")}
    return {"texts": texts, "emails": emails,
            "text_generated_at": tq.get("generated_at", ""), "email_generated_at": eq.get("generated_at", "")}


def load_predrafts() -> dict:
    f = read_json(PREDRAFTS, {}) or {}
    at = parse_iso(f.get("generatedAt", ""))
    if not at or (now_utc() - at).total_seconds() > FEED_MAX_AGE:
        return {}
    return {str(k): v for k, v in (f.get("drafts") or {}).items() if isinstance(v, dict) and v.get("body")}


def draft_for(row: dict, predrafts: dict, queues: dict, used: dict[str, set[str]]) -> dict | None:
    """Best available pre-written draft. Your own edits live in the browser, so they always win there.
    Order: model reply from predraft (people who texted last), the check-in line from predraft, the follow-up queue line."""
    pid = str(row.get("person_id", ""))
    p = predrafts.get(pid)
    if p:
        tid = p.get("templateID") or ""
        if not tid or tid not in used.get(pid, set()):
            return {"body": p["body"], "subject": p.get("subject", ""), "channel": p.get("channel", "Text"),
                    "source": "model" if p.get("method") in ("local-model", "existing-invitation") else "template",
                    "template_id": tid, "drafted_at": p.get("draftedAt", "")}
    if row.get("owes_reply"):
        return None  # they texted last: no template, read what they said
    t = queues["texts"].get(pid)
    if t and t.get("text"):
        tid = f"{t.get('pool','')}:Text:{int(t.get('template', 0)) - 1}"
        if tid not in used.get(pid, set()):
            return {"body": t["text"], "subject": "", "channel": "Text", "source": "template", "template_id": tid,
                    "drafted_at": queues["text_generated_at"]}
    e = queues["emails"].get(pid)
    if e and e.get("body"):
        tid = f"{e.get('pool','')}:Email:{int(e.get('template', 0)) - 1}"
        if tid not in used.get(pid, set()):
            return {"body": e["body"], "subject": e.get("subject", ""), "channel": "Email", "source": "template",
                    "template_id": tid, "drafted_at": queues["email_generated_at"]}
    return None


def why_line(row: dict) -> str:
    quiet = row.get("days_quiet")
    band = row.get("band") or "band"
    if row.get("owes_reply"):
        when = row.get("last_inbound") or ""
        return f"Texted you last{' on ' + when if when else ''}. Reply to what they said."
    if quiet is None:
        return f"No touch on record. Due by the {band} cadence."
    return f"Quiet {quiet} days. Due by the {band} cadence."


def deal_close_line(day: str, today: dt.date) -> tuple[str, str]:
    """('Closes in 4 days', '' | 'warn' | 'overdue')."""
    if not day:
        return "Close date not set", "warn"
    try:
        d = dt.date.fromisoformat(day[:10])
    except ValueError:
        return f"Close date {day}", ""
    n = (d - today).days
    if n == 0:
        return "Closes today", "warn"
    if n > 0:
        return f"Closes in {n} day{'' if n == 1 else 's'}", "warn" if n <= 7 else ""
    return f"Close date {d.strftime('%b %-d')} has passed. Update it in the CRM.", "overdue"


def greeting(feed: dict, touches: list[dict], deals: list[dict], tasks: list[dict], today: dt.date) -> dict:
    """One plain sentence of what matters most right now, computed from the feed."""
    hour = dt.datetime.now(CENTRAL).hour
    hello = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"
    owes = [t for t in touches if t["owes_reply"] and not t["local"]["done_today"]]
    moved = [d for d in deals if d["moved_today"]]
    overdue_tasks = [t for t in tasks if t.get("overdue")]
    hot = [t for t in touches if (t.get("band") == "hot") and not t["owes_reply"] and isinstance(t.get("days_quiet"), int)]
    hot.sort(key=lambda t: -t["days_quiet"])
    closing = sorted([d for d in deals if d["close_state"] in ("warn", "overdue") and d.get("expected_close")],
                     key=lambda d: d["expected_close"])
    if owes:
        n = len(owes)
        line = f"{n} {'person is' if n == 1 else 'people are'} waiting on a reply. {owes[0]['display']} is first."
    elif moved:
        line = f"{moved[0]['address']} moved today: {moved[0]['last_event']}."
    elif closing and closing[0]["close_state"] == "overdue":
        line = f"{closing[0]['address']} shows a close date that has passed. Fix it in the CRM."
    elif overdue_tasks:
        line = f"{len(overdue_tasks)} task{'s are' if len(overdue_tasks) != 1 else ' is'} overdue. First: {overdue_tasks[0]['task']}."
    elif hot:
        line = f"{hot[0]['display']} is your most overdue hot contact, quiet {hot[0]['days_quiet']} days."
    elif closing:
        line = f"{closing[0]['address']} {closing[0]['close_line'].lower()}."
    else:
        line = "Nothing is on fire. Work the list from the top."
    return {"hello": f"{hello}, Caleb.", "date": dt.datetime.now(CENTRAL).strftime("%A, %B %-d"), "line": line}


def assemble() -> dict:
    feed, problem = load_feed()
    if problem:
        return {"ok": False, "error": problem, "feed_path": str(FEED)}
    today = central_today()
    state = load_state()
    queues = load_queues()
    predrafts = load_predrafts()
    used = used_template_ids(state)
    touches = []
    for r in feed.get("touches_due", []) or []:
        pid = str(r.get("person_id", ""))
        if not pid:
            continue
        local = person_status(state, pid, today)
        touches.append({
            "person_id": pid, "display": r.get("display") or r.get("phone") or r.get("email") or f"ID {pid}",
            "band": (r.get("band") or "").lower(), "phone": r.get("phone", ""), "email": r.get("email", ""),
            "days_quiet": r.get("days_quiet"), "owes_reply": bool(r.get("owes_reply")),
            "last_messages": [str(m) for m in (r.get("last_messages") or [])][-3:],
            "last_inbound": r.get("last_inbound", ""), "last_outbound": r.get("last_outbound", ""),
            "last_touch": r.get("last_touch", ""), "next_action": r.get("next_action", ""),
            "stage": r.get("stage", ""), "type": r.get("type", ""), "signal_score": r.get("signal_score", 0),
            "why": why_line(r), "draft": draft_for(r, predrafts, queues, used), "local": local,
        })
    # Owes a reply first (newest text first), then the engine's own order. Done, skipped and snoozed drop to the back.
    touches.sort(key=lambda t: (
        t["local"]["done_today"] or t["local"]["skipped_today"] or bool(t["local"]["snoozed_until"]),
        not t["owes_reply"], (t["last_inbound"] and "~" + t["last_inbound"]) if t["owes_reply"] else "",
    ))
    # Keep the engine's order inside the groups (stable sort), but owes-reply by newest inbound.
    owes = [t for t in touches if t["owes_reply"] and not (t["local"]["done_today"] or t["local"]["skipped_today"] or t["local"]["snoozed_until"])]
    owes.sort(key=lambda t: t["last_inbound"] or "", reverse=True)
    rest = [t for t in touches if t not in owes]
    touches = owes + rest

    deals = []
    for d in feed.get("deals", []) or []:
        line, st = deal_close_line(d.get("expected_close", ""), today)
        ev_at = parse_iso(d.get("last_event_at", ""))
        deals.append({**{k: d.get(k, "") for k in ("deal_id", "person_id", "display", "address", "side", "stage",
                                                     "price", "expected_close", "next_step", "last_event",
                                                     "last_event_at", "source", "updated_at", "commission")},
                      "close_line": line, "close_state": st,
                      "moved_today": bool(ev_at and ev_at.astimezone(CENTRAL).date() == today)})
    deals.sort(key=lambda d: (d["close_state"] != "overdue", d.get("expected_close") or "9999"))

    done_ids = {o["ref"] for o in state["outcomes"] if o["kind"] == "task_done" and not o.get("undone_at") and o.get("ref")}
    tasks = [t for t in (feed.get("tasks", []) or []) if (t.get("task_id") or t.get("task")) not in done_ids]
    tasks.sort(key=lambda t: (not t.get("overdue"), t.get("due") or "9999"))

    leads = feed.get("new_leads", []) or []
    counts = dict(feed.get("counts", {}) or {})
    counts["owes_reply"] = sum(1 for t in touches if t["owes_reply"])
    counts["done_today"] = len({o["person_id"] for o in state["outcomes"] if not o.get("undone_at")
                                and o["kind"] in ("called", "sent", "no_reply", "touched", "task_done")
                                and (parse_iso(o["at"]) or now_utc()).astimezone(CENTRAL).date() == today})
    counts["new_leads"] = len(leads)
    counts["deals_moved_today"] = sum(1 for d in deals if d["moved_today"])
    return {
        "ok": True, "feed": feed_age(feed), "as_of": feed.get("as_of", ""), "today": today.isoformat(),
        "greeting": greeting(feed, touches, deals, tasks, today),
        "counts": counts, "cadence_days": feed.get("cadence_days", {}),
        "signals": feed.get("signals", {}), "touches": touches, "tasks": tasks, "deals": deals, "new_leads": leads,
        "queues": {"texts": len(queues["texts"]), "emails": len(queues["emails"]),
                   "text_generated_at": queues["text_generated_at"], "email_generated_at": queues["email_generated_at"]},
        "predrafts": len(predrafts),
        "recent_outcomes": [o for o in state["outcomes"] if not o.get("undone_at")][-30:][::-1],
        "send_log": state["sends"][-50:][::-1],
        "live_send": SETTINGS["live_send"], "engine": {"path": str(ENGINE), "python": ENGINE_PY, "exists": ENGINE.exists()},
    }


# ----------------------------------------------------------------------------- engine writes

def engine_write(args: list[str], client_tag: str = "pipeline") -> dict:
    """One gated, audited crm.py write. The engine answers with one JSON object. Never retried."""
    if SETTINGS["fake_engine"]:
        return {"ok": True, "result": {"fake": True, "args": args}}
    if not ENGINE.exists():
        return {"ok": False, "error": f"crm.py not found at {ENGINE}. Set AIRE_CRM_ENGINE."}
    base = [ENGINE_PY, str(ENGINE), "--json"]
    cmd = base + ["--client", client_tag] + args
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120, cwd=str(ENGINE.parent))
        if proc.returncode == 2 and "--client" in (proc.stderr or ""):
            # Older engine without the --client tag (main branch). Same gates, same audit.
            proc = subprocess.run(base + args, capture_output=True, text=True, timeout=120, cwd=str(ENGINE.parent))
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CRM engine timed out. Not confirmed. Check the CRM before trying again."}
    try:
        reply = json.loads((proc.stdout or "").strip().splitlines()[-1])
    except (ValueError, IndexError):
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-1:] or ["no output"]
        return {"ok": False, "error": "CRM engine gave no answer. Nothing confirmed. " + tail[0][:160]}
    if not isinstance(reply, dict):
        return {"ok": False, "error": "CRM engine reply was not an object. Nothing confirmed."}
    if reply.get("ok") and proc.returncode != 0:
        return {"ok": False, "error": "CRM engine reply was inconsistent. Not confirmed. Check the CRM."}
    return reply


def record_outcome(state: dict, person_id: str, kind: str, note: str = "", ref: str = "", revisit: str = "") -> dict:
    o = {"id": secrets.token_hex(6), "person_id": str(person_id), "kind": kind, "note": note[:200], "ref": ref,
         "at": now_utc().isoformat(timespec="seconds"), "revisit": revisit, "undone_at": ""}
    state["outcomes"].append(o)
    state["outcomes"] = state["outcomes"][-2000:]
    return o


def undo_outcome(state: dict, outcome_id: str) -> dict | None:
    for o in state["outcomes"]:
        if o["id"] == outcome_id and not o.get("undone_at"):
            if (now_utc() - (parse_iso(o["at"]) or now_utc())).total_seconds() > UNDO_WINDOW:
                return None
            o["undone_at"] = now_utc().isoformat(timespec="seconds")
            return o
    return None


def api_touch(body: dict) -> dict:
    """'Touched' on a person: crm.py touch <person_id> "<what happened>". Gated and audited by the engine."""
    pid = str(body.get("person_id", "")).strip()
    what = str(body.get("what", "")).strip() or "Touched from Pipeline"
    kind = str(body.get("kind", "touched"))
    if not pid.isdigit():
        return {"ok": False, "error": "Contacts are changed by person_id only."}
    reply = engine_write(["touch", pid, what])
    if not reply.get("ok"):
        return {"ok": False, "error": reply.get("error") or "CRM engine refused. Nothing written."}
    with LOCK:
        state = load_state()
        o = record_outcome(state, pid, kind if kind in ("called", "sent", "touched") else "touched", what)
        save_state(state)
    return {"ok": True, "outcome": o, "result": reply.get("result")}


def api_done(body: dict) -> dict:
    """'Done' on a task with a task_id: crm.py done <task_id>. Next_Action items have no id yet (run crm.py sync-tasks)."""
    tid = str(body.get("task_id", "")).strip()
    if not tid:
        return {"ok": False, "error": "This item has no task_id yet. Run crm.py sync-tasks, then mark it done."}
    reply = engine_write(["done", tid])
    if not reply.get("ok"):
        return {"ok": False, "error": reply.get("error") or "CRM engine refused. Nothing written."}
    if reply.get("result") is False:
        return {"ok": False, "error": "The engine found no open task with that id. Refresh the feed."}
    with LOCK:
        state = load_state()
        o = record_outcome(state, str(body.get("person_id", "")), "task_done", str(body.get("task", ""))[:120], ref=tid)
        save_state(state)
    return {"ok": True, "outcome": o}


def api_outcome(body: dict) -> dict:
    """Local only: skip today, snooze 3 days, no reply needed, undo. Writes nothing to the CRM."""
    kind = str(body.get("kind", ""))
    pid = str(body.get("person_id", ""))
    with LOCK:
        state = load_state()
        if kind == "undo":
            o = undo_outcome(state, str(body.get("outcome_id", "")))
            save_state(state)
            return {"ok": bool(o), "error": "" if o else "Nothing to undo. The 10 minute window has passed."}
        if kind not in ("skip", "snooze", "no_reply"):
            return {"ok": False, "error": "Unknown local outcome."}
        revisit = (central_today() + dt.timedelta(days=SNOOZE_DAYS)).isoformat() if kind == "snooze" else ""
        o = record_outcome(state, pid, kind, revisit=revisit)
        save_state(state)
    return {"ok": True, "outcome": o}


def api_send(body: dict) -> dict:
    """Pipeline is the one sender, and sending stays behind an explicit approve. Dry run by default.

    Dry run: the exact message is logged as 'would send' and nothing leaves the Mac.
    Live: only when the server runs with --live-send and this request carries approve=true. Text goes to
    Messages (macOS, AppleScript, phone and body passed as arguments, never evaluated). Email goes through
    engine/send.py with the follow-up tool's Gmail sign-in. A confirmed send then logs crm.py touch.
    """
    pid = str(body.get("person_id", "")).strip()
    channel = "Email" if body.get("channel") == "Email" else "Text"
    to = str(body.get("to", "")).strip()
    text = str(body.get("body", "")).strip()
    subject = str(body.get("subject", "")).strip() if channel == "Email" else ""
    approve = body.get("approve") is True
    template_id = str(body.get("template_id", "") or "")
    if not pid.isdigit():
        return {"ok": False, "error": "Contacts are changed by person_id only."}
    if not to or not text:
        return {"ok": False, "error": "Nothing to send: recipient or message is empty."}
    if channel == "Email" and "@" not in to:
        return {"ok": False, "error": "That is not an email address."}
    if channel == "Text" and len(phone_digits(to)) != 10:
        return {"ok": False, "error": "That is not a 10 digit US phone number."}
    fp = fingerprint(subject, text)
    with LOCK:
        state = load_state()
        dup = [s for s in state["sends"] if s["person_id"] == pid and s["fingerprint"] == fp
               and s["status"] in ("live_sent", "handed_off", "sent")]
        if dup:
            return {"ok": False, "error": "This exact message was already sent to this person. Edit it before sending again."}
        entry = {"id": secrets.token_hex(6), "person_id": pid, "channel": channel, "to": to, "fingerprint": fp,
                 "template_id": template_id, "at": now_utc().isoformat(timespec="seconds"), "status": "dry_run",
                 "chars": len(text), "detail": ""}
        live = SETTINGS["live_send"] and approve
        if not live:
            entry["detail"] = "Dry run. Nothing left this Mac." if not approve else "Approved, but the server is not in --live-send. Nothing left this Mac."
            state["sends"].append(entry)
            save_state(state)
            append_send_log(entry)
            return {"ok": True, "dry_run": True, "send": entry}
        # Live. Serialized by the lock so one approve is one send.
        result = live_send(channel, to, subject, text)
        entry["status"] = "live_sent" if result.get("ok") else "failed"
        entry["detail"] = result.get("detail", "")
        state["sends"].append(entry)
        save_state(state)
        append_send_log(entry)
    touch = None
    if result.get("ok"):
        what = f"{'Email' if channel == 'Email' else 'Text'} sent from Pipeline" + (f": {subject}" if subject else "")
        touch = api_touch({"person_id": pid, "what": what, "kind": "sent"})
    return {"ok": bool(result.get("ok")), "dry_run": False, "send": entry, "touch": touch,
            "error": "" if result.get("ok") else result.get("detail", "Send failed.")}


def api_mark_sent(body: dict) -> dict:
    """Caleb sent it himself from Messages, Mail or the phone. Records the send locally and logs the touch."""
    pid = str(body.get("person_id", "")).strip()
    channel = "Email" if body.get("channel") == "Email" else "Text"
    text = str(body.get("body", "")).strip()
    subject = str(body.get("subject", "")).strip() if channel == "Email" else ""
    with LOCK:
        state = load_state()
        entry = {"id": secrets.token_hex(6), "person_id": pid, "channel": channel, "to": str(body.get("to", "")),
                 "fingerprint": fingerprint(subject, text), "template_id": str(body.get("template_id", "") or ""),
                 "at": now_utc().isoformat(timespec="seconds"), "status": "handed_off",
                 "chars": len(text), "detail": "Sent by Caleb from the device's own app."}
        state["sends"].append(entry)
        save_state(state)
        append_send_log(entry)
    what = f"{'Email' if channel == 'Email' else 'Text'} sent from Pipeline (by hand)"
    return api_touch({"person_id": pid, "what": what, "kind": "sent"})


def append_send_log(entry: dict) -> None:
    SEND_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(SEND_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps({k: v for k, v in entry.items() if k != "to"}) + "\n")  # no recipient in the log


def live_send(channel: str, to: str, subject: str, text: str) -> dict:
    sender = HERE / "engine" / "send.py"
    cmd = [ENGINE_PY, str(sender), channel.lower(), "--to", to, "--body", text, "--live"] + (["--subject", subject] if subject else [])
    env = dict(os.environ, AIRE_FOLLOWUP=str(FOLLOWUP))
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120, env=env)
        reply = json.loads((proc.stdout or "").strip().splitlines()[-1])
        return reply if isinstance(reply, dict) else {"ok": False, "detail": "sender gave no answer"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "detail": "Sender timed out. Not confirmed. Check Messages or Sent mail before trying again."}
    except (ValueError, IndexError):
        return {"ok": False, "detail": "Sender gave no answer. Not confirmed."}


# ----------------------------------------------------------------------------- http

SETTINGS = {"token": "", "live_send": False, "fake_engine": False}
MIME = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
        ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2"}
ROUTES = {"/api/touch": api_touch, "/api/done": api_done, "/api/outcome": api_outcome,
          "/api/send": api_send, "/api/mark-sent": api_mark_sent}


class Handler(BaseHTTPRequestHandler):
    server_version = "AIREPipeline/1.0"

    def log_message(self, fmt, *args):  # quiet, and never log query strings (they may carry the token)
        if SETTINGS.get("verbose"):
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _authorized(self) -> bool:
        if not SETTINGS["token"]:
            return True
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        given = (q.get("token") or [""])[0] or self.headers.get("X-Pipeline-Token", "")
        cookie = self.headers.get("Cookie", "")
        for part in cookie.split(";"):
            k, _, v = part.strip().partition("=")
            if k == "pipeline_token":
                given = given or v
        return hmac.compare_digest(given, SETTINGS["token"])

    def _send(self, status: int, body: bytes, ctype: str, extra: dict | None = None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, data: dict, extra: dict | None = None):
        self._send(status, json.dumps(data, ensure_ascii=False).encode(), MIME[".json"], extra)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if not self._authorized():
            if path.startswith("/api/"):
                return self._json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Token required. Open the link with ?token=... once."})
            return self._send(HTTPStatus.UNAUTHORIZED, b"Token required. Open the link with ?token=... once.", "text/plain; charset=utf-8")
        extra = {}
        if SETTINGS["token"] and "token=" in urllib.parse.urlparse(self.path).query:
            extra["Set-Cookie"] = f"pipeline_token={SETTINGS['token']}; Path=/; HttpOnly; SameSite=Strict"
        if path == "/api/feed":
            return self._json(HTTPStatus.OK, assemble(), extra)
        if path == "/api/health":
            return self._json(HTTPStatus.OK, {"ok": True, "feed": str(FEED), "feed_exists": FEED.exists(),
                                              "engine": str(ENGINE), "live_send": SETTINGS["live_send"]}, extra)
        if path == "/":
            path = "/index.html"
        f = (STATIC / path.lstrip("/")).resolve()
        if STATIC.resolve() not in f.parents or not f.is_file():
            return self._send(HTTPStatus.NOT_FOUND, b"not found", "text/plain; charset=utf-8")
        ctype = MIME.get(f.suffix, "application/octet-stream")
        if f.name == "sw.js":
            extra["Service-Worker-Allowed"] = "/"
        return self._send(HTTPStatus.OK, f.read_bytes(), ctype, extra)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if not self._authorized():
            return self._json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Token required."})
        # Same-origin only: a page on another site cannot drive the engine through the browser.
        origin = self.headers.get("Origin", "")
        host = self.headers.get("Host", "")
        if origin and urllib.parse.urlparse(origin).netloc != host:
            return self._json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Cross-origin request refused."})
        handler = ROUTES.get(path)
        if not handler:
            return self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Unknown action."})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError
        except (ValueError, TypeError):
            return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Bad request body."})
        try:
            result = handler(body)
        except Exception as e:  # never let a traceback (which could carry names) reach the browser
            result = {"ok": False, "error": f"{type(e).__name__}: the action did not complete. Nothing confirmed."}
        return self._json(HTTPStatus.OK if result.get("ok") else HTTPStatus.UNPROCESSABLE_ENTITY, result)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1", help="127.0.0.1 (default). Anything else requires --token.")
    ap.add_argument("--port", type=int, default=int(os.environ.get("AIRE_PIPELINE_PORT", "8787")))
    ap.add_argument("--token", default=os.environ.get("AIRE_PIPELINE_TOKEN", ""), help="required in the URL when not on localhost")
    ap.add_argument("--live-send", action="store_true", help="allow approved sends to leave the Mac. Default: dry run.")
    ap.add_argument("--fake-engine", action="store_true", help="tests only: pretend every crm.py write succeeded")
    ap.add_argument("--verbose", action="store_true")
    a = ap.parse_args(argv)
    if a.host not in ("127.0.0.1", "localhost", "::1") and not a.token:
        ap.error("--token is required when the server is not on localhost (for example on Tailscale).")
    SETTINGS.update(token=a.token, live_send=a.live_send, fake_engine=a.fake_engine, verbose=a.verbose)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    where = f"http://{a.host}:{a.port}/" + (f"?token={a.token}" if a.token else "")
    print(f"AIRE Pipeline on {where}\n  feed {FEED}\n  engine {ENGINE} via {ENGINE_PY}\n  send mode: {'LIVE after approve' if a.live_send else 'dry run'}", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
