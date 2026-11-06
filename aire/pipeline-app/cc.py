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
STALE_HOURS = {"deals": 6, "calendar": 2, "inbox": 1, "leads": 1, "commission_mail": 24, "bank_mail": 6, "history": 36}
DATASETS = ["deals", "calendar", "inbox", "leads", "commission_mail", "bank_mail", "goals", "history", "config", "sync-status"]


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

def freshness(meta: dict, name: str, now: datetime) -> dict:
    """ok, stale, failed or missing, with the as-of time. A failed read keeps its last good rows."""
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
    state = "ok"
    if meta.get("error"):
        state = "failed"
    elif age is None:
        state = "missing"
    elif limit is not None and age > limit * 60:
        state = "stale"
    return {"state": state, "at": at, "age_min": age, "source": meta.get("source"), "error": meta.get("error")}


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
        out.append({**r, "stage": st, "next": next_step(r.get("check")), "days": days})
    return sorted(out, key=lambda r: (order[r["stage"]], r.get("act") or "9"))


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


def week_load(evs: list[dict], today: date) -> list[dict]:
    """Booked hours, today plus 6: timed, not free, not a work block or personal time."""
    busy = [r for r in evs if not r.get("allDay") and not r.get("free") and r["kind"] not in ("block", "personal")]
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


def closings(deadlines: list[dict], deals: list[dict], today: date) -> list[dict]:
    """Act of sale dates in 30 days from the calendar and the sheet, merged on street number."""
    snum = lambda t: (re.match(r"\s*(\d+)", t or "") or [None, None])[1]
    cl = [{"deal": r["deal"], "day": r["day"], "money": None, "from": "calendar"}
          for r in in_days(deadlines, today, 30) if re.search(r"act of sale|closing", r["what"] + r["title"], re.I)]
    last = (today + timedelta(days=30)).isoformat()
    for d in deals:
        if stage_of(d["status"]) != "contract" or not is_day(d.get("act")) or not today.isoformat() <= d["act"] <= last:
            continue
        hit = next((r for r in cl if snum(r["deal"]) and snum(r["deal"]) == snum(d["deal"])), None)
        if hit:
            hit.update(money=d["commission"], **{"from": "both"})
        else:
            cl.append({"deal": d["deal"], "day": d["act"], "money": d["commission"], "from": "sheet"})
    return sorted(cl, key=lambda r: r["day"])


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


def commission_mail(rows: list[dict]) -> list[dict]:
    """Not processed is flagged unless a Commission for email names the same street."""
    paid = {_street(r["subject"]) for r in rows if re.search(r"commission for", r.get("subject") or "", re.I)}
    out = []
    for r in rows:
        s = r.get("subject") or ""
        st = ("Resolved" if _street(s) in paid else "Not processed") if re.search(r"not processed", s, re.I) else "Notice"
        out.append({**r, "status": st})
    return sorted(out, key=lambda r: r["status"] != "Not processed")



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
    end7 = (today + timedelta(days=6)).isoformat()
    appts = [r for r in evs if r["kind"] in ("showing", "listing", "client") and today.isoformat() <= r["day"] <= end7]
    since7 = (today - timedelta(days=6)).isoformat()
    leads7 = [r for r in real if (r.get("received") or "")[:10] >= since7]
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
            "leads7": {"value": len(leads7), "low": g.get("leads_low"), "high": g.get("leads_high"),
                       "undated": sum(1 for r in real if not r.get("received"))},
            "appts7": {"value": len(appts), "goal": g.get("appts")},
            "cap": cap,
            "response": {"value": None, "note": "Not tracked yet: needs the time of the first reply to each lead."}}


def history_row(sc: dict, today: date) -> dict:
    return {"day": today.isoformat(), "gci": sc["gci"]["value"], "pending": sc["pending"]["value"],
            "closings": sc["closings"]["value"], "leads7": sc["leads7"]["value"], "appts7": sc["appts7"]["value"]}


def add_history(rows: list[dict], row: dict) -> list[dict]:
    """One row a day. Today's row is replaced, never doubled."""
    return sorted([r for r in rows if r.get("day") != row["day"]] + [row], key=lambda r: r["day"])[-400:]


def deltas(rows: list[dict], row: dict, metric: str) -> dict:
    out = {}
    for span in (7, 30):
        k = (date.fromisoformat(row["day"]) - timedelta(days=span)).isoformat()
        past = [r for r in rows if r["day"] <= k]
        out[str(span)] = None if not past else round(row[metric] - past[-1][metric], 2)
    return out


# ---------------- The whole payload ----------------

def _rows(d):
    return (d or {}).get("rows") or []


def build(folder: Path, now: datetime | None = None) -> dict:
    now = (now or datetime.now(CENTRAL)).astimezone(CENTRAL)
    today = now.date()
    raw = load(folder)
    cfg = (raw.get("config") or {}).get("rows") or {}
    coord = cfg.get("coordinator_domains") or []
    fresh = {k: freshness(raw.get(k) or {}, k, now) for k in DATASETS if k not in ("config", "sync-status")}
    deals = deal_rows(_rows(raw["deals"]))
    evs = cal_events(_rows(raw["calendar"]), coord)
    leads = _rows(raw["leads"])
    dl = deal_deadlines(evs)
    goals = (raw.get("goals") or {}).get("rows") or {}
    sc = scorecard(deals, evs, leads, goals, cfg.get("kw_paid"), today)
    hist = _rows(raw["history"])
    hrow = history_row(sc, today)
    full = add_history(hist, hrow)
    return {
        "at": now.isoformat(timespec="seconds"), "today": today.isoformat(), "fresh": fresh,
        "deals": deal_cards(deals, today), "stages": pipeline_stages(deals, len([r for r in leads if not r.get("test")])),
        "calendar": evs, "week": week_load(evs, today),
        "deadlines": {"all": in_days(dl, today, 30), "d3": in_days(dl, today, 2), "d7": in_days(dl, today, 6),
                      "deals": len({r["deal"] for r in in_days(dl, today, 30)})},
        "closings": closings(dl, deals, today),
        "inbox": inbox_sorted(_rows(raw["inbox"]), leads, coord),
        "leads": leads, "commission_mail": commission_mail(_rows(raw["commission_mail"])),
        "scorecard": sc, "goals": goals, "goals_set": bool(goals),
        "history": full, "deltas": {m: deltas(full, hrow, m) for m in ("gci", "closings", "leads7", "appts7")},
        "kw_paid": cfg.get("kw_paid"),
        "bank": bank(_rows(raw["bank_mail"])),
        "sync": raw.get("sync-status") or None,
        "problems": [{"name": k, **v} for k, v in fresh.items() if v["state"] in ("failed", "stale")],
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
