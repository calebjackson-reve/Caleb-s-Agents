#!/usr/bin/env python3
"""Heat: one number and one label per person, worked out the same way every time, with the reasons in plain words.

Why this exists (aire/enrichment/AUDIT-2026-11-10-temperature.md): the live feed took hot, warm and cold straight
from the sheet's band column, which nobody updates, and ranked people by how many texts they sent. A chatty friend
outranked a quiet seller. This scores what a person did and when, so the Hot and Warm lists fill themselves.

No model, no network, no writes. The sheet's band is one input among several and is never changed from here.

  heat   0 to 100
  temp   hot 50+, warm 30 to 49, lukewarm 15 to 29, cold 5 to 14, ice-cold under 5

Where the points come from (each part is capped, the reasons list says which ones fired):

  intent      up to 46   real estate intent in their own words, dated. This month counts most.
  deal        up to 30   a live deal on the Deals tab, or deal words this month
  lead        up to 22   a new lead by its Source date, or a stage that says they are in motion
  talk        up to 18   texting both ways lately. Waiting on Caleb's reply counts extra.
  life        up to 8    a referral or a life event mentioned in the last 90 days
  band        up to 30   Caleb's own band. He knows things no text shows, so hot plus recent contact is warm on
                         its own. It halves after 60 quiet days and is gone after 180.

Two floors, because speed matters more than math there: a live deal is always hot, and a new lead is hot for its
first 7 days and at least warm through day 14.

Then everything but a live deal fades with silence: full weight inside 14 days, a quarter after six months.
Someone Caleb has texted three or more times in 90 days with no answer loses points and says so.
A broadcast sender (many texts in, almost none answered) gets no talk or intent points.

`python3 heat.py --test` runs the offline checks.
"""
from __future__ import annotations

import sys
from datetime import date

TEMPS = ("hot", "warm", "lukewarm", "cold", "ice-cold")
THRESHOLDS = (("hot", 50), ("warm", 30), ("lukewarm", 15), ("cold", 5))
INTENT = ("sell", "buy", "move", "rent", "invest")
INTENT_WORDS = {"sell": "selling", "buy": "buying", "move": "moving", "rent": "renting", "invest": "investing"}
LIVE_STAGES = ("under contract", "active", "offer", "pending", "listed", "inspection", "appraisal", "clear to close")
MOTION_STAGES = ("active buyer", "seller candidate", "appointment", "consult", "showing", "pre-approved", "preapproved", "listing appointment")
BAND_PRIOR = {"hot": 30, "warm": 18, "lukewarm": 6}
SKIP_TYPES = {"vendor", "agent", "lender", "recruit"}


def _ago(iso: str, as_of: date) -> int | None:
    iso = (iso or "")[:10]
    try:
        d = date.fromisoformat(iso)
    except ValueError:
        return None
    return (as_of - d).days if d <= as_of else None


def _when(days: int) -> str:
    return "today" if days <= 0 else "yesterday" if days == 1 else f"{days} days ago"


def temp_for(heat: int) -> str:
    return next((t for t, floor in THRESHOLDS if heat >= floor), "ice-cold")


def fade(days_quiet: int | None) -> float:
    """How much of the score survives the silence. None means no contact on record at all."""
    if days_quiet is None:
        return 0.5
    for limit, f in ((14, 1.0), (30, 0.9), (60, 0.75), (90, 0.6), (180, 0.4)):
        if days_quiet <= limit:
            return f
    return 0.25


def score(contact: dict, sig: dict | None, as_of: date, *, deal_stage: str = "", lead_age: int | None = None,
          last_touch: str = "") -> dict:
    """contact: a Contacts row. sig: this person's message signals (or None). deal_stage: stage of their live deal
    on the Deals tab, '' when none. lead_age: days since the date in Source, when they are a lead. last_touch: ISO
    date of the last logged touch. Returns heat, temp, reasons (strongest first), parts, and status."""
    sig = sig or {}
    typ = (contact.get("Type") or "").lower()
    if (contact.get("Do_Not_Contact") or "").upper() == "YES":
        return {"heat": 0, "temp": "ice-cold", "reasons": [], "parts": {}, "status": "do-not-contact"}
    if typ in SKIP_TYPES:
        return {"heat": 0, "temp": "ice-cold", "reasons": [], "parts": {}, "status": "vendor-agent"}

    stage = (contact.get("Stage") or "").strip().lower()
    band = (contact.get("band") or "").strip().lower()
    broadcast = bool(sig.get("broadcast"))
    kw30, kw90, kwlast = sig.get("kw_30") or {}, sig.get("kw_90") or {}, sig.get("kw_last") or {}
    in30, in90 = int(sig.get("in_30") or 0), int(sig.get("in_90") or sig.get("signal_score") or 0)
    out30, out90 = int(sig.get("out_30") or 0), int(sig.get("out_90") or 0)
    din, dout = _ago(sig.get("last_inbound", ""), as_of), _ago(sig.get("last_outbound", ""), as_of)
    dtouch = _ago(last_touch, as_of)
    seen = [d for d in (din, dout, dtouch, lead_age if (lead_age is not None and lead_age >= 0) else None) if d is not None]
    quiet = min(seen) if seen else None

    parts: dict[str, int] = {}
    why: list[tuple[int, str]] = []

    # ---- intent in their own words, by how recent
    if not broadcast:
        n30 = sum(int(kw30.get(k, 0)) for k in INTENT)
        n90 = sum(int(kw90.get(k, 0)) for k in INTENT)
        top = max((k for k in INTENT if kwlast.get(k)), key=lambda k: kwlast[k], default="")
        age = _ago(kwlast.get(top, ""), as_of) if top else None
        if n30:
            parts["intent"] = min(46, 34 + 4 * (n30 - 1))
        elif n90:
            parts["intent"] = min(30, 20 + 3 * (n90 - 1))
        if parts.get("intent") and age is not None:
            why.append((parts["intent"], f"Talked about {INTENT_WORDS[top]} {_when(age)}"))

    # ---- a live deal, or deal talk this month
    ds = (deal_stage or "").strip().lower()
    live = bool(ds) and any(s in ds for s in LIVE_STAGES)
    if live:
        parts["deal"] = 30
        why.append((30, f"Live deal, {ds}"))
    elif ds:
        parts["deal"] = 18
        why.append((18, f"Deal on the board, {ds}"))
    elif not broadcast and int(kw30.get("deal", 0)):
        parts["deal"] = 12
        why.append((12, "Deal talk in their texts this month"))

    # ---- a new lead, or a stage that says they are moving
    if lead_age is not None and lead_age <= 30:
        parts["lead"] = 22 if lead_age <= 7 else 18 if lead_age <= 14 else 12
        why.append((parts["lead"], f"New lead {_when(lead_age)}"))
    elif any(s in stage for s in MOTION_STAGES) and "inactive" not in stage:
        parts["lead"] = 14
        why.append((14, f"Stage is {stage}"))
    elif stage == "past client":
        parts["lead"] = 4

    # ---- a real two way conversation
    if not broadcast and in30:
        pts = min(in30, 5) * 2 + (4 if out30 else 0)
        if sig.get("owes_reply"):
            pts += 4
            why.append((pts, f"Texted {_when(din or 0)} and is waiting on your reply"))
        elif out30:
            why.append((pts, f"Texting both ways, {in30} from them in 30 days"))
        else:
            why.append((pts, f"{in30} text{'s' if in30 != 1 else ''} from them in 30 days"))
        parts["talk"] = min(18, pts)
    elif not broadcast and in90:
        parts["talk"] = min(6, in90)

    # ---- referral or life event
    if not broadcast and int(kw90.get("referral", 0)):
        parts["life"] = 8
        why.append((8, "Mentioned a referral in the last 90 days"))
    elif not broadcast and int(kw90.get("life", 0)):
        parts["life"] = 6
        why.append((6, "Mentioned a life change in the last 90 days"))

    # ---- Caleb's own band, as a prior that fades when nothing has happened
    prior = BAND_PRIOR.get(band, 0)
    if prior:
        prior = prior if (quiet is not None and quiet <= 60) else prior // 2 if (quiet is not None and quiet <= 180) else 0
        if prior:
            parts["band"] = prior
            why.append((prior, f"You marked them {band}"))

    total = sum(parts.values())
    if not live:  # a live deal does not cool because nobody texted this week
        deal_pts = 0
        total = deal_pts + round((total - deal_pts) * fade(quiet))
    # ---- they are not answering
    if not broadcast and out90 >= 3 and in90 == 0 and not live:
        parts["unanswered"] = -10
        total -= 10
        why.append((99, f"No answer to your last {out90} texts in 90 days"))
    if broadcast:
        why.append((1, "Sends many texts you do not answer, so texts are not counted"))
    heat = max(0, min(100, total))
    if live:
        heat = max(heat, 60)
    elif lead_age is not None and 0 <= lead_age <= 7:
        heat = max(heat, 50)
    elif lead_age is not None and 0 <= lead_age <= 14:
        heat = max(heat, 30)
    reasons = [text for _, text in sorted(why, key=lambda x: -x[0])][:4]
    if not reasons:
        reasons = ["Nothing recent on record"] if quiet is None or quiet > 90 else [f"Last contact {_when(quiet)}, no buying or selling signal"]
    return {"heat": heat, "temp": temp_for(heat), "reasons": reasons, "parts": parts, "status": "ok", "days_quiet": quiet}


def run_tests() -> int:
    failures = 0

    def check(cond, label):
        nonlocal failures
        print(("ok   " if cond else "FAIL ") + label)
        failures += 0 if cond else 1

    t = date(2026, 11, 10)
    d = lambda n: date.fromordinal(t.toordinal() - n).isoformat()
    base = {"person_id": "1", "display": "Taylor Sample", "band": "", "Stage": "", "Type": "", "Do_Not_Contact": "NO"}

    seller = score(base, {"kw_30": {"sell": 2}, "kw_90": {"sell": 2}, "kw_last": {"sell": d(4)}, "in_30": 4, "out_30": 3, "in_90": 6,
                          "out_90": 5, "last_inbound": d(4), "last_outbound": d(3)}, t)
    check(seller["temp"] == "hot" and seller["reasons"][0] == "Talked about selling 4 days ago", "selling talk this week with a real conversation is hot, and says why")
    friend = score(base, {"in_30": 40, "out_30": 35, "in_90": 120, "out_90": 110, "last_inbound": d(0), "last_outbound": d(0)}, t)
    check(friend["temp"] in ("lukewarm", "cold") and friend["heat"] < seller["heat"], "a chatty friend with no intent is not hot, however many texts")
    old = score(base, {"kw_90": {}, "kw_30": {}, "kw_last": {"sell": d(200)}, "keyword_hits": {"sell": 3}, "in_30": 2, "out_30": 1, "in_90": 2,
                       "last_inbound": d(5), "last_outbound": d(5)}, t)
    check(old["temp"] not in ("hot", "warm"), "selling talk from 200 days ago is not this month's intent")
    cooled = score(base, {"kw_90": {"buy": 1}, "kw_30": {}, "kw_last": {"buy": d(70)}, "in_90": 1, "last_inbound": d(70), "last_outbound": d(69)}, t)
    recent = score(base, {"kw_90": {"buy": 1}, "kw_30": {"buy": 1}, "kw_last": {"buy": d(6)}, "in_30": 1, "in_90": 1, "last_inbound": d(6), "last_outbound": d(5)}, t)
    check(recent["heat"] > cooled["heat"] and cooled["temp"] in ("lukewarm", "cold", "warm") and recent["temp"] in ("warm", "hot"), "the same words cool as the weeks pass")
    lead = score({**base, "Stage": "new lead"}, None, t, lead_age=2)
    check(lead["temp"] == "hot" and lead["reasons"][0] == "New lead 2 days ago", "a two day old lead is hot before a single text, because speed matters")
    check(score({**base, "Stage": "new lead"}, None, t, lead_age=10)["temp"] == "warm" and score({**base, "Stage": "new lead"}, None, t, lead_age=25)["temp"] in ("lukewarm", "cold"),
          "the lead floor steps down at day 8 and ends at day 15")
    lead_talking = score({**base, "Stage": "new lead"}, {"kw_30": {"buy": 1}, "kw_90": {"buy": 1}, "kw_last": {"buy": d(1)}, "in_30": 2, "out_30": 1,
                                                         "last_inbound": d(1), "last_outbound": d(2), "owes_reply": True}, t, lead_age=2)
    check(lead_talking["temp"] == "hot" and any("waiting on your reply" in r for r in lead_talking["reasons"]), "a new lead who wrote about buying and is waiting on a reply is hot")
    deal = score(base, None, t, deal_stage="under contract", last_touch=d(40))
    check(deal["temp"] == "hot" and deal["heat"] >= 60 and "Live deal" in deal["reasons"][0], "a live deal is hot even with no texts for weeks")
    stale = score({**base, "band": "hot"}, None, t, last_touch=d(300))
    check(stale["temp"] in ("cold", "ice-cold"), "marked hot but silent for 300 days does not stay hot")
    marked = score({**base, "band": "hot"}, {"in_30": 1, "out_30": 1, "in_90": 2, "last_inbound": d(9), "last_outbound": d(8)}, t)
    check(marked["temp"] == "warm" and marked["reasons"][0] == "You marked them hot", "marked hot and in touch is warm: it takes a signal to be hot")
    ghost = score({**base, "band": "warm"}, {"out_90": 4, "out_30": 2, "in_90": 0, "last_outbound": d(6)}, t)
    check(ghost["parts"].get("unanswered") == -10 and ghost["reasons"][0].startswith("No answer to your last 4 texts"), "four texts with no answer cools them and says so first")
    spam = score(base, {"broadcast": True, "kw_30": {"sell": 9}, "kw_90": {"sell": 9}, "kw_last": {"sell": d(1)}, "in_30": 30, "in_90": 90, "last_inbound": d(0)}, t)
    check(spam["temp"] in ("cold", "ice-cold") and "not counted" in spam["reasons"][-1], "a broadcast sender gets no intent or talk points")
    check(score({**base, "Do_Not_Contact": "YES"}, {"kw_30": {"sell": 3}}, t)["status"] == "do-not-contact"
          and score({**base, "Type": "Lender"}, None, t)["status"] == "vendor-agent", "Do Not Contact and vendors are never scored")
    check(score({**base, "Stage": "inactive buyer"}, None, t, last_touch=d(3))["parts"].get("lead") is None, "inactive is not read as active")
    check(score({**base, "Stage": "active buyer"}, None, t, last_touch=d(3))["parts"].get("lead") == 14, "active buyer is a stage in motion")
    nobody = score(base, None, t)
    check(nobody["temp"] == "ice-cold" and nobody["reasons"] == ["Nothing recent on record"], "no record at all is ice-cold with a plain reason")
    check([temp_for(h) for h in (100, 50, 49, 30, 29, 15, 14, 5, 4, 0)] == ["hot", "hot", "warm", "warm", "lukewarm", "lukewarm", "cold", "cold", "ice-cold", "ice-cold"],
          "the five temperatures cut at 50, 30, 15 and 5")
    check(all(0 <= x["heat"] <= 100 for x in (seller, friend, lead_talking, deal, spam, ghost)), "heat stays between 0 and 100")
    same = score(base, {"kw_30": {"sell": 2}, "kw_90": {"sell": 2}, "kw_last": {"sell": d(4)}, "in_30": 4, "out_30": 3, "in_90": 6,
                        "out_90": 5, "last_inbound": d(4), "last_outbound": d(3)}, t)
    check(same == seller, "the same inputs always give the same answer")
    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run_tests() if "--test" in sys.argv else 0)
