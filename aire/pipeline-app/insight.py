"""Who to reach first, and what the record says about them. Pure functions over the CRM feed and the Command Center
reads, so every number on screen traces to a source and a missing one stays "unknown".

  lead_cards   the New leads card on Home: who, where from, what they asked, a first text ready to check
  call10       the ten people to call today, with the reason in a few words
  card         the fuller contact card: assessment, equity, years owned, source, last deal, household, completeness
  seller       the likely-seller score, 0 to 100, with its reasons
  formula      the rules above in words, built from the same numbers the code uses (Sources page)

Nothing here sends, dials or writes. Caleb's rule (2026-11-11): never show a number that is not in a source.
"""
from __future__ import annotations

import re
from datetime import date, datetime

import cc

ME = "Caleb Jackson with Keller Williams First Choice"
EMAIL_FOOT = "\n\nCaleb Jackson\nKeller Williams First Choice\n(225) 747-0303\n\nIf you would rather not get emails from me, reply and tell me, and I will stop."
PARTNER_TYPES = {"agent", "lender", "vendor", "recruit"}


def _phone(v) -> str:
    d = re.sub(r"\D", "", str(v or ""))
    d = d[1:] if len(d) == 11 and d[0] == "1" else d
    return "+1" + d if re.fullmatch(r"[2-9]\d{2}[2-9]\d{6}", d) else ""


def _email(v) -> str:
    v = str(v or "").strip()
    return v if re.fullmatch(r"[^\s@<>,;]+@[^\s@<>,;]+\.[A-Za-z]{2,}", v) else ""


def _day(v) -> date | None:
    try:
        return date.fromisoformat(str(v or "")[:10])
    except ValueError:
        return None


# ---------------- 1. Speed to lead ----------------

def form_type(r: dict) -> str:
    """The form's own Type cell from a Luxury Presence lead email ("Overview Type Home Valuation Source https://..."),
    read from the email preview. Empty when the email has none."""
    m = re.search(r"\bOverview\s+Type\s+(.{2,40}?)\s+Source\b", str(r.get("snippet") or ""))
    return m.group(1).strip() if m else ""


def is_home_value(r: dict) -> bool:
    return bool(re.search(r"home valu", " ".join(str(r.get(k) or "") for k in ("source", "subject")) + " " + form_type(r), re.I))


def own_words(r: dict) -> str:
    f = {str(k).strip().lower(): str(v).strip() for k, v in (r.get("fields") or []) if v}
    return (str(r.get("message") or "").strip() or f.get("message") or f.get("comments") or f.get("question") or "")[:160]


def asked(r: dict) -> str:
    """What the lead asked: their own words when the form carried any, else the listing, the home value address or the
    form's type. Empty means unknown, never a guess."""
    f = {str(k).strip().lower(): str(v).strip() for k, v in (r.get("fields") or []) if v}
    if own_words(r):
        return own_words(r)
    if f.get("listing"):
        return "Asked about " + f["listing"][:120]
    if re.search(r"home value", str(r.get("source") or ""), re.I) and (r.get("address") or f.get("address")):
        return "Home value for " + str(r.get("address") or f["address"])[:120]
    if re.search(r"smart actions to review", str(r.get("snippet") or ""), re.I) and is_home_value(r):
        return "Home value request from someone on your contacts list. The email does not say who."
    return f"{form_type(r)}, on the website" if form_type(r) else ""


def first_text(r: dict) -> dict:
    """The first reply, ready to check: a text when there is a valid phone and the form did not say no to texts,
    otherwise an email. Says who Caleb is and his brokerage, promises nothing."""
    f = {str(k).strip().lower(): str(v).strip() for k, v in (r.get("fields") or []) if v}
    first = (str(r.get("name") or "").split() or ["there"])[0]
    first = "there" if first.lower() in ("website", "lead") else first
    listing = f.get("listing", "")
    if is_home_value(r):
        subject, body = "Your home value request", f"Hi {first}, this is {ME}. I got your home value request. Want me to pull the recent sales near you so the number is real, not a guess?"
    elif listing:
        subject, body = f"About {listing}", f"Hi {first}, this is {ME}. Thanks for asking about {listing}. Want me to check that it is still available and set up a time to see it?"
    else:
        subject, body = "Thanks for reaching out", f"Hi {first}, this is {ME}. Thanks for reaching out on my site. What would be most helpful for you right now?"
    no_text = any("text" in k and re.match(r"(no|false|unchecked|off)\b", v, re.I) for k, v in f.items())
    phone, email = _phone(r.get("phone")), _email(r.get("email"))
    if phone and not (no_text and email):
        return {"kind": "text", "to": phone, "subject": "", "body": body, "blocked": "The form said not to text them, and there is no email" if no_text else ""}
    if email:
        return {"kind": "email", "to": email, "subject": subject, "body": body + EMAIL_FOOT, "blocked": ""}
    return {"kind": "", "to": "", "subject": "", "body": body, "blocked": "No phone or email on this lead"}


def _timed(rec: str) -> bool:
    """True when the lead carries a real clock time the timer can count from."""
    try:
        return len(rec) > 10 and bool(datetime.fromisoformat(rec))
    except ValueError:
        return False


def lead_key(r: dict) -> str:
    pid = (r.get("crm") or {}).get("person_id")
    return str(r.get("threadId") or (f"crm:{pid}" if pid else f"{r.get('name')}|{r.get('received')}"))


def lead_cards(leads: list[dict]) -> list[dict]:
    """Leads with no reply yet, newest first, from the one lead list (cc.merge_leads: website lead emails and new CRM
    contacts). `timed` is false when the source gave a day and no clock time, so the screen shows no timer for it."""
    out = []
    for r in leads or []:
        if (r.get("due") or {}).get("level") == "done":
            continue
        c = r.get("crm") or {}
        rec = str(r.get("received") or "")
        out.append({"key": lead_key(r), "name": r.get("name") or "", "source": r.get("source") or "", "asked": asked(r), "own_words": bool(own_words(r)),
                    "received": rec, "timed": _timed(rec), "phone": r.get("phone") or "", "email": r.get("email") or "",
                    "person_id": str(c.get("person_id") or ""), "in_crm": bool(c.get("person_id")), "origin": r.get("origin") or "",
                    "draft": first_text(r)})
    return out


def alert_text(card: dict) -> str:
    """The one line Caleb gets on his own phone."""
    return f"New lead: {card.get('name') or 'no name on the form'}, {card.get('asked') or 'they did not say what they need'}"[:220]


MAX_ALERTS = 3  # per pass. A burst (a first read landing late, a bad read) never becomes a flood of texts.


def new_lead_alerts(cards: list[dict], state: dict, ready: bool = True) -> tuple[list[dict], dict]:
    """Leads not alerted before, at most MAX_ALERTS a pass. The first pass only learns who is already there, so a
    restart never re-alerts, and it only counts as that first pass once the lead read exists (ready). Everything seen
    is remembered in the order it came, newest last, so trimming drops the oldest."""
    seen = list(state.get("seen") or [])
    have = set(seen)
    fresh = [c for c in cards if c["key"] not in have]
    primed = bool(state.get("primed"))
    if not primed and not ready:
        return [], {"primed": False, "seen": seen}
    out = fresh[:MAX_ALERTS] if primed else []
    return out, {"primed": True, "seen": (seen + [c["key"] for c in fresh])[-2000:]}


