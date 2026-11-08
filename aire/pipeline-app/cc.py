"""Command Center numbers for Pipeline: commission, deadlines, calendar, leads, scorecard.

Every number is a pure function of a cached read in out/cc/ (git-ignored). The sync on the Mac
(cc_sync.py) writes those files from the AIRE Deals sheet, Google Calendar and Gmail; nothing here
calls a network. Each file is {"at": ISO time, "source": what it read, "rows": [...], "error": str|None}.
Rules match the Claude page Command Center so the two agree on every number.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

CENTRAL = ZoneInfo("America/Chicago")
SPLIT_CO = 0.30  # KW 70/30: the company's share of each commission, counted toward cap.

# How old a read may be before the screen calls it stale, in hours.
STALE_HOURS = {"deals": 6, "calendar": 2, "inbox": 1, "leads": 1, "commission_mail": 24, "bank_mail": 6, "history": 36,
               "news": 6, "market": 36, "life": 2, "workouts": 2}
# Minutes between reads, the same as cc_sync.READS (cc_test checks they agree). A read is late (amber) once it is past
# its next read plus GRACE_MIN (the sync wakes every 5 minutes, so up to two missed wakes are normal), and stale (red) at three missed reads or STALE_HOURS.
PACE_MIN = {"calendar": 15, "inbox": 10, "leads": 10, "deals": 30, "commission_mail": 120, "bank_mail": 60, "news": 120,
            "market": 720, "life": 15, "workouts": 15}
GRACE_MIN = 15
DATASETS = ["deals", "calendar", "inbox", "leads", "commission_mail", "bank_mail", "goals", "history", "news", "market",
            "life", "workouts", "config", "sync-status", "outbox"]


def central_today(now: datetime | None = None) -> date:
    return (now or datetime.now(CENTRAL)).astimezone(CENTRAL).date()


def is_day(t) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(t or "")))


def num(v):
    t = re.sub(r"[$,\s]", "", str(v if v is not None else ""))
    try:
        return float(t) if t else None
    except ValueError:
        return None


# ---------------- Reading the cache ----------------

def plain_error(e) -> str | None:
    """A read error in plain words for the screen. Never an exception name, status code or file."""
    t = str(e or "")
    if not t:
        return None
    if re.search(r"invalid_grant|expired|revoked|unauthori[sz]ed|\b401\b|credentials|sign.?in|token", t, re.I):
        return "Google sign-in expired or was turned off, so sign in again"
    if re.search(r"quota|rate.?limit|\b429\b", t, re.I):
        return "Google limited how often this can be read, it tries again on the next pass"
    if re.search(r"\b403\b|forbidden|permission|not have access", t, re.I):
        return "access to this source was refused"
    if re.search(r"\b404\b|not found|no such", t, re.I):
        return "the sheet, tab or file was not found"
    if re.search(r"timed? ?out|timeout", t, re.I):
        return "the source took too long to answer"
    if re.search(r"reset|refused|unreachable|name or service|nodename|urlerror|connection", t, re.I):
        return "the source could not be reached"
    return "the read did not finish"


def freshness(meta: dict, name: str, now: datetime) -> dict:
    """ok, late (amber: past its refresh time), stale (red: three reads missed or past STALE_HOURS), failed (red) or
    missing, with the as-of time. A failed read keeps its last good rows and is never ok."""
    if not meta:
        return {"state": "missing", "at": None, "age_min": None, "source": None, "error": None}
    at = meta.get("at")
    age = None
    if at:
        try:
            age = int((now - datetime.fromisoformat(at)).total_seconds() // 60)
        except ValueError:
            age = None
    limit = STALE_HOURS.get(name)
    pace = PACE_MIN.get(name)
    red = min(x for x in (limit * 60 if limit is not None else None, 3 * pace + GRACE_MIN if pace else None, 10 ** 9) if x is not None)
    state = "ok"
    if meta.get("error"):
        state = "failed"
    elif age is None:
        state = "missing"
    elif age > red:
        state = "stale"
    elif pace and age > pace + GRACE_MIN:
        state = "late"
    return {"state": state, "at": at, "age_min": age, "source": meta.get("source"), "error": meta.get("error"),
            "error_text": plain_error(meta.get("error")),
            "pace_min": pace, "late_after": pace + GRACE_MIN if pace else None}


def load(folder: Path) -> dict:
    out = {}
    for name in DATASETS:
        p = folder / f"{name}.json"
        try:
            out[name] = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            out[name] = None
    return out


# ---------------- Deals sheet ----------------

def deal_rows(values: list[list]) -> list[dict]:
    """The AIRE Deals sheet as rows. Headers are matched by name, so column order can change."""
    if not values:
        return []
    head = [str(h).strip().lower() for h in values[0]]

    def col(*names):
        for n in names:
            if n in head:
                return head.index(n)
        return -1

    appr = next((i for i, h in enumerate(head) if h.startswith("appraisal")), -1)
    c = {"deal": col("deal"), "side": col("side"), "status": col("status"), "price": col("price"),
         "commission": col("commission"), "inspection": col("inspection"), "act": col("act of sale"),
         "check": col("check"), "source": col("source"),
         "since": col("stage since", "status since", "status date", "in stage since"), "appraisal": appr}

    def cell(r, k):
        i = c[k]
        return r[i] if 0 <= i < len(r) else None

    def txt(v):
        t = str(v if v is not None else "").strip()
        return t or None

    rows = []
    for r in values[1:]:
        d = {k: txt(cell(r, k)) for k in c}
        if not d["deal"]:
            continue
        d["status"] = d["status"] or "Not set"
        d["price"], d["commission"] = num(cell(r, "price")), num(cell(r, "commission"))
        rows.append(d)
    return rows


def stage_of(status) -> str:
    s = str(status or "").lower()
    if re.search(r"fell|cancel|expired|withdrawn|dead", s):
        return "out"
    if re.search(r"under contract|pending", s):
        return "contract"
    if re.search(r"closed|sold", s):
        return "closed"
    if "offer" in s:
        return "offer"
    if re.search(r"active|listing|appointment|appt", s):
        return "appointment"
    return "other"


STAGES = [("lead", "Lead"), ("appointment", "Active listing"), ("offer", "Offer"),
          ("contract", "Under contract"), ("closed", "Closed")]


def next_step(t) -> str:
    """The sentence in the Check note that asks for something, kept short."""
    parts = [x.strip().rstrip(".") for x in re.split(r"\.\s+", str(t or "")) if x.strip()]
    if not parts:
        return ""
    pick = (next((x for x in parts if re.search(r"waiting|still|needed|no answer|\bmark\b|open until|expired|follow up", x, re.I)), None)
            or next((x for x in parts if re.search(r"\bdue\b|has no|missing|blank|not written|\bneeds?\b", x, re.I)), None)
            or parts[0])
    if len(pick) > 110:
        pick = pick[: pick.rfind(" ", 0, 107)] + "…"
    return pick


def pending_commission(deals: list[dict]) -> dict:
    uc = [r for r in deals if stage_of(r["status"]) == "contract"]
    return {"value": sum(r["commission"] or 0 for r in uc), "deals": len(uc),
            "blank": sum(1 for r in uc if r["commission"] is None)}


def pipeline_stages(deals: list[dict], leads_waiting: int) -> list[dict]:
    rows = [{"stage": "lead", "label": "Lead", "n": leads_waiting, "volume": None, "commission": None, "blank": 0}]
    for k, label in STAGES[1:] + [("out", "Fell through"), ("other", "No status")]:
        d = [r for r in deals if stage_of(r["status"]) == k]
        rows.append({"stage": k, "label": label, "n": len(d), "volume": sum(r["price"] or 0 for r in d),
                     "commission": sum(r["commission"] or 0 for r in d),
                     "blank": sum(1 for r in d if r["commission"] is None)})
    return rows


def deal_cards(deals: list[dict], today: date) -> list[dict]:
    order = {"contract": 0, "offer": 1, "appointment": 2, "other": 3, "closed": 4, "out": 5}
    out = []
    for r in deals:
        st = stage_of(r["status"])
        days = None
        if is_day(r.get("since")) and r["since"] <= today.isoformat():
            days = (today - date.fromisoformat(r["since"])).days
        out.append({**r, "stage": st, "next": next_step(r.get("check")), "days": days,
                    "checklist": checklist(r, today) if st == "contract" else [],
                    "to_close": (date.fromisoformat(r["act"]) - today).days if is_day(r.get("act")) else None})
    return sorted(out, key=lambda r: (order[r["stage"]], r.get("act") or "9"))


def checklist(r: dict, today: date) -> list[dict]:
    """A deal under contract, step by step from the sheet: done (date passed), upcoming (date ahead, with days),
    or missing (no date on the sheet). A step whose cell is not a date but says done or cleared counts as done."""
    out = []
    for key, label in (("inspection", "Inspection"), ("appraisal", "Appraisal and loan"), ("act", "Act of sale")):
        v = str(r.get(key) or "").strip()
        if is_day(v):
            n = (date.fromisoformat(v) - today).days
            out.append({"step": label, "date": v, "days": n, "state": "done" if n < 0 else "today" if n == 0 else "upcoming"})
        elif re.search(r"\b(done|clear(ed)?|complete[d]?|waived|approved|ok)\b", v, re.I):
            out.append({"step": label, "date": None, "days": None, "state": "done", "note": v[:60]})
        else:
            out.append({"step": label, "date": None, "days": None, "state": "missing", "note": v[:60]})
    return out


# ---------------- Calendar ----------------
# The coordinator's email domain (deadline events she files) lives in out/cc/config.json, never here.

def _creator_is_coordinator(creator: str, coord: list[str]) -> bool:
    c = (creator or "").lower()
    return any(c.endswith(d.lower()) for d in coord if d)


def cal_kind(ev: dict, coord: list[str]) -> str:
    t = ev.get("title") or ""
    if re.search(r"act of sale|\bclosing\b|close of escrow", t, re.I):
        return "closing"
    if re.search(r"deadline", t, re.I) or _creator_is_coordinator(ev.get("creator"), coord):
        return "deadline"
    if re.search(r"inspect|apprais|walk.?through|\bsurvey\b", t, re.I):
        return "inspection"
    if re.search(r"showing|\btour\b|open house", t, re.I):
        return "showing"
    if re.search(r"listing (appt|appointment|presentation|consult|meeting)|^listing\b|\bcma\b", t, re.I):
        return "listing"
    if ev.get("eventType") == "FOCUS_TIME" or re.search(r"^sales block|lead gen|follow.?up|prospect", t, re.I):
        return "block"
    if ev.get("free") or ev.get("eventType") in ("OUT_OF_OFFICE", "FROM_GMAIL") or \
            re.search(r"personal|gym|doctor|dentist|vacation|family|\bpto\b", t, re.I):
        return "personal"
    if re.search(r"\bcall\b|meeting|consult|coffee|lunch|\bmeet\b|zoom|client|buyer|seller", t, re.I):
        return "client"
    return "other"


def cal_events(events: list[dict], coord: list[str]) -> list[dict]:
    out = []
    for e in events:
        if re.match(r"working hours", e.get("title") or "", re.I):
            continue
        out.append({**e, "kind": cal_kind(e, coord), "day": (e.get("start") or "")[:10]})
    return sorted(out, key=lambda r: (r["day"], not r.get("allDay"), r.get("start") or ""))


def _hours(e: dict) -> float:
    try:
        return (datetime.fromisoformat(e["end"]) - datetime.fromisoformat(e["start"])).total_seconds() / 3600
    except (KeyError, ValueError):
        return 0.0


def booked(r: dict) -> bool:
    """Booked time: timed, not free, not a work block or personal time, and not someone else's invite Caleb has not
    accepted."""
    return not r.get("allDay") and not r.get("free") and r["kind"] not in ("block", "personal") and not r.get("invite")


def week_load(evs: list[dict], today: date) -> list[dict]:
    """Booked hours, today plus 6 (see booked)."""
    busy = [r for r in evs if booked(r)]
    out = []
    for n in range(7):
        k = (today + timedelta(days=n)).isoformat()
        ev = [r for r in busy if r["day"] == k]
        out.append({"day": k, "hours": round(sum(_hours(r) for r in ev), 1), "events": len(ev)})
    return out


def deal_deadlines(evs: list[dict]) -> list[dict]:
    out = []
    for r in evs:
        if r["kind"] not in ("deadline", "closing"):
            continue
        t = r.get("title") or ""
        i = t.find(" - ")
        out.append({"title": t, "day": r["day"], "start": r.get("start"), "allDay": r.get("allDay"),
                    "deal": t[:i] if i > 0 else t, "what": t[i + 3:] if i > 0 else "Deadline", "link": r.get("link")})
    return out


def in_days(rows: list[dict], today: date, n: int) -> list[dict]:
    a, b = today.isoformat(), (today + timedelta(days=n)).isoformat()
    return [r for r in rows if a <= r["day"] <= b]


# ---------------- One deal source ----------------
# The AIRE Deals sheet is the one source for a deal's status, price, act of sale and commission. The CRM Deals tab
# and the calendar are matched to it by street (number plus street name), never added into its numbers.

DIRECTIONS = {"n", "s", "e", "w", "north", "south", "east", "west"}


def deal_key(t) -> str:
    """'2179 South Turnberry Avenue, Zachary', '2179 S Turnberry Ave' and 'Act of Sale · 2179 South Turnberry' are all
    '2179 turnberry': the first house number followed by a street word, directions dropped. A date like 11/23 is not a
    house number because a number follows it. The screen's CC.dealKey is the same rule."""
    words = re.findall(r"[a-z0-9]+", str(t or "").lower())
    for i, w in enumerate(words):
        if not w.isdigit():
            continue
        rest = [x for x in words[i + 1:] if x not in DIRECTIONS]
        if rest and re.search(r"[a-z]", rest[0]):
            return f"{w} {rest[0]}"
    return " ".join(words[:2])


CRM_STAGE = {"under_contract": "contract", "closed": "closed", "lost": "out", "active": "appointment",
             "showing": "appointment", "consult": "lead", "lead": "lead"}


def merge_deals(cards: list[dict], crm_deals: list[dict]) -> tuple[list[dict], list[dict]]:
    """Sheet deals keep their own numbers. A CRM Deals tab row on the same street is attached, and every field where
    the two disagree is listed so the screen can say so. CRM rows with no sheet deal come back on their own."""
    by = {}
    for d in crm_deals or []:
        by.setdefault(deal_key(d.get("address")), d)
    used, out = set(), []
    for c in cards:
        k = deal_key(c["deal"])
        d = by.get(k)
        diff = []
        if d:
            used.add(k)
            st = CRM_STAGE.get(d.get("stage") or "")
            if st and st != c["stage"]:
                diff.append({"field": "status", "sheet": c["status"], "crm": (d.get("stage") or "").replace("_", " ")})
            p = num(d.get("price"))
            if p and c.get("price") and abs(p - c["price"]) >= 1:
                diff.append({"field": "price", "sheet": c["price"], "crm": p})
            ec = d.get("expected_close") or ""
            if is_day(ec) and is_day(c.get("act")) and ec != c["act"]:
                diff.append({"field": "act of sale", "sheet": c["act"], "crm": ec})
        out.append({**c, "key": k, "crm": {x: d.get(x) for x in ("address", "stage", "person_id", "display")} if d else None,
                    "differs": diff})
    only = [{"deal": d.get("address"), "key": deal_key(d.get("address")), "stage": d.get("stage") or "",
             "side": d.get("side") or "", "price": num(d.get("price")), "close": d.get("expected_close") or None,
             "person_id": d.get("person_id") or "", "display": d.get("display") or "", "next": d.get("next_step") or ""}
            for d in crm_deals or [] if deal_key(d.get("address")) not in used and (d.get("stage") or "") not in ("lost", "closed")]
    return out, only


def contract_deadlines(cal: list[dict], cards: list[dict]) -> list[dict]:
    """Contract dates from the sheet (inspection, appraisal, act of sale) plus the coordinator's calendar dates.
    One row per deal per day: two events for the same deal on the same day are one deadline. When the calendar's
    act of sale differs from the sheet's, the sheet date stands and the row says what the calendar has."""
    sheet = {c["key"]: c for c in cards if c["stage"] == "contract"}
    rows = []
    for c in sheet.values():
        for step in c.get("checklist") or []:
            if step.get("date"):
                rows.append({"deal": c["deal"], "key": c["key"], "day": step["date"], "whats": [step["step"]],
                             "from": {"sheet"}, "note": None})
    for r in cal:
        k = deal_key(r["deal"])
        c = sheet.get(k)
        act = re.search(r"act of sale|closing", r["what"] + " " + r["title"], re.I)
        if c and act and is_day(c.get("act")) and r["day"] != c["act"]:
            for x in rows:
                if x["key"] == k and x["day"] == c["act"]:
                    x["note"] = f"the calendar has act of sale on {r['day']}"
            continue
        rows.append({"deal": c["deal"] if c else r["deal"], "key": k, "day": r["day"],
                     "whats": ["Act of sale" if act else r["what"]], "from": {"calendar"}, "note": None, "link": r.get("link")})
    merged = {}
    for r in rows:
        m = merged.get((r["key"], r["day"]))
        if not m:
            merged[(r["key"], r["day"])] = r
            continue
        for w in r["whats"]:
            if w.lower() not in [x.lower() for x in m["whats"]]:
                m["whats"].append(w)
        m["from"] |= r["from"]
        m["note"] = m["note"] or r["note"]
        m["link"] = m.get("link") or r.get("link")
    out = []
    for r in merged.values():
        frm = "both" if len(r["from"]) > 1 else next(iter(r["from"]))
        out.append({"deal": r["deal"], "key": r["key"], "day": r["day"], "what": ", ".join(r["whats"]),
                    "title": f"{r['deal']} - {', '.join(r['whats'])}", "from": frm, "note": r["note"], "link": r.get("link")})
    return sorted(out, key=lambda r: (r["day"], r["deal"]))


def closings(deadlines: list[dict], cards: list[dict], today: date) -> list[dict]:
    """Act of sale dates in the next 30 days, from the one deadline list, with the sheet's commission."""
    money = {c["key"]: c["commission"] for c in cards}
    return [{"deal": r["deal"], "day": r["day"], "money": money.get(r["key"]), "from": r["from"], "note": r["note"]}
            for r in in_days(deadlines, today, 30) if re.search(r"act of sale", r["what"], re.I)]


# ---------------- One lead list ----------------

def lead_due(received, replied, now: datetime) -> dict:
    """What a lead needs, from its age and whether a reply went out. Never a promise: a label for Caleb."""
    t = None
    try:
        t = datetime.fromisoformat(str(received)) if received and len(str(received)) > 10 else None
    except ValueError:
        t = None
    if t and t.tzinfo is None:
        t = t.replace(tzinfo=CENTRAL)
    if replied:
        return {"label": "Replied", "level": "done", "age_min": None}
    if not t:
        day = str(received or "")[:10]
        if not is_day(day):
            return {"label": "No time on this lead", "level": "unknown", "age_min": None}
        days = (now.date() - date.fromisoformat(day)).days
        return {"label": "Came in today, no reply yet" if days <= 0 else f"{days} day{'s' if days > 1 else ''} with no reply",
                "level": "late" if days >= 1 else "soon", "age_min": None}
    age = max(0, int((now - t).total_seconds() // 60))
    if age < 60:
        return {"label": f"Call within the hour ({60 - age} min left)", "level": "now", "age_min": age}
    if age < 1440:
        return {"label": f"{age // 60}h with no reply", "level": "late", "age_min": age}
    return {"label": f"{age // 1440} day{'s' if age >= 2880 else ''} with no reply", "level": "late", "age_min": age}


LEAD_DAYS = 14  # the one new-lead window: the last 14 days counting today. The weekly number is the last 7 (lead_counts).


def is_test_lead(*texts) -> bool:
    """A lead whose name, email or subject says test (a form check, not a person). Left out of every count."""
    return bool(re.search(r"\btest\b", " ".join(str(t or "") for t in texts), re.I))


def lead_day(r: dict) -> str:
    d = str(r.get("received") or "")[:10]
    return d if is_day(d) else ""


def in_lead_window(r: dict, today: date, days: int = LEAD_DAYS) -> bool:
    """Received on or after today minus days-1. A lead with no date is kept in the 14 days, because both sources only
    return 14 days of leads, and is never in the 7."""
    d = lead_day(r)
    return (not d and days >= LEAD_DAYS) or (bool(d) and d >= (today - timedelta(days=days - 1)).isoformat())


def lead_counts(leads: list[dict], today: date) -> dict:
    """The numbers every screen shows for new leads: the Dashboard, Scorecard, Leads, the nav and the brief."""
    return {"d14": sum(1 for r in leads if in_lead_window(r, today, 14)), "d7": sum(1 for r in leads if in_lead_window(r, today, 7)),
            "undated": sum(1 for r in leads if not lead_day(r)), "days": LEAD_DAYS}


def merge_leads(leads: list[dict], crm_new: list[dict], replied_ids: set, now: datetime) -> list[dict]:
    """Website lead emails plus CRM contacts in Stage new lead, one row per person, within the last 14 days (LEAD_DAYS).
    An email lead already matched to a CRM person (attach_crm) is that person's row. Test leads stay out, from either
    source. Newest first."""
    out, seen = [], set()
    for r in leads:
        if r.get("test") or is_test_lead(r.get("name"), r.get("email"), r.get("subject")):
            continue
        pid = (r.get("crm") or {}).get("person_id")
        if pid:
            seen.add(pid)
        out.append({**r, "origin": "email"})
    for p in crm_new or []:
        if p.get("person_id") in seen or is_test_lead(p.get("display"), p.get("email")):
            continue
        keep = ("person_id", "display", "band", "stage", "type", "last_touch", "days_quiet", "next_action", "owes_reply")
        out.append({"name": p.get("display") or "", "phone": p.get("phone") or "", "email": p.get("email") or "",
                    "source": p.get("source") or "CRM", "received": p.get("received") or "", "origin": "crm",
                    "crm": {k: p.get(k) for k in keep if p.get(k) not in (None, "")}})
    for r in out:
        c = r.get("crm") or {}
        pid, lt, day = c.get("person_id"), str(c.get("last_touch") or "")[:10], str(r.get("received") or "")[:10]
        touched = is_day(lt) and is_day(day) and lt >= day  # a touch logged in the CRM on or after the lead's day
        r["due"] = lead_due(r.get("received"), (pid in replied_ids if pid else False) or touched, now)
    out = [r for r in out if in_lead_window(r, now.date())]
    return sorted(out, key=lambda r: str(r.get("received") or ""), reverse=True)


# ---------------- Gmail ----------------

DEAL_SENDERS = r"authentisign|docusign|title\.com"


def inbox_sorted(inbox: list[dict], leads: list[dict], coord: list[str]) -> list[dict]:
    seen = {r.get("threadId") for r in inbox}
    rows = inbox + [r for r in leads if r.get("threadId") not in seen and not r.get("test")]
    rank = {"Lead": 0, "Deal": 1, "Other": 2}
    out = []
    for r in rows:
        subj, snd = r.get("subject") or "", r.get("sender") or ""
        if re.search(r"new lead|home value request", subj, re.I):
            cat = "Lead"
        elif re.search(DEAL_SENDERS, snd, re.I) or any(d and d.lower() in snd.lower() for d in coord) or \
                re.search(r"offer|counter|inspection|commission|closing|purchase agreement", subj, re.I):
            cat = "Deal"
        else:
            cat = "Other"
        out.append({**r, "category": cat})
    return sorted(out, key=lambda r: rank[r["category"]])


def _street(t: str) -> str:
    s = re.sub(r"^.*?(not processed|commission for)\s*-?\s*", "", str(t or "").lower())
    s = re.sub(r"^\d+\s+", "", s)
    s = re.sub(r"\b(dr|drive|ln|lane|rd|road|ave|avenue|st|street|ct|court)\b\.?", "", s)
    return re.sub(r"[^a-z ]", "", s).strip()


def _same_street(a: str, b: str) -> bool:
    """Whole words of three letters or more: 'pecan tree' matches 'pecan tree', and '41st' (which reads as 'st') matches nothing."""
    wa, wb = {w for w in a.split() if len(w) >= 3}, {w for w in b.split() if len(w) >= 3}
    return bool(wa) and bool(wb) and (wa <= wb or wb <= wa)


def commission_mail(rows: list[dict], deals: list[dict] | None = None) -> list[dict]:
    """Not processed is flagged unless a Commission for email names the same street. With the Deals sheet's rows, a paid
    Commission for email is Paid when a closed deal on the sheet has that street, and No closed deal when none does, so
    money that came in for a deal the sheet does not show as closed gets looked at."""
    paid = {_street(r["subject"]) for r in rows if re.search(r"commission for", r.get("subject") or "", re.I)}
    num = lambda t: (re.search(r"\b(\d{2,6})\s+[a-z]", str(t or ""), re.I) or [None, None])[1]  # a house number, not "41st"
    closed = [(_street(d.get("deal")), num(d.get("deal"))) for d in deals or [] if stage_of(d.get("status")) == "closed"]
    out = []
    for r in rows:
        s = r.get("subject") or ""
        if re.search(r"not processed", s, re.I):
            st = "Resolved" if _street(s) in paid else "Not processed"
        elif deals is not None and re.search(r"commission for", s, re.I):
            n = num(re.sub(r"^.*?commission for\s*", "", s, flags=re.I))  # "Commission for 12 Oak Ln" is house 12 only
            st = "Paid" if any(_same_street(_street(s), c) and (not n or not cn or n == cn) for c, cn in closed) else "No closed deal"
        else:
            st = "Notice"
        out.append({**r, "status": st})
    return sorted(out, key=lambda r: r["status"] not in ("Not processed", "No closed deal"))



def bank(rows: list[dict]) -> dict:
    """Chase alert emails, read only. Cash is the newest balance alert's amount, with that email's time."""
    rows = sorted(rows, key=lambda r: r.get("received") or "", reverse=True)
    bal = next((r for r in rows if r.get("type") == "Balance" and r.get("amount") is not None), None)
    dep = next((r for r in rows if r.get("type") == "Deposit"), None)
    return {"rows": rows, "alerts": len(rows), "deposits": sum(1 for r in rows if r.get("type") == "Deposit"),
            "cash": bal and {"value": bal["amount"], "at": bal.get("received")},
            "last_deposit": dep and {"value": dep.get("amount"), "at": dep.get("received"), "subject": dep.get("subject")}}


# ---------------- Scorecard, goals, history ----------------

def scorecard(deals, evs, leads, goals, kw_paid, today: date) -> dict:
    yr = str(today.year)
    closed = [r for r in deals if stage_of(r["status"]) == "closed"]
    yr_closed = [r for r in closed if is_day(r.get("act")) and r["act"][:4] == yr]
    sheet_gci = sum(r["commission"] or 0 for r in yr_closed)
    real = [r for r in leads if not r.get("test")]
    lc = lead_counts(real, today)
    end7 = (today + timedelta(days=6)).isoformat()
    appts = [r for r in evs if r["kind"] in ("showing", "listing", "client") and today.isoformat() <= r["day"] <= end7]
    paid = kw_paid.get("value") if kw_paid and kw_paid.get("value") is not None else None
    gci = {"value": paid if paid is not None else sheet_gci,
           "from": "kw_paid" if paid is not None else "sheet",
           "sheet_value": sheet_gci, "n": len(yr_closed),
           "blank": sum(1 for r in yr_closed if r["commission"] is None),
           "undated": sum(1 for r in closed if not is_day(r.get("act")))}
    pend = pending_commission(deals)
    gci["with_pending"] = gci["value"] + pend["value"]
    g = goals or {}
    cap = None
    if g.get("cap_amount") and is_day(g.get("cap_start")):
        co = SPLIT_CO * sum(r["commission"] or 0 for r in closed if is_day(r.get("act")) and r["act"] >= g["cap_start"])
        cap = {"paid": round(co, 2), "amount": g["cap_amount"], "pct": round(min(100, co / g["cap_amount"] * 100), 1),
               "left": round(max(0, g["cap_amount"] - co), 2), "start": g["cap_start"], "by": g.get("cap_by")}
    day_of_year = today.timetuple().tm_yday
    days_in_year = 366 if today.year % 4 == 0 else 365
    pace = day_of_year / days_in_year

    def prog(value, goal):
        if not goal:
            return None
        return {"goal": goal, "pct": round(value / goal * 100, 1), "pace_pct": round(pace * 100, 1),
                "ahead": value >= goal * pace, "left": max(0, goal - value)}

    return {"gci": {**gci, "goal": prog(gci["value"], g.get("gci_goal")),
                    "goal_with_pending": prog(gci["with_pending"], g.get("gci_goal"))},
            "pending": pend,
            "closings": {"value": len(yr_closed), "goal": prog(len(yr_closed), g.get("closings_high") or g.get("closings_low")),
                         "low": g.get("closings_low"), "high": g.get("closings_high")},
            "leads7": {"value": lc["d7"], "low": g.get("leads_low"), "high": g.get("leads_high"), "undated": lc["undated"]},
            "appts7": {"value": len(appts), "goal": g.get("appts")},
            "cap": cap,
            "response": {"value": None, "note": "Not tracked yet: needs the time of the first reply to each lead."}}


def history_row(sc: dict, today: date) -> dict:
    return {"day": today.isoformat(), "gci": sc["gci"]["value"], "pending": sc["pending"]["value"],
            "closings": sc["closings"]["value"], "leads7": sc["leads7"]["value"], "appts7": sc["appts7"]["value"]}


def add_history(rows: list[dict], row: dict) -> list[dict]:
    """One row a day. Today's row is replaced, never doubled."""
    return sorted([r for r in rows if r.get("day") != row["day"]] + [row], key=lambda r: r["day"])[-400:]


def saved_days(rows: list[dict], today: date) -> list[dict]:
    """History rows already saved in the sheet, before today. Today's row is computed, not history."""
    return [r for r in rows if is_day(r.get("day")) and r["day"] < today.isoformat()]


def since_saved(rows: list[dict], row: dict, metric: str) -> dict | None:
    """The change since the oldest saved day, for when no row is 7 days old yet. None with nothing saved."""
    past = [r for r in saved_days(rows, date.fromisoformat(row["day"])) if r.get(metric) is not None]
    if not past:
        return None
    return {"since": past[0]["day"], "days": len(past), "value": round(row[metric] - past[0][metric], 2)}


def deltas(rows: list[dict], row: dict, metric: str) -> dict:
    out = {}
    for span in (7, 30):
        k = (date.fromisoformat(row["day"]) - timedelta(days=span)).isoformat()
        past = [r for r in rows if str(r.get("day") or "") <= k and isinstance(r.get(metric), (int, float))]
        out[str(span)] = None if not past or row.get(metric) is None else round(row[metric] - past[-1][metric], 2)
    return out


# ---------------- The whole payload ----------------

def _rows(d):
    return (d or {}).get("rows") or []


def build(folder: Path, now: datetime | None = None, feed: dict | None = None, replied: set | None = None) -> dict:
    """feed is the CRM feed (crm/feed.json): its people match leads, its new leads join the lead list and its Deals
    tab rows are checked against the Deals sheet. replied holds person_ids a text or email went to since their lead."""
    now = (now or datetime.now(CENTRAL)).astimezone(CENTRAL)
    today = now.date()
    raw = load(folder)
    f = feed or {}
    cfg = (raw.get("config") or {}).get("rows") or {}
    coord = cfg.get("coordinator_domains") or []
    fresh = {k: freshness(raw.get(k) or {}, k, now) for k in DATASETS if k not in ("config", "sync-status", "outbox")}
    deals = deal_rows(_rows(raw["deals"]))
    evs = cal_events(_rows(raw["calendar"]), coord)
    people = (f.get("new_leads") or []) + (f.get("touches_due") or [])
    leads = merge_leads(attach_crm(_rows(raw["leads"]), people), f.get("new_leads") or [], replied or set(), now)
    cards, crm_only = merge_deals(deal_cards(deals, today), f.get("deals") or [])
    dl = contract_deadlines(deal_deadlines(evs), cards)
    goals = (raw.get("goals") or {}).get("rows") or {}
    sc = scorecard(deals, evs, leads, goals, cfg.get("kw_paid"), today)
    hist = _rows(raw["history"])
    hrow = history_row(sc, today)
    full = add_history(hist, hrow)
    return {
        "at": now.isoformat(timespec="seconds"), "today": today.isoformat(), "fresh": fresh,
        "deals": cards, "crm_only_deals": crm_only, "stages": pipeline_stages(deals, len(leads)),
        "calendar": evs, "week": week_load(evs, today),
        "deadlines": {"all": in_days(dl, today, 30), "d3": in_days(dl, today, 2), "d7": in_days(dl, today, 6),
                      "deals": len({r["key"] for r in in_days(dl, today, 30)})},
        "closings": closings(dl, cards, today),
        "inbox": inbox_sorted(_rows(raw["inbox"]), [r for r in leads if r.get("origin") == "email"], coord),
        "leads": leads, "lead_counts": lead_counts(leads, today), "commission_mail": commission_mail(_rows(raw["commission_mail"]), deals),
        "scorecard": sc, "goals": goals, "goals_set": bool(goals),
        "history": full, "deltas": {m: deltas(full, hrow, m) for m in ("gci", "closings", "leads7", "appts7")},
        "history_saved": len(saved_days(hist, today)),
        "since": {m: since_saved(hist, hrow, m) for m in ("gci", "closings", "leads7", "appts7")},
        "kw_paid": cfg.get("kw_paid"),
        "bank": bank(_rows(raw["bank_mail"])),
        "news": _rows(raw["news"]),
        "market": market((raw.get("market") or {}).get("rows") or {}),
        "life": life((raw.get("life") or {}).get("rows") or {}, _rows(raw["outbox"]), today),
        "workouts": workouts((raw.get("workouts") or {}).get("rows") or {}, _rows(raw["outbox"]), today),
        "health": {"source": None, "note": "Health is skipped: no source chosen (Caleb, 2026-11-05)."},
        "sync": ({**raw["sync-status"], "error_text": plain_error(raw["sync-status"].get("error")),
                  "results": {k: ({**v, "error_text": plain_error(v.get("error"))} if isinstance(v, dict) and v.get("error") else v)
                              for k, v in (raw["sync-status"].get("results") or {}).items()}}
                 if isinstance(raw.get("sync-status"), dict) else None),
        "problems": [{"name": k, **v} for k, v in fresh.items() if v["state"] in ("failed", "stale", "late")],
    }


def demo_folder(src: Path, dest: Path, now: datetime | None = None) -> Path:
    """Copy the made-up fixtures with dates moved to today: {{D+3}}, {{Y-03-14}}, {{NOW-20}} (minutes ago)."""
    now = (now or datetime.now(CENTRAL)).astimezone(CENTRAL)
    today = now.date()

    def sub(m):
        k = m.group(1)
        if k.startswith("NOW-"):
            return (now - timedelta(minutes=int(k[4:]))).isoformat(timespec="seconds")
        if k.startswith("Y-"):
            return f"{today.year}{k[1:]}"
        return (today + timedelta(days=int(k[1:]))).isoformat()

    dest.mkdir(parents=True, exist_ok=True)
    for p in src.glob("*.json"):
        (dest / p.name).write_text(re.sub(r"\{\{([^}]+)\}\}", sub, p.read_text(encoding="utf-8")), encoding="utf-8")
    return dest


GOAL_NUMBERS = ["gci_goal", "gci_goal_next", "closings_low", "closings_high", "leads_low", "leads_high", "appts",
                "cap_amount", "royalty"]
GOAL_DATES = ["cap_start", "cap_by"]


def clean_goals(data: dict) -> dict:
    """Only known goals, numbers zero or more, dates as YYYY-MM-DD, low never above high. Raises ValueError."""
    if not isinstance(data, dict):
        raise ValueError("goals must be an object")
    out = {}
    for k, v in data.items():
        if k in GOAL_NUMBERS:
            if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0 or v != v:
                raise ValueError(f"{k} must be a number, zero or more")
            out[k] = v
        elif k in GOAL_DATES:
            if not is_day(v):
                raise ValueError(f"{k} must be a date")
            out[k] = v
        else:
            raise ValueError(f"unknown goal {k}")
    for lo, hi in (("closings_low", "closings_high"), ("leads_low", "leads_high")):
        if lo in out and hi in out and out[lo] > out[hi]:
            raise ValueError(f"{lo} is above {hi}")
    return out


def save_goals(folder: Path, data: dict, now: datetime | None = None) -> dict:
    goals = clean_goals(data)
    now = (now or datetime.now(CENTRAL)).astimezone(CENTRAL)
    folder.mkdir(parents=True, exist_ok=True)
    doc = {"at": now.isoformat(timespec="seconds"), "source": "Goals form in Pipeline, saved on this Mac",
           "error": None, "rows": goals, "sheet_pending": True}
    tmp = folder / "goals.json.tmp"
    tmp.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    tmp.replace(folder / "goals.json")
    return goals


def _digits(v) -> str:
    d = re.sub(r"\D", "", str(v or ""))
    return d[-10:] if len(d) >= 10 else ""


def attach_crm(leads: list[dict], people: list[dict]) -> list[dict]:
    """Each website lead gets the CRM person it matches, by phone (last 10 digits) or email."""
    by = {}
    for p in people:
        for k in (_digits(p.get("phone")), str(p.get("email") or "").strip().lower()):
            if k and k not in by:
                by[k] = p
    out = []
    for r in leads:
        hit = by.get(_digits(r.get("phone"))) or by.get(str(r.get("email") or "").strip().lower())
        keep = ("person_id", "display", "band", "stage", "type", "last_touch", "days_quiet", "next_action", "owes_reply")
        out.append({**r, "crm": {k: hit.get(k) for k in keep if hit.get(k) not in (None, "")} if hit else None})
    return out


# ---------------- Market, Life, Workouts ----------------

def _pct(x) -> str:
    return "" if x is None else f"{'+' if x > 0 else ''}{round(x * 100)}% vs a year ago"


MARKET_PARTS = (("rate", "rate", "The mortgage rate (Freddie Mac, via FRED)"), ("areas", "Realtor.com", "Realtor.com inventory"),
                ("gbrar", "GBRAR", "The GBRAR monthly file"))


def plain_warning(w: str) -> str:
    """A sync warning in plain words: what did not load and roughly why. Never an exception name or error code."""
    t = str(w or "")
    what = next((label for _, key, label in MARKET_PARTS if t.lower().startswith(key.lower())), "One market source")
    if "zip" in t.lower()[:20]:
        what += " by ZIP"
    elif "county" in t.lower()[:24]:
        what += " by parish"
    why = ("the site took too long to answer" if re.search(r"timed? ?out|timeout", t, re.I)
           else "the site refused the request" if re.search(r"\b40[13]\b|forbidden|refused", t, re.I)
           else "the connection dropped" if re.search(r"reset|broken|closed", t, re.I)
           else "the site could not be reached" if re.search(r"urlerror|name or service|nodename|unreachable", t, re.I)
           else "the file could not be read")
    return f"{what} did not load: {why}"


def market_parts(m: dict) -> dict:
    """Each market tile's own state: ok, or failed when its source did not load in the last read (it then shows the
    last good number if there is one)."""
    warns = m.get("warnings") or []
    out = {}
    for part, key, label in MARKET_PARTS:
        bad = [plain_warning(w) for w in warns if str(w).lower().startswith(key.lower())]
        out[part] = {"state": "failed" if bad else ("ok" if m.get(part) else "missing"), "note": "; ".join(bad), "label": label}
    # Realtor.com reads parishes and ZIPs as two files: one failing leaves the other's cards current.
    for level in ("county", "zip"):
        bad = [plain_warning(w) for w in warns if str(w).lower().startswith(f"realtor.com {level}")]
        have = any(a.get("level") == level for a in m.get("areas") or [])
        out[f"areas_{level}"] = {"state": "failed" if bad else ("ok" if have else "missing"), "note": "; ".join(bad), "label": "Realtor.com inventory"}
    return out


def market(m: dict) -> dict:
    """Rates, areas and GBRAR, plus talking points written only from those numbers, each naming its source and date."""
    if not m:
        return {"rate": None, "areas": [], "gbrar": None, "points": [], "warnings": [], "parts": market_parts({})}
    pts, r = [], m.get("rate")
    if r:
        d = "down" if r["change"] < 0 else "up" if r["change"] > 0 else "flat"
        pts.append(f"The 30-year fixed averaged {r['rate']:.2f}% the week of {r['date']}, {d} {abs(r['change']):.2f} from the week before (Freddie Mac, via FRED).")
    for a in m.get("areas") or []:
        if a.get("active") is None:
            continue
        mon = a.get("month") or ""
        mon = f"{mon[:4]}-{mon[4:]}" if len(mon) == 6 else mon
        bits = [f"{int(a['active'])} active listings"]
        if a.get("median_price"):
            bits.append(f"median list price ${a['median_price']:,.0f}")
        if a.get("dom"):
            bits.append(f"{int(a['dom'])} median days on market")
        yy = _pct(a.get("active_yy"))
        pts.append(f"{a['area']}: {', '.join(bits)}{' (' + yy.replace('vs', 'listings vs') + ')' if yy else ''} (Realtor.com, {mon}).")
    g = m.get("gbrar")
    if g and g.get("snapshot"):
        s = g["snapshot"]
        def gv(k):
            return (s.get(k) or {}).get("now")
        pts.append(f"Greater Baton Rouge, {g['month']}: median sale price ${gv('median_price'):,.0f}, {gv('closed_sales')} closed sales, "
                   f"{gv('months_supply')} months of supply, {gv('days_on_market')} days on market (GBRAR MLS monthly indicators).")
    return {**m, "points": pts, "warnings": [plain_warning(w) for w in m.get("warnings") or []], "parts": market_parts(m)}


def _merge_outbox(rows: dict, outbox: list, tabs: dict) -> dict:
    """Rows Pipeline queued but the sync has not pushed yet show at once, marked pending."""
    out = {k: list(rows.get(k) or []) for k in tabs.values()}
    for e in outbox:
        if e.get("tab") in tabs:
            out[tabs[e["tab"]]].append({**e["row"], "pending": True})
    return out


def _day(t) -> date | None:
    try:
        return date.fromisoformat(str(t)[:10])
    except ValueError:
        return None


def life(rows: dict, outbox: list, today: date) -> dict:
    r = _merge_outbox(rows, outbox, {"Life": "items", "Life log": "log"})
    items, log = r["items"], r["log"]
    done = {}
    for x in log:
        d = _day(x.get("date"))
        if d:
            done.setdefault(str(x.get("item", "")).strip().lower(), set()).add(d)
    fam, upkeep, habits = [], [], []
    for it in items:
        kind, name = str(it.get("kind", "")).strip().lower(), str(it.get("name", "")).strip()
        if not name:
            continue
        key = name.lower()
        if kind == "family":
            t = str(it.get("date", "")).strip()
            mmdd = t[5:10] if re.match(r"\d{4}-\d{2}-\d{2}", t) else t if re.match(r"\d{2}-\d{2}$", t) else ""
            if not mmdd:
                continue
            try:
                nxt = date.fromisoformat(f"{today.year}-{mmdd}")
                if nxt < today:
                    nxt = date.fromisoformat(f"{today.year + 1}-{mmdd}")
            except ValueError:  # Feb 29 in a short year
                nxt = date(today.year if (today.month, today.day) <= (2, 28) else today.year + 1, 3, 1)
            fam.append({"name": name, "next": nxt.isoformat(), "days": (nxt - today).days, "note": it.get("note", ""), "pending": it.get("pending", False)})
        elif kind == "upkeep":
            every = num(it.get("every_days"))
            last = max(done.get(key, set()) | ({_day(it.get("date"))} - {None}), default=None)
            due_on = last + timedelta(days=int(every)) if last and every else None
            upkeep.append({"name": name, "every": every, "last": last.isoformat() if last else None,
                           "due": due_on.isoformat() if due_on else None, "days": (due_on - today).days if due_on else None,
                           "note": it.get("note", ""), "pending": it.get("pending", False)})
        elif kind == "habit":
            ds, streak, d = done.get(key, set()), 0, today
            if today not in ds:
                d = today - timedelta(days=1)
            while d in ds:
                streak, d = streak + 1, d - timedelta(days=1)
            habits.append({"name": name, "today": today in ds, "streak": streak,
                           "week": sum(1 for i in range(7) if today - timedelta(days=i) in ds), "pending": it.get("pending", False)})
    return {"family": sorted(fam, key=lambda x: x["days"]),
            "upkeep": sorted(upkeep, key=lambda x: (x["days"] is None, x["days"] if x["days"] is not None else 0)),
            "habits": habits}


DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def workouts(rows: dict, outbox: list, today: date) -> dict:
    r = _merge_outbox(rows, outbox, {"Workouts": "plan", "Workout log": "log"})
    plan = {str(p.get("day", ""))[:3].title(): p for p in r["plan"]}
    log = [x for x in r["log"] if _day(x.get("date"))]
    monday = today - timedelta(days=today.weekday())
    week = []
    for i, dn in enumerate(DAYS):
        d = monday + timedelta(days=i)
        hits = [x for x in log if _day(x["date"]) == d]
        p = plan.get(dn) or {}
        week.append({"day": dn, "date": d.isoformat(), "focus": p.get("focus", ""), "exercises": p.get("exercises", ""),
                     "done": bool(hits), "minutes": sum(num(x.get("minutes")) or 0 for x in hits), "is_today": d == today,
                     "pending": any(x.get("pending") for x in hits)})
    last7 = [x for x in log if 0 <= (today - _day(x["date"])).days < 7]
    return {"week": week, "done_7": len({x["date"][:10] for x in last7}), "minutes_7": sum(num(x.get("minutes")) or 0 for x in last7),
            "today": next((w for w in week if w["is_today"]), None), "has_plan": bool(plan),
            "recent": sorted(log, key=lambda x: str(x.get("date")), reverse=True)[:10]}


LIFE_KINDS = ("family", "upkeep", "habit")


def queue_row(folder: Path, tab: str, row: dict, now: datetime | None = None) -> dict:
    """Pipeline's Life and Workouts buttons: one row queued for the sheet. Only these four tabs, only known columns."""
    cols = {"Life": ["kind", "name", "date", "every_days", "note"], "Life log": ["date", "item", "kind"],
            "Workout log": ["date", "focus", "minutes", "note"]}
    if tab not in cols:
        raise ValueError("unknown tab")
    clean = {}
    for c in cols[tab]:
        v = str(row.get(c, "") if row.get(c) is not None else "").strip()[:200]
        if v.startswith(("=", "+", "-", "@")):  # never let a cell become a formula
            v = "'" + v
        clean[c] = v
    if tab == "Life" and (clean["kind"] not in LIFE_KINDS or not clean["name"]):
        raise ValueError("a life item needs a kind (family, upkeep or habit) and a name")
    if tab != "Life" and not is_day(clean["date"]):
        raise ValueError("a log row needs a date")
    if tab == "Life" and clean["kind"] == "family" and not re.match(r"(\d{4}-)?\d{2}-\d{2}$", clean["date"]):
        raise ValueError("a family date needs a date")
    if clean.get("every_days") and num(clean["every_days"]) is None:
        raise ValueError("every_days must be a number")
    now = (now or datetime.now(CENTRAL)).astimezone(CENTRAL)
    p = folder / "outbox.json"
    try:
        box = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        box = {"rows": []}
    entry = {"tab": tab, "row": clean, "at": now.isoformat(timespec="seconds")}
    box["rows"].append(entry)
    folder.mkdir(parents=True, exist_ok=True)
    tmp = folder / "outbox.json.tmp"
    tmp.write_text(json.dumps(box, indent=1), encoding="utf-8")
    tmp.replace(p)
    return entry
