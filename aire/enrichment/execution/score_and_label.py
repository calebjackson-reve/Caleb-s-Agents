"""Scoring and labels. One job: CRM row + signals -> score, label, flags. Deterministic, documented, no model.

Labels (one per person, in priority order):
  do-not-contact   Do_Not_Contact is YES. Nothing else matters.
  active-client    Stage says under contract / active, or two or more deal keywords (inspection, appraisal,
                   closing...) in the last 90 days. One mention alone is often a friend saying "congrats on the closing".
  hot-lead         Inbound real estate intent in the last 30 days, or band HOT with inbound in 90 days.
  warm-lead        Real estate intent in the last 90 days, or band WARM with any inbound in 180 days.
  advocate         No intent, but engages: 3+ inbound in 90 days or 3+ social engagements, or a referral keyword.
  past-client      Stage past client with no live intent. Yearly touch.
  nurture          Known person, some history in the last year, no intent.
  dormant          Nothing in or out for a year.
  vendor-agent     Type is vendor, agent or lender. Never on a touch list.
  unknown-identity Phone only, no name, no history. Candidate for the name-recovery pass.

hidden_lead: real estate intent in messages but band is not HOT/WARM and Stage is not a lead stage.
owes_reply: last inbound is newer than last outbound by 2+ days.
"""
from __future__ import annotations
from datetime import date, datetime

INTENT_KW = {"sell", "buy", "move", "rent", "invest"}
DEAL_KW = {"deal"}
VENDOR_TYPES = {"vendor", "agent", "lender", "recruit"}


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
    if dnc:
        label = "do-not-contact"
    elif typ in VENDOR_TYPES:
        label = "vendor-agent"
    elif "under contract" in stage or "active" in stage or (deal >= 2 and li_age is not None and li_age <= 90):
        label = "active-client"
    elif (recent_intent and li_age <= 30) or (band == "HOT" and li_age is not None and li_age <= 90):
        label = "hot-lead"
    elif recent_intent or (band == "WARM" and li_age is not None and li_age <= 180):
        label = "warm-lead"
    elif in_90 >= 3 or social_n >= 3 or referral > 0:
        label = "advocate"
    elif "past client" in stage:
        label = "past-client"
    elif not has_name and in_365 == 0 and not band:
        label = "unknown-identity"
    elif in_365 > 0 or out_90 > 0 or band in ("HOT", "WARM", "NURTURE") or (li_age is not None and li_age <= 365):
        label = "nurture"
    else:
        label = "dormant"

    hidden = recent_intent and band not in ("HOT", "WARM") and "lead" not in stage and label in ("hot-lead", "warm-lead")
    return {
        "person_id": p["person_id"], "display": p.get("display", ""), "signal_score": score, "aire_label": label,
        "last_inbound": last_in, "last_outbound": last_out, "msgs_90d": (msg or {}).get("in_90", 0),
        "emails_90d": (mail or {}).get("in_90", 0), "owes_reply": "YES" if owes else "",
        "social_90d": social_n, "hidden_lead": "YES" if hidden else "",
        "keywords": ";".join(f"{k}:{n}" for k, n in sorted(kws.items(), key=lambda x: -x[1])),
        "name_hints": ";".join((msg or {}).get("name_hints", [])[:3]),
        "band_before": band, "stage_before": stage,
    }
