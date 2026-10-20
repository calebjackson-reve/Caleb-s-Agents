"""Scoring and labels. One job: CRM row + signals -> score, temperature, flags. Deterministic, documented, no model.

Temperature (Caleb's scale, 2026-10-20), one per person:
  hot       Live deal (stage under contract or active, or 2+ deal words in 90 days), or real estate intent in
            their own words in the last 30 days, or band HOT with a text in the last 90 days (or band HOT when no
            message signals are loaded at all, since Caleb's band is then the best evidence).
  warm      Intent in the last 90 days, or band WARM with a text in the last 180 days (same no-signal rule).
  lukewarm  Engages without intent: 3+ inbound in 90 days, 3+ social actions, a referral mention, a past client,
            or any contact in the last 180 days.
  cold      Known person, something in the last year, or band NURTURE, but quiet for 6 months or more.
  ice-cold  Nothing in or out for a year, or a phone number with no name and no history.

status (separate from temperature, so nobody warm gets contacted by mistake):
  ok, do-not-contact (Do_Not_Contact is YES), vendor-agent (Type vendor, agent, lender, recruit).

due: they are owed a touch now. True when they texted last and 2+ days passed (owes_reply), or their last
     contact is older than the cadence for their temperature: hot 7 days, warm 14, lukewarm 30, cold 90, ice-cold 365.
hidden_lead: their own words show intent but the CRM band was not HOT or WARM.
"""
from __future__ import annotations
from datetime import date, datetime

INTENT_KW = {"sell", "buy", "move", "rent", "invest"}
DEAL_KW = {"deal"}
VENDOR_TYPES = {"vendor", "agent", "lender", "recruit"}
CADENCE = {"hot": 7, "warm": 14, "lukewarm": 30, "cold": 90, "ice-cold": 365}


def days_since(iso: str, as_of: date) -> int | None:
    if not iso:
        return None
    try:
        return (as_of - datetime.strptime(iso[:10], "%Y-%m-%d").date()).days
    except ValueError:
        return None


def score_person(p: dict, msg: dict | None, mail: dict | None, soc: dict | None, as_of: date) -> dict:
    sigs = [s for s in (msg, mail) if s]
    in_30 = sum(s.get("in_30", 0) for s in sigs)
    in_90 = sum(s.get("in_90", 0) for s in sigs)
    in_365 = sum(s.get("in_365", 0) for s in sigs)
    out_90 = sum(s.get("out_90", 0) for s in sigs)
    last_in = max((s.get("last_inbound", "") for s in sigs), default="")
    last_out = max((s.get("last_outbound", "") for s in sigs), default="")
    kws: dict[str, int] = {}
    for s in sigs:
        for k, n in s.get("keyword_hits", {}).items():
            kws[k] = kws.get(k, 0) + n
    social = soc.get("social_weight_90d", 0) if soc else 0
    social_n = soc.get("social_90d", 0) if soc else 0
    li_age = days_since(last_in, as_of)
    intent = sum(kws.get(k, 0) for k in INTENT_KW)
    deal = sum(kws.get(k, 0) for k in DEAL_KW)
    referral = kws.get("referral", 0)
    life = kws.get("life", 0)
    band = (p.get("band") or "").upper()
    stage = (p.get("Stage") or "").lower()
    typ = (p.get("Type") or "").lower()
    dnc = (p.get("Do_Not_Contact") or "").upper() == "YES"
    has_name = bool((p.get("first") or p.get("last") or "").strip()) and (p.get("name_tier") or "") != "none"

    score = 0
    score += min(in_30, 10) * 6 + min(in_90, 20) * 2 + min(in_365, 40)
    score += min(intent, 5) * 12 + min(deal, 5) * 8 + referral * 10 + life * 4
    score += min(social, 30) * 2
    score += {"HOT": 25, "WARM": 12, "NURTURE": 4}.get(band, 0)
    if li_age is not None:
        score += max(0, 30 - li_age) if li_age <= 30 else 0
    if (p.get("homestead") or "") == "True" and p.get("fair_market_value"):
        score += 5  # owns a home we know the value of: equity review candidate
    owes = bool(last_in) and last_in > last_out and (li_age or 0) >= 2 and (li_age or 0) <= 60

    recent_intent = intent > 0 and li_age is not None and li_age <= 90
    last_any = max(last_in, last_out) or (p.get("Last_Touch") or "")[:10]
    any_age = days_since(last_any, as_of)
    no_signals = not sigs
    status = "do-not-contact" if dnc else "vendor-agent" if typ in VENDOR_TYPES else "ok"
    # With no message history loaded, Caleb's own band is the best evidence we have and it drives the label.
    if "under contract" in stage or "active" in stage or (deal >= 2 and li_age is not None and li_age <= 90) \
            or (recent_intent and li_age <= 30) or (band == "HOT" and (no_signals or (li_age is not None and li_age <= 90))):
        label = "hot"
    elif recent_intent or (band == "WARM" and (no_signals or (li_age is not None and li_age <= 180))):
        label = "warm"
    elif in_90 >= 3 or social_n >= 3 or referral > 0 or "past client" in stage or (any_age is not None and any_age <= 180):
        label = "lukewarm"
    elif in_365 > 0 or out_90 > 0 or band in ("HOT", "WARM", "NURTURE") or (any_age is not None and any_age <= 365):
        label = "cold"
    else:
        label = "ice-cold"
    if status != "ok":
        due = False
    else:
        cadence = CADENCE[label]
        due = owes or any_age is None and label in ("hot", "warm") or (any_age is not None and any_age >= cadence)

    hidden = recent_intent and band not in ("HOT", "WARM") and "lead" not in stage and label in ("hot", "warm")
    return {
        "person_id": p["person_id"], "display": p.get("display", ""), "signal_score": score, "aire_label": label,
        "status": status, "due": "YES" if due else "",
        "last_inbound": last_in, "last_outbound": last_out, "msgs_90d": (msg or {}).get("in_90", 0),
        "emails_90d": (mail or {}).get("in_90", 0), "owes_reply": "YES" if owes else "",
        "social_90d": social_n, "hidden_lead": "YES" if hidden else "",
        "keywords": ";".join(f"{k}:{n}" for k, n in sorted(kws.items(), key=lambda x: -x[1])),
        "name_hints": ";".join((msg or {}).get("name_hints", [])[:3]),
        "band_before": band, "stage_before": stage,
    }
