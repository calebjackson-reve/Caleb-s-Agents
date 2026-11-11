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


# ---------------- the model ----------------

def fit(X: list[list[float]], y: list[int], l2: float = 1.0, steps: int = 600, lr: float = 0.5) -> list[float]:
    """Logistic regression with an L2 penalty, by plain gradient descent. Returns the bias, then one number per input."""
    n, k = len(X), len(X[0])
    w = [0.0] * (k + 1)
    for _ in range(steps):
        g = [0.0] * (k + 1)
        for xi, yi in zip(X, y):
            z = w[0] + sum(a * b for a, b in zip(w[1:], xi))
            e = 1 / (1 + math.exp(-max(-30, min(30, z)))) - yi
            g[0] += e
            for j in range(k):
                g[j + 1] += e * xi[j]
        w = [w[0] - lr * g[0] / n] + [w[j + 1] - lr * (g[j + 1] / n + l2 * w[j + 1] / n) for j in range(k)]
    return w


def as_weights(coef: list[float], names: list[str]) -> dict | None:
    """Learned numbers as points that add to 100. A part that predicts no better than chance, or worse, gets 0."""
    pos = [max(0.0, c) for c in coef]
    return {k: round(100 * v / sum(pos), 1) for k, v in zip(names, pos)} if sum(pos) > 0 else None


def blend(hand: dict, learned: dict, prev: dict, n: int) -> dict:
    """Hand-set weights pulled toward the learned ones by how much data there is, never more than MAX_STEP points a
    part from last week's. Every part moves by the same share of the way, so the total stays 100."""
    a = min(1.0, n / FULL_TRUST)
    want = {k: (1 - a) * hand[k] + a * learned.get(k, 0.0) for k in hand}
    total = sum(want.values()) or 1.0
    delta = {k: 100 * want[k] / total - prev[k] for k in hand}  # both add to 100, so the moves add to zero
    f = min(1.0, MAX_STEP / max((abs(d) for d in delta.values()), default=0) if any(delta.values()) else 1.0)
    return {k: round(max(0.0, prev[k] + f * delta[k]), 1) for k in hand}


def auc(weights: dict, rows: list[dict]) -> float | None:
    """How well a set of weights puts the yes rows above the no rows, 0.5 is chance. None without both kinds."""
    scored = [(sum(weights.get(k, 0) * v for k, v in r["x"].items()), r["yes"]) for r in rows]
    yes, no = [s for s, y in scored if y], [s for s, y in scored if not y]
    if not yes or not no:
        return None
    return round(sum((a > b) + 0.5 * (a == b) for a in yes for b in no) / (len(yes) * len(no)), 3)


def current(folder: Path) -> dict:
    """The weights in use for each list: the newest version that was kept, else the hand-set ones."""
    vs = _read(folder / "versions.json", [])
    return dict(vs[-1]["weights"]) if vs else {k: dict(v) for k, v in HAND.items()}


def due(folder: Path, now: datetime) -> bool:
    """Once a week, from Monday 6 AM. A Mac that was asleep on Monday catches up the next time it is awake."""
    vs = _read(folder / "versions.json", [])
    return (now.weekday() > 0 or now.hour >= 6) and not any(v.get("week") == week_of(now.date()) for v in vs)


def retrain(folder: Path, ev: dict, today: date) -> dict:
    """One weekly version for both lists, saved whether or not anything changed, with why."""
    vs = _read(folder / "versions.json", [])
    prev = current(folder)
    ranked = {(r["list"], r["person_id"], r["day"]): r for r in _lines(folder / "ranked.jsonl")}
    labeled = [{**ranked[(o["list"], o["person_id"], o["day"])], "yes": o["yes"]} for o in outcome_log(folder, ev, today) if o["resolved"]]
    version = {"version": len(vs) + 1, "date": today.isoformat(), "week": week_of(today), "weights": {}, "lists": {}}
    for name, feats in FEATURES.items():
        rows = [r for r in labeled if r["list"] == name]
        yes = sum(1 for r in rows if r["yes"])
        # The test set is the newest answers: people ranked 90 to 180 days ago, whose 90 days ended in the last 90. When
        # there are enough older answers to learn from, the fit never sees the test set (a holdout). When there are
        # not, it learns from everything and the test is marked as in-sample.
        recent = [r for r in rows if _day(r["day"]) >= today - timedelta(days=HORIZON * 2)]
        older = [r for r in rows if _day(r["day"]) < today - timedelta(days=HORIZON * 2)]
        holdout = len(older) >= MIN_ROWS and sum(1 for r in older if r["yes"]) >= MIN_YES and len(recent) >= 10
        train = older if holdout else rows
        info = {"rows": len(rows), "yes": yes, "tested_on": len(recent), "holdout": holdout, "old_auc": auc(prev[name], recent), "new_auc": None, "used": False}
        keep = dict(prev[name])
        if len(rows) < MIN_ROWS or yes < MIN_YES:
            info["note"] = f"Not enough outcomes yet: {len(rows)} of {MIN_ROWS} people with an answer, {yes} of {MIN_YES} with an appointment or listing. The weights did not change."
        else:
            learned = as_weights(fit([[r["x"].get(k, 0.0) for k in feats] for r in train], [int(r["yes"]) for r in train])[1:], feats)
            if not learned:
                info["note"] = "No part of the score predicted an appointment or a listing in these outcomes. The weights did not change."
            else:
                new = blend(HAND[name], learned, prev[name], len(train))
                info["new_auc"] = auc(new, recent)
                if info["old_auc"] is not None and info["new_auc"] is not None and info["new_auc"] < info["old_auc"]:
                    info["note"] = f"The new weights tested worse on the last 90 days ({info['new_auc']} against {info['old_auc']}), so last week's weights stay."
                else:
                    keep, info["used"] = new, new != prev[name]
                    info["note"] = ("New weights in use." if info["used"] else "The learned weights match last week's.") + ("" if holdout else " Tested on the same answers it learned from, since there are not enough older ones to hold any back yet.")
        info["changes"] = {k: round(keep[k] - prev[name][k], 1) for k in feats if round(keep[k] - prev[name][k], 1)}
        version["weights"][name], version["lists"][name] = keep, info
    _write(folder / "versions.json", (vs + [version])[-104:])
    return version


# ---------------- the scorecard on Sources ----------------

def in_words(weights: dict) -> list[str]:
    total = sum(weights.values()) or 1
    return [f"{WORDS.get(k, k)} counts {round(100 * v / total)}%" for k, v in sorted(weights.items(), key=lambda kv: -kv[1])]


def top_last_month(folder: Path, ev: dict, today: date, name: str = "seller") -> dict:
    """Of the people in the top of the list 30 to 60 days ago, how many replied, set an appointment, listed. None of
    each when the log does not go back that far."""
    rows = [r for r in _lines(folder / "ranked.jsonl") if r["list"] == name and r.get("top") and today - timedelta(days=60) <= _day(r["day"]) <= today - timedelta(days=30)]
    first = min((r["day"] for r in _lines(folder / "ranked.jsonl")), default=None)
    seen, picked = set(), []
    for r in sorted(rows, key=lambda r: (r["day"], r["rank"]), reverse=True):
        if r["person_id"] not in seen and len(picked) < TOP[name]:
            seen.add(r["person_id"])
            picked.append(outcome(r, ev, today))
    if not picked:
        return {"n": 0, "replied": None, "appointment": None, "listing": None,
                "why": f"The log started {first}, so nobody was ranked 30 to 60 days ago yet." if first else "Nobody has been ranked yet. The log starts the first day this runs."}
    return {"n": len(picked), "replied": sum(1 for o in picked if o["replied"]), "appointment": sum(1 for o in picked if o["appointment"]),
            "listing": sum(1 for o in picked if o["listing"]), "why": ""}


def scorecard(folder: Path, ev: dict, today: date) -> dict:
    vs, fb, ranked = _read(folder / "versions.json", []), _lines(folder / "feedback.jsonl"), _lines(folder / "ranked.jsonl")
    cur = current(folder)
    return {"versions": [{"version": v["version"], "date": v["date"], "lists": v["lists"], "weights": v["weights"]} for v in vs[-8:]][::-1],
            "current": {k: {"weights": cur[k], "words": in_words(cur[k]), "hand_set": cur[k] == HAND[k]} for k in FEATURES},
            "changed": {k: (vs[-1]["lists"][k].get("changes") or {}) for k in FEATURES} if vs else None,
            "last_month": {k: top_last_month(folder, ev, today, k) for k in FEATURES},
            "log": {"ranked": len(ranked), "people": len({r["person_id"] for r in ranked}), "since": min((r["day"] for r in ranked), default=None),
                    "good": sum(1 for r in fb if r["verdict"] == "good"), "not_useful": sum(1 for r in fb if r["verdict"] == "not_useful")},
            "next": "Every Monday at 6 AM on this Mac.", "needs": {"rows": MIN_ROWS, "yes": MIN_YES, "max_step": MAX_STEP, "horizon": HORIZON},
            "never": "Race, religion, family status, age and disability are never inputs, and neither is anything that stands in for them. The only inputs are the parts of the score shown here."}
