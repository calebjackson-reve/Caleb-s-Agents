"""Outreach rules, phase 1: who gets no canned draft and why, the one reason a draft may lead with, the register,
and the openers to stay away from. Pure functions over the CRM feed, the send log, the Grok call log and the deals
tied to people. Standard library only, so the follow-up library (../follow-up/followups.py) can import it too.

  context       everything the rules read, gathered once
  hold_for      the first hold rule that says no for one person, with the reason in plain words and when it ends
  screen        the text and email queues with held people taken out and each kept draft carrying its reason,
                register and recent openers. Run when the queue is built and again when Pipeline loads it, so a
                stale queue file cannot show a canned check-in to someone mid-deal.
  reason_for    one real, dated reason, or None. Nothing here makes a reason up.
  reached_today people already reached today: a sent text or email, or a finished call

Message evidence is 1:1 only: the feed's last_messages come from imessage_signals.py, which leaves group chats out.
A missing or unreadable date fails closed (a hold). Nothing here sends, and nothing here writes to the CRM or a sheet.
"""
from __future__ import annotations

import re
from datetime import date, timedelta

QUIET_DAYS = 7          # no outreach draft this soon after Caleb's last outbound text or logged touch
HOLD_DAYS = 90          # a soft no, or two unanswered texts in a row
JUST_CLOSED_DAYS = 45   # no nurture text this soon after a closing: the check-ins list covers the settling-in check
DEAL_TALK_DAYS = 30     # deal words this recent, with no deal linked, are treated as a possible live deal
PULL_AHEAD_DAYS = 30    # cold and ice-cold: a fresh reason pulls them ahead of cadence once in this many days
CADENCE = {"hot": 7, "warm": 14, "lukewarm": 30, "cold": 90, "ice-cold": 365}
PRO_TYPES = {"vendor", "agent", "lender", "recruit"}
LIVE_TIE = ("appointment", "offer", "contract", "other")       # links.OPEN
DEAD_CRM_DEAL = ("closed", "fell_through", "lost", "out")

# Caleb decides this list (the plan, phase 1). One phrase per alternative, matched anywhere in one of their texts.
SOFT_NO_PHRASES = (
    r"not (right )?now", r"not at this time", r"not (quite )?ready", r"not interested", r"not looking",
    r"stay(ing)? put", r"decided to stay", r"(going|gonna) to stay", r"(already )?(have|got|using|working with) (an?|another|our own|my own) (agent|realtor)",
    r"(went|going|go) with (someone|somebody|another|a different)", r"(a )?different direction", r"hold(ing)? off",
    r"no thanks?( you)?", r"we'?re good for now", r"changed (our|my) minds?", r"tak(e|ing) (it|the house|our house|my house) off the market",
)
SOFT_NO = re.compile(r"\b(" + "|".join(SOFT_NO_PHRASES) + r")\b", re.I)
OPT_OUT = re.compile(r"^\W*stop\W*$|\bstop (texting|messaging|contacting|calling|emailing)\b|\btake me off\b|\bremove me\b|\bunsubscribe\b|"
                     r"\bdo ?n[o'’]?t (text|contact|message|call|email) me\b|\blose my number\b", re.I)
# The same deal words imessage_signals.py counts (its "deal" keyword), for the dated lines the feed carries.
DEAL_WORDS = re.compile(r"\b(inspection|appraisal|under contract|closing (date|day|costs?|on|is|was)|close on|title (company|work)|escrow|"
                        r"act of sale|earnest money|counter ?offer|clear to close)\b", re.I)
TALKED = re.compile(r"^Talked about (buying|selling|renting|investing) (today|yesterday|(\d+) days ago)$")
NO_ANSWER = re.compile(r"No answer to your last (\d+) texts")
FAMILIAR = re.compile(r"\by[’']?all\b|\bhaha+\b|\blol\b|!!|\b(bro|brother|buddy|bud|my man|girl|sis|love ya)\b", re.I)
GREETING = re.compile(r"^\W*(?:(?:hey+|hi+|yo|hello|morning|good morning)\W+)?([A-Z][a-z]{1,11})\b")
NOT_A_NICKNAME = {"hey", "hi", "yo", "hello", "morning", "good", "there", "yall", "man", "buddy", "bud", "girl", "friend", "thanks", "happy", "just", "quick", "hope", "how", "what"}


def _d(v) -> date | None:
    try:
        return date.fromisoformat(str(v or "")[:10])
    except ValueError:
        return None


def _norm(s) -> str:
    return re.sub(r"\s+", " ", str(s or "").replace("’", "'")).strip().lower()


def first_name(name) -> str:
    return (str(name or "").strip().split(" ") or [""])[0]


def said(row: dict) -> list[tuple[date | None, str]]:
    """Their last 1:1 texts as the feed carries them ("2026-11-02: words"), as (day, words). No date reads as None."""
    out = []
    for m in (row or {}).get("last_messages") or []:
        s = str(m or "")
        hit = re.match(r"^(\d{4}-\d{2}-\d{2})[T\d:]*:\s?(.*)$", s, re.S)
        out.append((_d(hit.group(1)), hit.group(2)) if hit else (None, s))
    return out


def opener(text, first: str = "", nick: str = "") -> str:
    """The first four words of a message, lower case, the person's own name left out. Two people sent the same
    template have the same opener."""
    names = {n.lower() for n in (first, nick) if n}
    words = [w for i, w in enumerate(re.findall(r"[a-z0-9']+", _norm(text))) if not (i < 6 and w in names)]
    return " ".join(words[:4])


def reached_today(send_log: list | None, bridge_log: list | None, today_iso: str) -> set:
    """person_ids already reached today: a text or email that really went, or a call through Grok that finished.
    A dry-run text never counted, so a dry-run call does not either."""
    done = {r.get("person_id") for r in send_log or [] if r.get("status") == "sent" and str(r.get("at", "")).startswith(today_iso) and r.get("person_id")}
    for e in bridge_log or []:
        res = e.get("result") or {}
        when = str(res.get("completed_at") or res.get("at") or e.get("at") or "")
        if (e.get("job_type") == "call" and e.get("status") == "posted" and res.get("status") == "completed" and e.get("person_id")
                and (when.startswith(today_iso) or str(e.get("at", "")).startswith(today_iso))):
            done.add(e["person_id"])
    return done


def context(feed: dict, today: date, send_log: list | None = None, bridge_log: list | None = None, ties: list | None = None,
            checkins: list | None = None) -> dict:
    """What the rules read, by person_id. `ties` are links.tie rows (the Deals sheet tied to people) when Pipeline
    has them, `checkins` are links.checkins rows. Without them the feed's own Deals tab rows still count."""
    f = feed or {}
    rows: dict = {}
    lists = [(f.get("people"), ""), ((f.get("heat") or {}).get("hot"), ""), ((f.get("heat") or {}).get("warm"), ""),
             (f.get("new_leads"), ""), (f.get("partners"), "partner"), (f.get("touches_due"), "due")]
    due, partners = set(), set()
    for group, tag in lists:
        for r in group or []:
            pid = str(r.get("person_id") or "")
            if not pid:
                continue
            rows[pid] = {**rows.get(pid, {}), **{k: v for k, v in r.items() if v not in (None, "") or k not in rows.get(pid, {})}}
            if tag == "due":
                due.add(pid)
            elif tag == "partner":
                partners.add(pid)
    live: dict = {}
    for d in f.get("deals") or []:
        if d.get("person_id") and str(d.get("stage") or "unknown") not in DEAD_CRM_DEAL and d.get("open") is not False:
            live.setdefault(str(d["person_id"]), str(d.get("address") or "a deal on the CRM Deals tab"))
    closed: dict = {}
    for t in ties or []:
        ids = [str(p.get("person_id")) for p in t.get("people") or []]
        if t.get("stage") in LIVE_TIE and not t.get("expired_offer"):
            for pid in ids:
                live.setdefault(pid, str(t.get("deal") or "a deal on the Deals sheet"))
        elif t.get("stage") == "closed" and _d(t.get("act")):
            for pid in ids:
                if pid not in closed or _d(t["act"]) > closed[pid][0]:
                    closed[pid] = (_d(t["act"]), str(t.get("deal") or ""), str(t.get("side") or ""))
    sends: dict = {}
    for e in send_log or []:
        at = _d(e.get("sent_at") or e.get("at"))
        if e.get("status") == "sent" and e.get("person_id") and at:
            mine = e.get("sent_text") or e.get("text") or ""
            own = bool(e.get("sent_text")) or bool(e.get("draft") and _norm(e.get("draft")) != _norm(e.get("text")))
            sends.setdefault(str(e["person_id"]), []).append({"at": at, "kind": e.get("kind", ""), "text": mine, "own": own})
    for v in sends.values():
        v.sort(key=lambda s: s["at"])
    calls: dict = {}
    for e in bridge_log or []:
        res = e.get("result") or {}
        if e.get("job_type") == "call" and e.get("status") == "posted" and res.get("status") == "completed" and e.get("person_id") and _d(e.get("at")):
            calls.setdefault(str(e["person_id"]), []).append(_d(e["at"]))
    return {"today": today, "rows": rows, "due": due, "partners": partners, "live": live, "closed": closed, "sends": sends, "calls": calls,
            "reached": {str(p) for p in reached_today(send_log, bridge_log, today.isoformat())},
            "no_text": {str(x) for x in f.get("no_text_consent") or []},
            "pro": {str(r.get("person_id")) for r in f.get("label_review") or [] if r.get("rule") == "pro_as_client"},
            "cadence": {**CADENCE, **(f.get("cadence_days") or {})}, "checkins": checkins or []}


def _hold(rule: str, why: str, until: date | None = None) -> dict:
    return {"rule": rule, "why": why, "until": until.isoformat() if until else ""}


def _ago(n: int) -> str:
    return "today" if n <= 0 else "yesterday" if n == 1 else f"{n} days ago"


def last_out(pid: str, ctx: dict) -> tuple[date | None, bool]:
    """Caleb's last outbound to this person (a 1:1 text, a Pipeline send, a finished call), and whether every date
    on the row could be read."""
    row, today = ctx["rows"].get(pid) or {}, ctx["today"]
    raw = str(row.get("last_outbound") or "")
    days = [_d(raw)] + [s["at"] for s in ctx["sends"].get(pid, [])] + list(ctx["calls"].get(pid, []))
    days = [d for d in days if d]
    readable = (not raw or _d(raw) is not None) and all(d <= today for d in days)
    return (max(days) if days else None), readable


def hold_for(pid: str, ctx: dict, kind: str = "text") -> dict | None:
    """The first rule that says this person gets no canned outreach draft today, or None. First match wins, in the
    order the plan gives: the gates, reply owed, a live deal, just closed, a soft no, no answer, too soon."""
    pid, today = str(pid), ctx["today"]
    row = ctx["rows"].get(pid)
    if row is None:
        return _hold("unknown", "Not in today's CRM feed, so nothing is drafted.")
    partner = pid in ctx["partners"] or str(row.get("type") or "").lower() in PRO_TYPES
    lines = said(row)
    for day, words in reversed(lines):
        if OPT_OUT.search(words):
            return _hold("opt_out", f"Possible opt-out{' on ' + day.isoformat() if day else ''}: \"{words[:120]}\". Your call whether to mark Do Not Contact.")
    if kind == "text" and pid in ctx["no_text"]:
        return _hold("no_text_consent", "No text consent on their website form. Email or call instead.")
    if pid in ctx["pro"]:
        return _hold("pro_as_client", "Reads like a vendor, agent or lender filed as a client. Relabel them first.")
    if pid in ctx["reached"]:
        return _hold("reached_today", "Already reached today.", today + timedelta(days=1))
    if row.get("owes_reply"):
        return _hold("reply_owed", "They wrote last. They get an answer, not a check-in.")
    # ---- lane B: mid-deal. No nurture template, ever.
    if pid in ctx["live"]:
        return _hold("mid_deal", f"Live deal: {ctx['live'][pid]}. No canned check-in.")
    stage = str(row.get("stage") or "").strip().lower()
    if "under contract" in stage or stage == "active":
        return _hold("mid_deal", f"Stage is {stage}. No canned check-in.")
    if not partner:
        for day, words in reversed(lines):
            if DEAL_WORDS.search(words) and (day is None or 0 <= (today - day).days <= DEAL_TALK_DAYS):
                return _hold("possible_deal", f"Deal words in their texts{' on ' + day.isoformat() if day else ''} and no deal linked. Link the deal first.",
                             (day or today) + timedelta(days=DEAL_TALK_DAYS))
        if any("Deal talk in their texts this month" in str(x) for x in row.get("reasons") or []):
            return _hold("possible_deal", "Deal words in their texts this month and no deal linked. Link the deal first.")
    # ---- just closed: no nurture text. The 30 day check-in on the check-ins list is the settling-in check.
    if pid in ctx["closed"]:
        day, deal, _ = ctx["closed"][pid]
        if 0 <= (today - day).days < JUST_CLOSED_DAYS:
            return _hold("just_closed", f"Closed {_ago((today - day).days)}{' on ' + deal if deal else ''}. No nurture text yet. The 30 day check-in is on the check-ins list.",
                         day + timedelta(days=JUST_CLOSED_DAYS))
    # ---- a soft no holds outreach for 90 days
    for day, words in reversed(lines):
        if SOFT_NO.search(words):
            on = day or today
            if on <= today < on + timedelta(days=HOLD_DAYS):
                return _hold("soft_no", f"Said not now on {on.isoformat()}: \"{words[:120]}\".", on + timedelta(days=HOLD_DAYS))
    # ---- no answer to the last one or two
    out_day, readable = last_out(pid, ctx)
    if not readable:
        return _hold("unreadable", "A date on their record could not be read, so nothing is drafted.")
    raw_in = str(row.get("last_inbound") or "")
    in_day = _d(raw_in)
    if raw_in and in_day is None:
        return _hold("unreadable", "A date on their record could not be read, so nothing is drafted.")
    unanswered = [s for s in ctx["sends"].get(pid, []) if not in_day or s["at"] > in_day]
    n = len(unanswered)
    m = NO_ANSWER.search(" ".join(str(x) for x in row.get("reasons") or []))
    if m:
        n = max(n, int(m.group(1)))
    if n >= 2:
        if out_day is None or today < out_day + timedelta(days=HOLD_DAYS):
            return _hold("no_answer", "No answer to your last 2. Held until they write or 90 days pass.", out_day + timedelta(days=HOLD_DAYS) if out_day else None)
    elif n == 1:
        wait = int(ctx["cadence"].get(str(row.get("band") or ""), 30))
        if today < unanswered[-1]["at"] + timedelta(days=wait):
            return _hold("no_answer_1", "One text with no answer yet. The next one waits the full cadence.", unanswered[-1]["at"] + timedelta(days=wait))
    # ---- too soon: 7 days after his last outbound or logged touch, unless they wrote back
    wrote_back = bool(in_day and out_day and in_day > out_day)
    if out_day and (today - out_day).days < QUIET_DAYS and not wrote_back:
        return _hold("too_soon", f"You reached out {_ago((today - out_day).days)}. Nothing new for {QUIET_DAYS} days unless they write back.", out_day + timedelta(days=QUIET_DAYS))
    quiet = row.get("days_quiet")
    if isinstance(quiet, int) and 0 <= quiet < QUIET_DAYS and not (in_day and (today - in_day).days <= quiet and (not out_day or in_day > out_day)):
        return _hold("too_soon", f"Last touch was {_ago(quiet)}. Nothing new for {QUIET_DAYS} days unless they write back.", today + timedelta(days=QUIET_DAYS - quiet))
    return None


def pull_ahead_ok(pid: str, ctx: dict) -> bool:
    """A fresh reason may pull someone ahead of their cadence date. Never inside the 7 days (hold_for covers that),
    and for cold and ice-cold only when nothing has gone out to them in 30 days."""
    row = ctx["rows"].get(str(pid)) or {}
    if str(row.get("band") or "") not in ("cold", "ice-cold"):
        return True
    out_day, readable = last_out(str(pid), ctx)
    quiet = row.get("days_quiet")
    return readable and (out_day is None or (ctx["today"] - out_day).days >= PULL_AHEAD_DAYS) and not (isinstance(quiet, int) and quiet < PULL_AHEAD_DAYS)


def reason_for(pid: str, ctx: dict) -> dict | None:
    """One lead reason with a source and a date, or None. `line` is a plain fact written here from a fixed set of
    words: never a phone, an email, a last name or their message text. Seller score, heat and years owned rank
    people and are never a reason. No reason on file means None, and the drafter is not asked for one."""
    row, today = ctx["rows"].get(str(pid)) or {}, ctx["today"]
    found = []
    for r in row.get("reasons") or []:
        m = TALKED.match(str(r))
        if m:
            age = 0 if m.group(2) == "today" else 1 if m.group(2) == "yesterday" else int(m.group(3))
            if age <= 90:
                found.append((0 if age <= 30 else 2, age, {"type": "own_words", "line": f"They brought up {m.group(1)} in a text to you.",
                                                          "date": (today - timedelta(days=age)).isoformat(), "mention": True}))
    for c in ctx.get("checkins") or []:
        if str(c.get("person_id")) == str(pid) and str(c.get("kind") or "").startswith("home anniversary") and abs(int(c.get("days") or 0)) <= 30:
            found.append((1, abs(int(c.get("days") or 0)), {"type": "home_anniversary", "line": f"Their {c['kind']}, is on {c.get('due')}.",
                                                           "date": str(c.get("due") or ""), "mention": True}))
    return min(found, key=lambda x: x[:2])[2] if found else None


def register_for(pid: str, ctx: dict, first: str) -> tuple[str, str]:
    """("familiar" or "friendly", nickname or ""). Familiar only when two or more of Caleb's own past messages to
    this person (his wording, not a template sent as it was) read that way. A nickname only when he has greeted them
    with it twice and it is plainly a short form of their first name."""
    mine = [s["text"] for s in ctx["sends"].get(str(pid), []) if s.get("own") and s.get("text")]
    register = "familiar" if sum(1 for t in mine if FAMILIAR.search(t)) >= 2 else "friendly"
    counts: dict = {}
    for t in mine:
        m = GREETING.match(t)
        if m and m.group(1).lower() not in NOT_A_NICKNAME:
            counts[m.group(1)] = counts.get(m.group(1), 0) + 1
    f = (first or "").lower()
    for nick, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        k = nick.lower()
        if n >= 2 and f and k != f and len(k) >= 2 and (f.startswith(k[:2]) or k.startswith(f[:2])):
            return register, nick
    return register, ""


def recent_openers(pid: str, ctx: dict, first: str, nick: str = "") -> list[str]:
    """The openers of the last three messages sent to this person. Four words each, no name, nothing with a digit."""
    out = []
    for s in ctx["sends"].get(str(pid), [])[-3:]:
        o = opener(s.get("text"), first, nick)
        if o and o not in out and not re.search(r"\d|@", o):
            out.append(o)
    return out


def annotate(draft: dict, ctx: dict) -> dict:
    """A kept draft with what the drafter needs beside it: the reason row (or None), the register, the openers to avoid."""
    pid, first = str(draft.get("person_id") or ""), first_name(draft.get("name"))
    register, nick = register_for(pid, ctx, first)
    out = {**draft, "reason": reason_for(pid, ctx), "register": register, "avoid_openers": recent_openers(pid, ctx, first, nick)}
    if nick:
        out["nickname"] = nick
    return out


def screen(text_q: dict, email_q: dict, ctx: dict) -> tuple[dict, dict, list]:
    """The two queues with every held person's draft taken out, one card per person across both, and each kept draft
    annotated. Someone the feed now says is waiting on a reply moves to reply first with their last texts. Returns new
    copies and the held rows ({person_id, name, kind, rule, why, until}). Reply-first people are never capped or held."""
    held, seen = [], set()
    reply = list((text_q or {}).get("reply_first") or [])
    seen.update(str(r.get("person_id")) for r in reply)
    kept = {}
    for kind, q in (("text", text_q), ("email", email_q)):
        rows = []
        for d in (q or {}).get("drafts") or []:
            pid = str(d.get("person_id") or "")
            h = hold_for(pid, ctx, kind)
            if not h and pid in seen:
                h = _hold("one_card", "One card per person per day. Their other card is already on the list.")
            if h:
                held.append({"person_id": pid, "name": d.get("name", ""), "kind": kind, **h})
                if h["rule"] == "reply_owed" and pid not in seen:
                    row = ctx["rows"].get(pid) or {}
                    reply.append({"person_id": d.get("person_id", ""), "name": d.get("name", ""), "phone": row.get("phone", d.get("phone", "")),
                                  "email": row.get("email", d.get("email", "")), "last_messages": row.get("last_messages", []), "next_action": row.get("next_action", "")})
                    seen.add(pid)
                continue
            seen.add(pid)
            rows.append(annotate(d, ctx))
        kept[kind] = rows
    tq, eq = text_q, email_q
    if isinstance(text_q, dict) and "_error" not in text_q and ("drafts" in text_q or "reply_first" in text_q):
        tq = {**text_q, "drafts": kept["text"], "reply_first": reply,
              "held": list(text_q.get("held") or []) + [h for h in held if h["kind"] == "text"]}
    if isinstance(email_q, dict) and "_error" not in email_q and "drafts" in email_q:
        eq = {**email_q, "drafts": kept["email"], "held": list(email_q.get("held") or []) + [h for h in held if h["kind"] == "email"]}
    return tq, eq, held
