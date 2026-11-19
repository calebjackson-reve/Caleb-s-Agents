"""The weekly proof line: what Pipeline did last week, from records only.

Leads in, median time to the first reply, texts and calls sent, appointments on the calendar, deals that started from a
Pipeline lead or call, and the GCI tied to them. The week is Monday to Sunday, Central. A number with no record behind
it is None, which the screen prints as unknown. Nothing here sends or writes to a sheet.
"""
from __future__ import annotations

import statistics
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import cc

CENTRAL = ZoneInfo("America/Chicago")
APPT_KINDS = ("showing", "listing", "client")


def last_week(today: date) -> tuple[date, date]:
    """The last full Monday to Sunday before today."""
    mon = today - timedelta(days=today.weekday() + 7)
    return mon, mon + timedelta(days=6)


def _dt(v) -> datetime | None:
    try:
        t = datetime.fromisoformat(str(v))
    except (TypeError, ValueError):
        return None
    return t if t.tzinfo else t.replace(tzinfo=CENTRAL)


def _in(v, a: date, b: date) -> bool:
    d = str(v or "")[:10]
    return cc.is_day(d) and a.isoformat() <= d <= b.isoformat()


def past_appointments(log: list[dict], calendar: list[dict], today: date) -> list[dict]:
    """The calendar read only looks forward from today, so Pipeline keeps its own list of the appointments it has seen,
    one row each, on this Mac. Without it last week's appointments could not be counted."""
    have = {(r.get("day"), r.get("title")) for r in log or []}
    new = [{"day": e.get("day"), "kind": e.get("kind"), "title": e.get("title"), "seen": today.isoformat()} for e in calendar or []
           if e.get("kind") in APPT_KINDS and not e.get("invite") and cc.is_day(e.get("day")) and e["day"] <= today.isoformat() and (e.get("day"), e.get("title")) not in have]
    return ((log or []) + new)[-5000:]


def build(today: date, leads: list[dict], send_log: list[dict], bridge_log: list[dict], calendar: list[dict], ties: list[dict],
          appt_log: list[dict] | None = None) -> dict:
    """leads, calendar or ties passed as None means that read is missing, and every number that needs it is unknown."""
    a, b = last_week(today)
    no_leads, no_deals = leads is None, ties is None
    sent = [r for r in send_log or [] if r.get("status") == "sent"]
    week_leads = [r for r in leads or [] if _in(r.get("received"), a, b)]
    # first reply: the first real text or email to that person after their lead came in. Needs a clock time on the lead.
    waits = []
    for r in week_leads:
        pid, t0 = str((r.get("crm") or {}).get("person_id") or ""), _dt(r.get("received")) if len(str(r.get("received") or "")) > 10 else None
        if not pid or not t0:
            continue
        after = sorted(t for t in (_dt(s.get("sent_at") or s.get("at")) for s in sent if str(s.get("person_id")) == pid) if t and t >= t0)
        if after:
            waits.append((after[0] - t0).total_seconds() / 60)
    calls = [j for j in bridge_log or [] if j.get("job_type") == "call" and j.get("status") == "posted" and _in(j.get("at") or j.get("requested_at"), a, b)]
    seen = {(e.get("day"), e.get("title")): e for e in (appt_log or []) + [e for e in calendar or [] if e.get("kind") in APPT_KINDS and not e.get("invite")]}
    appts = [e for e in seen.values() if _in(e.get("day"), a, b)]
    # known only when Pipeline was already keeping appointments by that Monday, or the calendar read itself reaches back
    since = min([str(r.get("seen")) for r in appt_log or [] if r.get("seen")] + [str(e.get("day")) for e in calendar or [] if cc.is_day(e.get("day"))], default=None)
    appts_known = bool(appts) or (since is not None and since <= a.isoformat())
    # a deal started from Pipeline when its person got a real text, email or call from Pipeline, or came in as a lead
    # here, on or before the day the deal started. The start is the sheet's "stage since" date.
    reached: dict = {}
    for s in sent:
        if s.get("person_id"):
            d = str(s.get("at") or "")[:10]
            reached[str(s["person_id"])] = min(d, reached.get(str(s["person_id"]), d))
    for j in bridge_log or []:
        if j.get("job_type") == "call" and j.get("status") == "posted" and j.get("person_id"):
            d = str(j.get("at") or j.get("requested_at") or "")[:10]
            reached[str(j["person_id"])] = min(d, reached.get(str(j["person_id"]), d))
    for r in leads or []:
        pid = str((r.get("crm") or {}).get("person_id") or "")
        if pid and cc.is_day(str(r.get("received") or "")[:10]):
            reached[pid] = min(str(r["received"])[:10], reached.get(pid, "9"))
    started = [t for t in ties or [] if _in(t.get("since"), a, b) and any(reached.get(p["person_id"], "9") <= str(t["since"])[:10] for p in t["people"])]
    undated = sum(1 for t in ties or [] if t.get("stage") in ("contract", "offer", "appointment") and not cc.is_day(str(t.get("since") or "")[:10]))
    closed = [t for t in started if t.get("stage") == "closed"]
    return {
        "week": {"from": a.isoformat(), "to": b.isoformat()},
        "leads": {"value": None if no_leads else len(week_leads), "from": "lead emails and new CRM leads", "note": "The lead read has not run on this Mac." if no_leads else ""},
        "first_reply": {"value": round(statistics.median(waits)) if waits else None, "measured": len(waits), "of": len(week_leads),
                        "why": "" if waits else "the lead read has not run on this Mac" if no_leads else ("no leads came in that week" if not week_leads else "no lead that week has both a clock time and a reply sent from Pipeline"),
                        "from": "lead emails and the send log"},
        "texts": {"value": sum(1 for s in sent if s.get("kind") == "text" and _in(s.get("at"), a, b)), "from": "send log"},
        "emails": {"value": sum(1 for s in sent if s.get("kind") == "email" and _in(s.get("at"), a, b)), "from": "send log"},
        "calls": {"value": len(calls), "from": "Grok call log", "note": "Calls you dial yourself are not recorded anywhere Pipeline can read."},
        "appointments": {"value": len(appts) if appts_known else None, "from": "calendar",
                         "note": "Showings, listing appointments and client meetings on the calendar that week." if appts_known else
                         f"The calendar read only looks forward, and Pipeline started keeping past appointments on {since or 'no day yet'}, after that week began."},
        "deals": {"value": None if no_deals else len(started), "list": [t["deal"] for t in started], "from": "Deals sheet, send log and lead list",
                  "note": "The Deals sheet has not been read on this Mac." if no_deals else (f"{undated} open deal{'s have' if undated != 1 else ' has'} no start date on the sheet, so {'they' if undated != 1 else 'it'} cannot be counted." if undated else "")},
        # known only when the Deals sheet was read, every counted closing has its commission, and no open deal is undated
        "gci": {"value": None if no_deals or undated or any(t.get("commission") is None for t in closed) else sum(t["commission"] for t in closed),
                "pending": sum(t.get("commission") or 0 for t in started if t.get("stage") != "closed"),
                "blank": sum(1 for t in started if t.get("commission") is None), "from": "Deals sheet"},
    }


def keep(history: list[dict], row: dict) -> list[dict]:
    """One row a week, newest last, a year of them."""
    return sorted([r for r in history or [] if (r.get("week") or {}).get("from") != row["week"]["from"]] + [row], key=lambda r: r["week"]["from"])[-53:]
