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


def side_word(side) -> str:
    """The Deals sheet's Side column as the word Pipeline shows: Listing is selling, Buyer is buying. Both, dual or
    blank has no single word, so it is empty and the caller keeps whatever it had."""
    s = str(side or "").strip().lower()
    return "selling" if s.startswith("list") else "buying" if s.startswith("buy") else ""


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


def waiting_since(r: dict) -> date | None:
    """The day their wait began: the first message of theirs that Caleb has not answered. His last answer is the newer
    of his last text and his last logged touch. A message on that same day counts as unanswered, since the feed has
    days, not clock times. The feed carries their last three texts, so the wait can only be traced back that far."""
    last = _day(r.get("last_inbound"))
    answered = max((d for d in (_day(r.get("last_outbound")), _day(r.get("last_touch"))) if d and (not last or d <= last)), default=None)
    days = sorted(d for d in (_day(str(m)[:10]) for m in r.get("last_messages") or []) if d and (not answered or d >= answered))
    return days[0] if days else last


def score_call(r: dict, deals: list[dict], today: date, weights: dict | None = None) -> dict:
    text = _text_of(r)
    found = amounts(text)
    deal = next((d for d in deals if str(d.get("person_id") or "") == str(r.get("person_id"))), None)
    price = cc.num(deal.get("price")) if deal else None
    top = max(found, default=None)
    best = top[0] if top else (int(price) if price and price >= 50_000 else 0)
    money = next(p for floor, p in MONEY_PTS if best >= floor) if best else 0
    topic = next((label for rx, label in TOPICS if rx.search(text)), "")
    # On a deal that is not closed the sheet's Side decides the word shown, even when the texts guessed the other way
    # (a seller who texts about a showing is still selling) or said nothing. Scoring still reads `topic`, so this never moves a rank.
    label = r["deal_side"] if r.get("deal_side") and topic in ("buying", "selling", "") else topic
    talk = bool(deal) or bool(DEAL_TALK.search(text))
    new_lead = str(r.get("stage") or "").strip().lower() == "new lead" or bool(r.get("received"))  # a new lead asked for something
    intent = (TOPIC_PTS if topic or new_lead else 0) + (DEAL_PTS if talk else 0)
    waited = None
    if r.get("owes_reply"):
        d = waiting_since(r)
        waited = max(0, (today - d).days) if d else None
    waiting = min(WAIT_MAX, WAIT_BASE + (waited or 0) // 3) if r.get("owes_reply") else 0
    cadence = CADENCE_PTS.get(str(r.get("band") or "").lower(), 0)
    frac = {"money": money / CALL_MAX["money"], "intent": intent / CALL_MAX["intent"], "waiting": waiting / CALL_MAX["waiting"], "cadence": cadence / CALL_MAX["cadence"]}
    money, intent, waiting, cadence = (scaled(v, k, CALL_MAX, weights) for k, v in (("money", money), ("intent", intent), ("waiting", waiting), ("cadence", cadence)))
    parts = []
    if top:
        parts.append(f"{label + ' ' if label else ''}{'up to ' if top[1] else ''}{money_words(top[0])}")
    elif label:
        parts.append(label)
    if deal and not top:
        parts.append(f"live deal at {str(deal.get('address') or '').split(',')[0]}" + (f", {money_words(int(price))}" if price and price >= 50_000 else ""))
    elif talk and not deal:
        parts.append("deal talk")
    if new_lead and not label and not top:
        parts.insert(0, "new lead" + (f", came in {str(r['received'])[:10]}" if r.get("received") else ""))
    if r.get("owes_reply"):
        parts.append("waiting since today" if waited == 0 else f"waiting {waited} day{'' if waited == 1 else 's'}, since {d.strftime('%b')} {d.day}" if waited else "waiting on your reply")
    if not parts:
        q = r.get("days_quiet")
        parts.append(f"{r.get('band') or 'no'} cadence" + (f", quiet {q} day{'' if q == 1 else 's'}" if q is not None else ", never logged"))
    return {"person_id": str(r.get("person_id")), "display": r.get("display") or "", "phone": r.get("phone") or "", "email": r.get("email") or "",
            "band": r.get("band") or "", "stage": r.get("stage") or "", "reason": ", ".join(parts),
            "first": money + intent + waiting, "cadence": cadence, "score": money + intent + waiting + cadence,
            "points": {"money": money, "intent": intent, "waiting": waiting, "cadence": cadence}, "fractions": frac}


def call10(feed: dict, today: date, done: set | None = None, n: int = 10, weights: dict | None = None) -> dict:
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
        rows.append(score_call(r, f.get("deals") or [], today, weights))
    rows.sort(key=lambda x: (-x["first"], -x["cadence"], x["display"]))
    return {"rows": rows[:n], "considered": len(by), "left_out": left}


# ---------------- 3 and 4. The fuller card and the likely-seller score ----------------

# Life events that score: a job move or an estate, and nothing else. Fair housing (Caleb, 2026-11-11): family status,
# age, race, religion and disability are never used, and neither are words that stand in for them. So household size
# (more room, outgrew, bigger house) and downsizing are left out too, and a note that mentions family or age at all is
# skipped whole, even when it also names a job move.
LIFE = re.compile(r"new job|job (offer|change|transfer|move)|relocat|(being|getting|got) transferred|transferr?(ed|ing) to\b|"
                  r"estate sale|settling the estate|probate|inherit", re.I)
PROTECTED_WORDS = re.compile(r"bab(y|ies)|pregnan|expecting|newborn|twins|marri(ed|age)|wedding|engaged|fianc|divorc|separat|retir|empty nest|"
                             r"kids?\b|child|grand|widow|husband|wife|spouse|mother|father|\bmom\b|\bdad\b|\bson\b|daughter|in-?law|famil|"
                             r"passed away|\blate (husband|wife|mother|father)|\bage\b|\baged\b|years old|\bam \d\d\b|\bis \d\d\b|elderly|senior|"
                             r"disab|wheelchair|illness|church|relig|pastor", re.I)


def life_note(notes) -> dict | None:
    """The newest note that names a job move or an estate and says nothing about family, age, faith or health."""
    return next((n for n in notes or [] if LIFE.search(str(n.get("note") or "")) and not PROTECTED_WORDS.search(str(n.get("note") or ""))), None)


SELLER_MAX = {"years": 30, "equity": 20, "life": 20, "activity": 15, "past": 15, "anniversary": 0}
SELLER_FROM = {"years": "sales record and Deals", "equity": "no source", "life": "Notes", "activity": "lead emails, Flexmls and texts", "past": "CRM sheet and Deals",
               "anniversary": "sales record and Deals"}
CALL_MAX = {"money": 40, "intent": 30, "waiting": 20, "cadence": 10}
YEARS_PTS = [(7, 30), (5, 20), (3, 10)]
EQUITY_PTS = [(0.5, 20), (0.3, 12)]
ACTIVITY_PTS = {"home_value": 15, "repeat": 10, "one": 8}
FIELDS = [("phone", "Phone"), ("email", "Email"), ("value", "Home value"), ("equity", "Equity"), ("years", "Years owned"),
          ("source", "Lead source"), ("deal", "Last deal with you"), ("household", "Household")]


def scaled(points: float, key: str, base: dict, weights: dict | None) -> int:
    """A part's points under the current weights. With no learned weights this is the hand-set number."""
    return int(round(points if not weights else points / base[key] * weights.get(key, base[key])))


def _house(t) -> str:
    m = re.match(r"\s*(\d+)", str(t or ""))
    return m.group(1) if m else ""


def same_home(a, b) -> bool:
    """The same house: equal house numbers and the same street name."""
    return bool(_house(a)) and _house(a) == _house(b) and cc._same_street(str(a), str(b))


def _index(rows: list[dict], key: str) -> dict:
    out: dict = {}
    for r in rows or []:
        out.setdefault(_house(r.get(key)), []).append(r)
    return out


def load_mail_signals(path=None) -> dict:
    """The optional gmail-signals.json that gmail_signals.py writes ({email: {last_inbound, last_outbound, ...}}). A read
    and nothing else: no Gmail call, nothing written. Missing or unreadable means {} and email is simply skipped."""
    import json
    import os
    from pathlib import Path
    cands = [Path(path)] if path else [Path(os.environ["AIRE_GMAIL_SIGNALS"])] if os.environ.get("AIRE_GMAIL_SIGNALS") else \
        [Path(__file__).resolve().parent.parent / "enrichment" / "out" / "gmail-signals.json"]
    for c in cands:
        try:
            d = json.loads(c.read_text())
            return {str(k).strip().lower(): v for k, v in d.items() if isinstance(v, dict)} if isinstance(d, dict) else {}
        except (OSError, ValueError):
            pass
    return {}


def last_touch(p: dict, deals: list[dict], today: date, mail: dict | None = None) -> dict | None:
    """The latest of: the sheet's Last_Touch, the last 1:1 iMessage (the feed's last_inbound / last_outbound), the last
    1:1 email (gmail-signals), and the last closed deal. Display only, never written back. Group chats are already
    dropped upstream (imessage_signals.GROUP_MIN_PEOPLE), so this only takes dates from those signals and has no chat
    parser. Dates after today and empty sources are skipped. Ties keep the order sheet, iMessage, email, close."""
    em = str(p.get("email") or "").strip().lower()
    ms = (mail or {}).get(em) or {} if em else {}
    cands = [("CRM sheet", p.get("last_touch")),
             ("iMessage", p.get("last_inbound")), ("iMessage", p.get("last_outbound")),
             ("email", ms.get("last_inbound")), ("email", ms.get("last_outbound"))]
    cands += [("closed sale", d.get("day")) for d in deals if "closed" in str(d.get("status") or "")]
    best = None
    for src, v in cands:
        d = _day(v)
        if d and d <= today and (best is None or d > best[0]):
            best = (d, src)
    return {"day": best[0].isoformat(), "from": best[1], "days_ago": (today - best[0]).days} if best else None


class Book:
    """The reads the card and the score need, indexed once: the feed, the AIRE Deals sheet rows and the sales record."""

    def __init__(self, feed: dict, deals_sheet: list[dict] | None = None, sales: list[dict] | None = None,
                 leads: list[dict] | None = None, today: date | None = None, weights: dict | None = None,
                 mail_signals: dict | None = None):
        f = feed or {}
        self.mail_signals = mail_signals  # None: read the optional gmail-signals.json on first use
        self.weights = weights
        # Flexmls listings that expired or were withdrawn, by house number: someone who tried to sell and did not.
        self.off_market = _index([m for m in (f.get("market") or {}).get("rows") or [] if m.get("type") in ("expired", "withdrawn")], "address")
        self.today = today or cc.central_today()
        self.facts = f.get("facts") or {}
        self.has_facts = "facts" in f
        self.people = {str(p.get("person_id")): p for p in f.get("people") or []}
        for r in (f.get("touches_due") or []) + (f.get("new_leads") or []):  # a feed with no people list still knows these
            self.people.setdefault(str(r.get("person_id")), {**r, "has_phone": bool(r.get("phone")), "has_email": bool(r.get("email"))})
        # feed.people often has has_email but not the address; pins and due rows carry it. Fill so last_touch can use gmail-signals.
        for r in ((f.get("map") or {}).get("pins") or []) + (f.get("touches_due") or []) + (f.get("new_leads") or []):
            pid, em = str(r.get("person_id") or ""), str(r.get("email") or "").strip()
            cur = self.people.get(pid)
            if pid and em and cur is not None and not str(cur.get("email") or "").strip():
                cur["email"] = em
        heat = f.get("heat") or {}
        self.reasons = {str(r.get("person_id")): r.get("reasons") or [] for r in (heat.get("hot") or []) + (heat.get("warm") or [])}
        self.sheet, self.sales = _index(deals_sheet or [], "deal"), _index(sales or [], "address")
        self.forms: dict = {}
        for r in leads or []:
            pid = (r.get("crm") or {}).get("person_id")
            if pid and r.get("origin") == "email":
                self.forms.setdefault(str(pid), []).append(r)

    def person(self, pid: str) -> dict | None:
        p, fx = self.people.get(str(pid)), self.facts.get(str(pid))
        return {**(p or {}), **(fx or {})} if p or fx else None

    def deals_for(self, pid: str, street: str) -> list[dict]:
        """Every deal on record for this person or this house, newest first: the CRM Deals tab (by person), the AIRE
        Deals sheet and the sales record (by house number and street)."""
        out, seen = [], set()
        for d in (self.facts.get(str(pid)) or {}).get("deals") or []:
            if d.get("record") == "AIRE Deals sheet":  # links.apply_records: this CRM row says what the one deal record says
                seen.add(cc.deal_key(d.get("address")))
                out.append({"address": d.get("address") or "", "side": str(d.get("side") or "").lower(),
                            "status": "closed" if d.get("stage") == "closed" else "offer expired" if d.get("expired_offer") else str(d.get("status") or "").lower(),
                            "day": str(d.get("expected_close") or "")[:10], "price": cc.num(d.get("price")), "from": "AIRE Deals sheet",
                            "here": same_home(d.get("address"), street)})
                continue
            out.append({"address": d.get("address") or "", "side": str(d.get("side") or "").lower(), "status": str(d.get("stage") or "").replace("_", " "),
                        "day": str(d.get("expected_close") or d.get("updated_at") or "")[:10], "price": cc.num(d.get("price")), "from": "CRM Deals tab",
                        "here": same_home(d.get("address"), street)})
        h = _house(street)
        for d in self.sheet.get(h, []) if h else []:
            if same_home(d.get("deal"), street) and cc.deal_key(d.get("deal")) not in seen:
                out.append({"address": d["deal"], "side": str(d.get("side") or "").lower(), "status": str(d.get("status") or "").lower(),
                            "day": str(d.get("act") or "")[:10], "price": d.get("price"), "from": "AIRE Deals sheet", "here": True})
        for d in self.sales.get(h, []) if h else []:
            if same_home(d.get("address"), street):
                out.append({"address": d["address"], "side": str(d.get("side") or "").lower(), "status": "lease closed" if "lease" in str(d.get("type") or "").lower() else "closed",
                            "day": str(d.get("close") or "")[:10], "price": cc.num(d.get("price")), "from": "sales record", "here": True})
        return sorted(out, key=lambda d: d["day"] if _day(d["day"]) else "", reverse=True)

    def mail(self) -> dict:
        if self.mail_signals is None:
            self.mail_signals = load_mail_signals()
        return self.mail_signals

    def last_touch(self, p: dict, deals: list[dict]) -> dict | None:
        return last_touch(p, deals, self.today, self.mail())

    def years_owned(self, deals: list[dict]) -> dict | None:
        """Years since they bought this house with Caleb: a closed buyer side at their own address. Nothing else in
        the sheet says when a home was bought, so everyone else is unknown."""
        for d in deals:
            day = _day(d["day"])
            if day and day <= self.today and d["here"] and d["status"] == "closed" and d["side"] in ("buyer", "both"):
                return {"years": int((self.today - day).days // 365.25), "since": d["day"], "from": d["from"]}
        return None

    def seller(self, pid: str, p: dict | None = None, deals: list[dict] | None = None) -> dict | None:
        """0 to 100 for a homeowner (someone with a street address on the sheet). None for anyone else."""
        p = p or self.person(pid)
        if not p or not _house(p.get("street")) or str(p.get("type") or "").lower() in PARTNER_TYPES:
            return None
        deals = self.deals_for(pid, p.get("street")) if deals is None else deals
        parts = []
        yo = self.years_owned(deals)
        pts = next((v for floor, v in YEARS_PTS if yo and yo["years"] >= floor), 0)
        parts.append(("years", pts, f"Owned {yo['years']} year{'' if yo['years'] == 1 else 's'}, bought with you {yo['since']}" if yo else "Years owned unknown", yo["from"] if yo else ""))
        parts.append(("equity", 0, "Equity unknown: no mortgage balance in any source", ""))
        note = life_note(p.get("notes"))
        parts.append(("life", SELLER_MAX["life"] if note else 0, f"Note {note['at']}: {str(note['note'])[:70]}" if note else "No job move or estate in the notes of the last 12 months", "Notes" if note else ""))
        forms = self.forms.get(str(pid), [])
        hv = next((r for r in forms if is_home_value(r)), None)
        selling = next((r for r in self.reasons.get(str(pid), []) if re.search(r"\bsell", str(r), re.I)), None)
        off = next((m for m in sorted(self.off_market.get(_house(p.get("street")), []), key=lambda m: str(m.get("date") or ""), reverse=True)
                    if same_home(m.get("address"), p.get("street"))), None)
        if off:
            act = (SELLER_MAX["activity"], f"Their listing {'expired' if off.get('type') == 'expired' else 'was withdrawn'} {off.get('date') or ''}".strip(), off.get("source") or "Flexmls")
        elif hv:
            act = (ACTIVITY_PTS["home_value"], f"Asked for a home value on the site {str(hv.get('received') or '')[:10]}".strip(), "lead emails")
        elif len(forms) >= 2:
            act = (ACTIVITY_PTS["repeat"], f"{len(forms)} website forms in the last 14 days", "lead emails")
        elif forms:
            act = (ACTIVITY_PTS["one"], f"Sent a website form {str(forms[0].get('received') or '')[:10]}".strip(), "lead emails")
        elif selling:
            act = (ACTIVITY_PTS["one"], str(selling), "texts")
        else:
            act = (0, "No website form, expired listing or selling talk on record", "")
        parts.append(("activity", *act))
        past = str(p.get("stage") or "").strip().lower() == "past client" or any("closed" in d["status"] for d in deals)
        parts.append(("past", SELLER_MAX["past"] if past else 0, "Past client" if past else "Not a past client on record", "CRM sheet and Deals" if past else ""))
        ann = None
        if yo and yo["years"] >= 1:
            d0 = _day(yo["since"])
            near = [d0.replace(year=y) for y in (self.today.year - 1, self.today.year, self.today.year + 1) if not (d0.month == 2 and d0.day == 29)]
            ann = next((d for d in near if abs((d - self.today).days) <= 30), None)
        parts.append(("anniversary", 1 if ann else 0, f"Home anniversary {ann.isoformat()}" if ann else "No home anniversary within 30 days", yo["from"] if ann else ""))
        # fractions are what the learning loop reads: each part from 0 to 1, whatever the weights are
        frac = {k: (v / SELLER_MAX[k] if SELLER_MAX[k] else float(v)) for k, v, _, _ in parts}
        w = self.weights or SELLER_MAX
        rows = [{"key": k, "points": int(round(frac[k] * w.get(k, 0))), "max": int(round(w.get(k, 0))), "why": why, "from": src} for k, _, why, src in parts]
        top = sorted((r for r in rows if r["points"]), key=lambda r: -r["points"])[:2]
        return {"score": min(100, sum(r["points"] for r in rows)), "reasons": [r["why"] for r in top], "sources": [r["from"] for r in top],
                "parts": rows, "fractions": frac}

    def card(self, pid: str) -> dict:
        """The eight facts with their sources, how many are known, and the seller score. A fact with no source is None,
        which the screen prints as unknown."""
        p = self.person(pid)
        if not p:
            return {"ok": False, "person_id": str(pid), "error": "This person is not in the CRM feed right now."}
        fx = self.facts.get(str(pid)) or {}
        deals = self.deals_for(pid, p.get("street"))
        fmv, yo, last = cc.num(fx.get("fair_market_value")), self.years_owned(deals), deals[0] if deals else None
        no_facts = "" if self.has_facts else "The feed on this Mac does not carry this yet"
        val = {
            "phone": ("On the sheet", "CRM sheet") if p.get("has_phone") else None,
            "email": ("On the sheet", "CRM sheet") if p.get("has_email") else None,
            "value": (f"${int(fmv):,}", "parish assessment") if fmv else None,
            "equity": None,
            "years": (f"{yo['years']} year{'' if yo['years'] == 1 else 's'}, since {yo['since']}", f"bought with you, {yo['from']}") if yo else None,
            "source": (str(fx["source"]), "CRM sheet") if fx.get("source") else None,
            "deal": (", ".join(x for x in (last["address"], ("" if "closed" in last["status"] else side_word(last["side"])) or last["side"], last["status"], last["day"]) if x), last["from"]) if last else None,
            "household": (", ".join(fx["household"]), "same address on the CRM sheet") if fx.get("household") else None,
        }
        why = {"equity": "no mortgage balance in any source", "years": "no purchase date on the sheet, and no closed purchase with you at this address",
               "deal": "no deal on the Deals tab, the Deals sheet or the sales record", "household": "nobody else at this address on the sheet"}
        facts = [{"key": k, "label": label, "value": val[k][0] if val[k] else None, "from": val[k][1] if val[k] else "",
                  "why": "" if val[k] else (no_facts if k in ("value", "source", "household") and no_facts else why.get(k, "not on the sheet"))} for k, label in FIELDS]
        return {"ok": True, "person_id": str(pid), "facts": facts, "known": sum(1 for x in facts if x["value"]), "total": len(facts),
                "seller": self.seller(pid, p, deals), "homeowner": bool(_house(p.get("street"))),
                "last_touch": self.last_touch(p, deals)}

    def sellers(self, n: int = 25) -> list[dict]:
        """The top n homeowners by score, highest first. A score of 0 is never listed."""
        out = []
        for pid in set(self.people) | set(self.facts):
            p = self.person(pid)
            s = self.seller(pid, p)
            if s and s["score"] > 0:
                out.append({"person_id": pid, "display": p.get("display") or "", "city": p.get("city") or "", "stage": p.get("stage") or "",
                            "band": p.get("band") or "", "score": s["score"], "reasons": s["reasons"], "sources": s["sources"], "fractions": s["fractions"]})
        return sorted(out, key=lambda r: (-r["score"], r["display"]))[:n]


def formula() -> dict:
    """The rules in words, written from the numbers above so the Sources page can never drift from the code."""
    steps = lambda rows, unit: ", ".join(f"{unit(f)} scores {p}" for f, p in rows)
    return {
        "seller": {"max": sum(SELLER_MAX.values()), "who": "Homeowners only: a contact with a street address on the CRM sheet who is not an agent, lender or vendor.",
                   "parts": [
                       {"label": "Years owned", "max": SELLER_MAX["years"], "rule": steps(YEARS_PTS, lambda y: f"{y}+ years") + ". Counted from a closed purchase with you at their address. Unknown scores 0."},
                       {"label": "Equity", "max": SELLER_MAX["equity"], "rule": steps(EQUITY_PTS, lambda e: f"{int(e * 100)}%+ of the parish assessment") + ". No source carries a mortgage balance today, so this is unknown and scores 0 for everyone."},
                       {"label": "Job move or estate in Notes", "max": SELLER_MAX["life"], "rule": f"A note in the last 12 months about a new job, relocating or an estate scores {SELLER_MAX['life']}. A note that mentions family, age, faith or health is skipped whole and never read for the score."},
                       {"label": "Site visits and lead activity", "max": SELLER_MAX["activity"], "rule": f"A Flexmls listing of theirs that expired or was withdrawn scores {SELLER_MAX['activity']}. A home value request in the last 14 days scores {ACTIVITY_PTS['home_value']}, two or more website forms {ACTIVITY_PTS['repeat']}, one form or selling words in their texts {ACTIVITY_PTS['one']}. Page views are not in any source."},
                       {"label": "Past client", "max": SELLER_MAX["past"], "rule": f"Stage past client, or a closed deal with you, scores {SELLER_MAX['past']}."},
                       {"label": "Home anniversary", "max": SELLER_MAX["anniversary"], "rule": "Within 30 days of the date they bought with you. It adds nothing yet. The weekly learning may give it weight once outcomes show it matters."}]},
        "call10": {"parts": [
            {"label": "Money", "max": MONEY_PTS[0][1], "rule": "A budget or price they wrote, or the price on their live deal: " + ", ".join(f"{money_words(f) if f else 'any amount from $50K'}{'+' if f else ''} scores {p}" for f, p in MONEY_PTS) + "."},
            {"label": "Intent", "max": TOPIC_PTS + DEAL_PTS, "rule": f"Buying, selling, multifamily, investment or land words, or a new lead, score {TOPIC_PTS}. A live deal or contract talk adds {DEAL_PTS}."},
            {"label": "Waiting on your reply", "max": WAIT_MAX, "rule": f"{WAIT_BASE} when they texted last, plus 1 for every 3 days waiting, up to {WAIT_MAX}."},
            {"label": "Cadence", "max": max(CADENCE_PTS.values()), "rule": "Breaks ties only: " + ", ".join(f"{b} {p}" for b, p in CADENCE_PTS.items()) + "."}],
            "left_out": "Agents, lenders and vendors, anyone on Do Not Contact, messages that read like a pitch (credit repair, marketing, lenders selling), test leads, anyone with no valid phone, and anyone already reached today."},
    }
