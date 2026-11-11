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


# ---------------- 2. Call these 10 ----------------

# Vendors, spam and pitches: the sender is selling to Caleb. Kept narrow, so a client who mentions their lender stays.
PITCH = re.compile(r"credit repair|fix (your|my) credit|boost your credit|\bseo\b|marketing (offer|agency|services|package)|"
                   r"(more|exclusive|qualified) (leads|listings|sellers|buyers) for you|lead gen|google (ranking|business profile)|"
                   r"business (funding|line of credit)|merchant (cash|services)|i'?m a (loan officer|lender|mortgage (broker|banker))|as a loan officer|\bnmls\b|"
                   r"our (loan programs|agency)|rates? as low as|partner with (you|your team)|free (demo|trial|audit)|virtual assistant|"
                   r"reply stop|text stop|stop to (opt|end|cancel)|unsubscribe|limited time offer|special promotion", re.I)
DNC = re.compile(r"do[ _-]?not[ _-]?contact|\bdnc\b", re.I)
AMOUNT = re.compile(r"(?:\b(up to|under|below|max|maximum|budget|around|about|over|at least)(?: of| is)?\s+)?"
                    r"(?:\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|mil|million)?\b|\b(\d+(?:\.\d+)?)\s?(k|mil|million)\b)", re.I)
# A figure next to one of these is a cost or a term of a deal, not what someone will pay for a home.
NOT_BUDGET = re.compile(r"repair|roof|hvac|foundation|renovat|remodel|credit|concession|earnest|deposit|commission|closing costs?|down payment|owe|loan|salary|a year", re.I)
CEILING = {"up to", "under", "below", "max", "maximum", "budget"}
TOPICS = [(re.compile(r"multi-?family|duplex|triplex|fourplex|four-?plex", re.I), "multifamily"),
          (re.compile(r"\binvest(or|ment|ing)\b|rental property|cap rate", re.I), "investment"),
          (re.compile(r"home value|what.{0,20}\bworth\b|\bsell(ing)?\b|list (my|our|the|it|this)|listing agreement|put (it|the house|our house) on the market", re.I), "selling"),
          (re.compile(r"\bbuy(ing)?\b|\bpurchase\b|pre-?approv|make an offer|offer on|\bshowing\b|\btour\b|see (it|the house|the home|this one)|"
                      r"looking (for|at|in|to)|still available", re.I), "buying"),
          (re.compile(r"\b(acre(s|age)?|land|lot)\b", re.I), "land")]
DEAL_TALK = re.compile(r"under contract|inspection|apprais|closing|counter ?offer|\bcounter\b|earnest|act of sale|title company|offer accepted", re.I)
MONEY_PTS = [(700_000, 40), (400_000, 34), (200_000, 28), (0, 22)]
TOPIC_PTS, DEAL_PTS, WAIT_BASE, WAIT_MAX = 20, 10, 5, 20
CADENCE_PTS = {"hot": 10, "warm": 7, "lukewarm": 4, "cold": 2, "ice-cold": 1}


def amounts(text: str) -> list[tuple[int, bool]]:
    """Dollar figures a person wrote, as (dollars, is a ceiling). Only $ or k or million forms between $50,000 and
    $20,000,000 count, so a phone number, a date or a $500 repair is never read as a budget."""
    out = []
    for m in AMOUNT.finditer(text or ""):
        num, unit = (m.group(2), m.group(3)) if m.group(2) else (m.group(4), m.group(5))
        v = float(num.replace(",", "")) * {"k": 1e3, "m": 1e6, "mil": 1e6, "million": 1e6}.get((unit or "").lower(), 1)
        near = (text[max(0, m.start() - 12):m.start()] + " | " + text[m.end():m.end() + 30]).lower()
        if NOT_BUDGET.search(near):
            continue
        if 50_000 <= v <= 20_000_000:
            out.append((int(v), (m.group(1) or "").lower() in CEILING))
    return out


def money_words(v: int) -> str:
    return f"${v / 1e6:.1f}M".replace(".0M", "M") if v >= 1_000_000 else f"${round(v / 1000):,}K"


def _text_of(r: dict) -> str:
    return " \n ".join([cc_clean(m) for m in r.get("last_messages") or []] + [str(r.get("next_action") or "")] + [str(x) for x in r.get("reasons") or []])


def cc_clean(m) -> str:
    return re.sub(r"^\d{4}-\d{2}-\d{2}: ", "", str(m or ""))


def skip_reason(r: dict) -> str:
    """Why a person is left off the call list, or '' when they stay."""
    if str(r.get("type") or "").lower() in PARTNER_TYPES:
        return "vendor, agent or lender"
    tags = " ".join(str(r.get(k) or "") for k in ("stage", "type", "opportunity_types", "tags", "band", "next_action"))
    if DNC.search(tags) or str(r.get("do_not_contact") or "").upper() in ("YES", "TRUE", "1"):
        return "Do Not Contact"
    if PITCH.search(_text_of(r)) or cc.is_test_lead(r.get("display")):
        return "spam or a pitch"
    if not _phone(r.get("phone")):
        return "no valid phone"
    return ""


def score_call(r: dict, deals: list[dict], today: date) -> dict:
    text = _text_of(r)
    found = amounts(text)
    deal = next((d for d in deals if str(d.get("person_id") or "") == str(r.get("person_id"))), None)
    price = cc.num(deal.get("price")) if deal else None
    top = max(found, default=None)
    best = top[0] if top else (int(price) if price and price >= 50_000 else 0)
    money = next(p for floor, p in MONEY_PTS if best >= floor) if best else 0
    topic = next((label for rx, label in TOPICS if rx.search(text)), "")
    talk = bool(deal) or bool(DEAL_TALK.search(text))
    new_lead = str(r.get("stage") or "").strip().lower() == "new lead" or bool(r.get("received"))  # a new lead asked for something
    intent = (TOPIC_PTS if topic or new_lead else 0) + (DEAL_PTS if talk else 0)
    waited = None
    if r.get("owes_reply"):
        d = _day(r.get("last_inbound"))
        waited = max(0, (today - d).days) if d else None
    waiting = min(WAIT_MAX, WAIT_BASE + (waited or 0) // 3) if r.get("owes_reply") else 0
    cadence = CADENCE_PTS.get(str(r.get("band") or "").lower(), 0)
    parts = []
    if top:
        parts.append(f"{topic + ' ' if topic else ''}{'up to ' if top[1] else ''}{money_words(top[0])}")
    elif topic:
        parts.append(topic)
    if deal and not top:
        parts.append(f"live deal at {str(deal.get('address') or '').split(',')[0]}" + (f", {money_words(int(price))}" if price and price >= 50_000 else ""))
    elif talk and not deal:
        parts.append("deal talk")
    if new_lead and not topic and not top:
        parts.insert(0, "new lead" + (f", came in {str(r['received'])[:10]}" if r.get("received") else ""))
    if r.get("owes_reply"):
        parts.append("waiting since today" if waited == 0 else f"waiting {waited} day{'' if waited == 1 else 's'}" if waited else "waiting on your reply")
    if not parts:
        q = r.get("days_quiet")
        parts.append(f"{r.get('band') or 'no'} cadence" + (f", quiet {q} day{'' if q == 1 else 's'}" if q is not None else ", never logged"))
    return {"person_id": str(r.get("person_id")), "display": r.get("display") or "", "phone": r.get("phone") or "", "email": r.get("email") or "",
            "band": r.get("band") or "", "stage": r.get("stage") or "", "reason": ", ".join(parts),
            "first": money + intent + waiting, "cadence": cadence, "score": money + intent + waiting + cadence,
            "points": {"money": money, "intent": intent, "waiting": waiting, "cadence": cadence}}


def call10(feed: dict, today: date, done: set | None = None, n: int = 10) -> dict:
    """Ten people, ranked by money and intent first (a stated budget or price, buying or selling words, deal talk, how
    long they have waited on a reply), then by cadence. Vendors, spam, pitches and Do Not Contact never make it."""
    f, by = feed or {}, {}
    heat = f.get("heat") or {}
    for r in (f.get("touches_due") or []) + (heat.get("hot") or []) + (heat.get("warm") or []) + (f.get("new_leads") or []):
        pid = str(r.get("person_id") or "")
        if pid:
            cur = by.setdefault(pid, {})
            for k, v in r.items():
                if v not in ("", None, []) and cur.get(k) in ("", None, []):
                    cur[k] = v
    left, rows = {}, []
    for pid, r in by.items():
        why = "already reached today" if pid in (done or set()) else skip_reason(r)
        if why:
            left[why] = left.get(why, 0) + 1
            continue
        rows.append(score_call(r, f.get("deals") or [], today))
    rows.sort(key=lambda x: (-x["first"], -x["cadence"], x["display"]))
    return {"rows": rows[:n], "considered": len(by), "left_out": left}


