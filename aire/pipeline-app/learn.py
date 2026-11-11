"""The learning loop for the likely-seller score and Call these 10. Everything stays in one folder on this Mac.

  ranked.jsonl    who was ranked or scored, once a week each, with the parts of their score (0 to 1 each)
  feedback.jsonl  Caleb's taps: Good call, Not useful
  outcomes.json   what happened next to each of them, with dates: texted, called, replied, appointment, listing, closed
  versions.json   every weekly version: its date, weights, how many outcomes it learned from and how it tested

Every Monday after 6 AM a small logistic regression (L2) is fitted to predict an appointment or a listing within 90
days. The weights start as the hand-set ones and move toward the learned ones only as outcomes pile up, at most
MAX_STEP points a week. A version that tests worse than the one before is not used. The inputs are the score's own
parts and nothing else: no name, no address, no family, age, race, religion or disability, and no stand-in for them.
No network, no paid service, nothing sent, no sheet written.
"""
from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timedelta
from pathlib import Path

import insight

FEATURES = {"seller": ["years", "equity", "life", "activity", "past", "anniversary"], "call10": ["money", "intent", "waiting", "cadence"]}
HAND = {"seller": {k: float(insight.SELLER_MAX[k]) for k in FEATURES["seller"]}, "call10": {k: float(insight.CALL_MAX[k]) for k in FEATURES["call10"]}}
WORDS = {"years": "Years owned", "equity": "Equity", "life": "A job move or estate in Notes", "activity": "Lead activity and expired listings", "past": "Past client",
         "anniversary": "Home anniversary", "money": "Money", "intent": "Intent", "waiting": "Waiting on your reply", "cadence": "Cadence"}
# A feature name that reads like a protected trait fails the check below and the tests.
BANNED = re.compile(r"race|ethnic|national|religio|church|famil|child|kid|baby|marri|divorc|pregnan|\bage\b|senior|elder|retir|disab|health|sex|gender", re.I)
assert not any(BANNED.search(f) for fs in FEATURES.values() for f in fs)

HORIZON = 90         # days: an appointment or a listing within this long counts as a yes
MIN_ROWS, MIN_YES = 40, 5   # outcomes needed before anything is fitted
FULL_TRUST = 400     # outcomes at which the learned weights are fully trusted
MAX_STEP = 5.0       # points a weight may move in one week
TOP = {"seller": 25, "call10": 10}


def _read(p: Path, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _lines(p: Path) -> list[dict]:
    try:
        return [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines() if x.strip()]
    except (OSError, ValueError):
        return []


def _write(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
    tmp.replace(p)


def _day(v) -> date | None:
    try:
        return date.fromisoformat(str(v or "")[:10])
    except ValueError:
        return None


def week_of(d: date) -> str:
    return (d - timedelta(days=d.weekday())).isoformat()


# ---------------- the logs ----------------

def log_ranked(folder: Path, today: date, call_rows: list[dict], seller_rows: list[dict]) -> int:
    """One line per person per list per week: their rank, score and parts. Returns how many lines were added."""
    path, wk = folder / "ranked.jsonl", week_of(today)
    have = {(r.get("week"), r.get("list"), r.get("person_id")) for r in _lines(path)}
    new = []
    for name, rows in (("call10", call_rows), ("seller", seller_rows)):
        for i, r in enumerate(rows or []):
            x = r.get("fractions") or {}
            if (wk, name, str(r.get("person_id"))) in have or not x:
                continue
            new.append({"day": today.isoformat(), "week": wk, "list": name, "person_id": str(r["person_id"]), "rank": i + 1, "top": i < TOP[name],
                        "score": r.get("score"), "x": {k: round(float(x.get(k, 0)), 4) for k in FEATURES[name]}})
    if new:
        folder.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write("".join(json.dumps(r) + "\n" for r in new))
    return len(new)


def add_feedback(folder: Path, which: str, person_id: str, verdict: str, at: datetime) -> dict:
    if which not in FEATURES or verdict not in ("good", "not_useful") or not str(person_id).strip():
        raise ValueError("feedback needs a list (seller or call10), a person and good or not_useful")
    row = {"at": at.isoformat(timespec="seconds"), "list": which, "person_id": str(person_id), "verdict": verdict}
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / "feedback.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")
    return row


MEETING = re.compile(r"\bappointment\b|\bappt\b|met with|listing (appointment|presentation)|\bconsult", re.I)
LISTED = re.compile(r"listing (agreement )?signed|signed (the )?listing|listed (it|the house|their home)", re.I)


def events(feed: dict, send_log: list[dict], bridge_log: list[dict], calendar: list[dict], ties: list[dict]) -> dict:
    """person_id -> {kind: sorted days} from the records: the send log (texted), the Grok call log (called), the feed's
    last text from them (replied), the calendar and Notes (appointment), Notes and the Deals sheet (listing, closed)."""
    f, out = feed or {}, {}
    add = lambda pid, kind, day: out.setdefault(str(pid), {}).setdefault(kind, set()).add(str(day)[:10]) if pid and _day(day) else None
    for s in send_log or []:
        if s.get("status") == "sent":
            add(s.get("person_id"), "texted", s.get("sent_at") or s.get("at"))
    for j in bridge_log or []:
        if j.get("job_type") == "call" and j.get("status") == "posted":
            add(j.get("person_id"), "called", j.get("at") or j.get("requested_at"))
    people = {str(p.get("person_id")): p for p in f.get("people") or []}
    for r in (f.get("touches_due") or []) + ((f.get("heat") or {}).get("hot") or []) + ((f.get("heat") or {}).get("warm") or []):
        add(r.get("person_id"), "replied", r.get("last_inbound"))
        people.setdefault(str(r.get("person_id")), r)
    for p in people.values():
        add(p.get("person_id"), "replied", p.get("last_inbound"))
    by_house: dict = {}
    for pid, p in people.items():
        street = p.get("street") or ((f.get("facts") or {}).get(pid) or {}).get("street")
        if insight._house(street):
            by_house.setdefault(insight._house(street), []).append((pid, street))
    for e in calendar or []:
        if e.get("kind") in ("showing", "listing", "client") and not e.get("invite"):
            title = str(e.get("title") or "")
            m = re.search(r"\b(\d{1,6})\s+[A-Za-z]", title)
            for pid, street in by_house.get(m.group(1), []) if m else []:
                if insight.same_home(title[m.start():], street):
                    add(pid, "appointment", e.get("day"))
    for pid, fx in (f.get("facts") or {}).items():
        for n in fx.get("notes") or []:
            if MEETING.search(str(n.get("note") or "")):
                add(pid, "appointment", n.get("at"))
            if LISTED.search(str(n.get("note") or "")):
                add(pid, "listing", n.get("at"))
    for t in ties or []:
        for p in t.get("people") or []:
            if str(t.get("side") or "").lower().startswith("list") and t.get("stage") in ("appointment", "contract", "closed"):
                add(p["person_id"], "listing", t.get("since"))
            if t.get("stage") == "closed":
                add(p["person_id"], "closed", t.get("act"))
    return {pid: {k: sorted(v) for k, v in kinds.items()} for pid, kinds in out.items()}


KINDS = ("texted", "called", "replied", "appointment", "listing", "closed")


def outcome(row: dict, ev: dict, today: date) -> dict:
    """What happened to one ranked person after the day they were ranked: the first date of each thing within 90 days,
    whether the answer is in yet, and "nothing" at 30, 60 and 90 days once that much time has passed."""
    d0 = _day(row["day"])
    end = d0 + timedelta(days=HORIZON)
    mine = ev.get(str(row["person_id"])) or {}
    first = {k: next((d for d in mine.get(k, []) if d0 < _day(d) <= min(end, today)), None) for k in KINDS}  # nothing dated after today: a booked appointment can still be canceled
    yes = bool(first["appointment"] or first["listing"])
    nothing = {}
    for n in (30, 60, 90):
        cut = d0 + timedelta(days=n)
        nothing[f"none_{n}"] = (not any(v and _day(v) <= cut for v in first.values())) if today >= cut else None
    return {**{k: row[k] for k in ("day", "list", "person_id", "rank", "top")}, **first, **nothing, "yes": yes,
            # an answer counts only once the full 90 days have passed, for a yes and a no alike, so the yeses are not counted early
            "resolved": today >= end}


def outcome_log(folder: Path, ev: dict, today: date) -> list[dict]:
    rows = [outcome(r, ev, today) for r in _lines(folder / "ranked.jsonl")]
    _write(folder / "outcomes.json", {"at": today.isoformat(), "rows": rows})
    return rows


