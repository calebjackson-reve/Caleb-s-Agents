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
STALE_HOURS = {"deals": 6, "calendar": 2, "inbox": 1, "leads": 1, "commission_mail": 24, "history": 36}
DATASETS = ["deals", "calendar", "inbox", "leads", "commission_mail", "goals", "history", "config"]


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
