"""Claude writes each draft (Caleb, 2026-11-09). The follow-up library still picks who gets a draft, the pool and the
template. This takes that template draft and has Claude Sonnet 5.5 write it the way Caleb would, using his own
rewrites (out/handoff/style-examples.jsonl) as the style guide.

Cost control: one request per kind per pass, a draft is written once and kept (out/handoff/claude-drafts.json)
until its template text changes, every request's exact cost goes to out/draft-usage.json, and once today's spend
reaches the cap (PIPELINE_DRAFT_CAP, default $0.50) the template drafts are shown as they are until midnight.
PIPELINE_CLAUDE_DRAFTS=off turns it off. Only first names, the pool, days quiet and the draft text go to Claude:
never a phone, an email address or a last name. Nothing here sends. Caleb reads every draft before it goes.

Since 2026-11-12 (outreach phase 1) each item also carries a `reason` (one plain dated fact from outreach.py, or
null: Claude is never asked to come up with one), a `register` (friendly, or familiar when Caleb's own past messages
to that person show it) and `avoid_openers`. A draft is kept only when every number, date, street and town in it is
in the item, it congratulates nothing unconfirmed, it adds no family, age, faith or health word, and it does not
open like another draft shown today or like the last three messages to that person. A rejected draft falls back to
the template. It is asked for once, never retried in a loop."""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path

import cc_ask
import insight
import jarvis
import outreach

MODEL = os.getenv("PIPELINE_DRAFT_MODEL", "claude-sonnet-5-5")
CAP = float(os.getenv("PIPELINE_DRAFT_CAP", "0.50"))
ON = os.getenv("PIPELINE_CLAUDE_DRAFTS", "on").strip().lower() not in ("off", "0", "no", "false")
MAX_EXAMPLES, MAX_ROWS, KEEP_DAYS, MAX_AVOID = 20, 30, 14, 12
SYSTEM = """You write short follow-up messages for Caleb Jackson, a REALTOR with Keller Williams First Choice in the
Baton Rouge, Louisiana area. Each item is a template draft to one person he already knows. Rewrite each one so it
sounds like Caleb wrote it himself: a text from a friend who happens to be very good at real estate.

How Caleb writes: warm, direct, natural. Short sentences. Plain English. No em dashes, no semicolons, no hashtags,
no emoji unless his examples use them, no corporate filler. When examples of his own rewrites are given, match their
length, rhythm and word choice above everything else here.

Rules that never bend:
- Keep the same purpose and the same ask as the template. Use the person's first name exactly as given.
- Use only facts that are in the item. Never invent a listing, an address, a price, a date, a number or a detail
  about the person. If the template is vague, stay vague.
- No promise about price, value, timing or outcome. No pressure. No mention of race, color, religion, national
  origin, sex, familial status or disability, and nothing about who lives in an area.
- A text stays about as short as its template, never more than two sentences longer. An email body stays under
  90 words and has no greeting block, signature or sign-off: those are added after you.
- Never write that you are an AI or an assistant. Return the message only, ready for Caleb to read and send.

Each item may carry three more fields:
- reason: why this person, today. When it is not null and its mention is true, lead with that one fact as the hook,
  said loosely and only as far as the line says, then one clear ask. When reason is null, or its mention is false,
  write a plain check-in from the template and do not hint at any reason. Never come up with a reason yourself, and
  never mention likes, views, follows or anything else the person did on social media unless the line says it.
- register: "friendly" is warm and polite. "familiar" is how Caleb texts a close friend: looser and shorter. Use a
  nickname only when the item gives one.
- avoid_openers: openers already in use today or used with this person lately. Do not start with any of them.
One message, one bubble: never split it in two and never add a second "following up" line. No "circling back" and no
"touch base". No congratulations unless the reason is a confirmed life update. No word about family, children,
marriage, age, retirement, faith or health unless the template itself already has it."""
SCHEMA = {"type": "object", "additionalProperties": False, "required": ["drafts"], "properties": {"drafts": {
    "type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["key", "text"],
                               "properties": {"key": {"type": "string"}, "text": {"type": "string"}}}}}}


def src_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()[:16]


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def examples(path: Path, kind: str, n: int = MAX_EXAMPLES) -> list[dict]:
    """Caleb's newest rewrites of this kind, real wording first. Only the template draft and what he sent."""
    rows = []
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            if r.get("kind") == kind and r.get("draft") and r.get("sent"):
                rows.append(r)
    except (OSError, ValueError):
        pass
    rows.sort(key=lambda r: (r.get("wording") == "real", r.get("sent_at", "")))
    return [{"pool": r.get("pool", ""), "draft": r["draft"], "caleb_sent": r["sent"]} for r in rows[-n:]]


def first_name(name: str) -> str:
    return (name or "").strip().split(" ")[0]


def split_signoff(body: str, signoff: str) -> tuple[str, str] | None:
    """An email is rewritten above its sign-off only. No known sign-off at the end: leave the email alone."""
    return (body[: -len(signoff)], signoff) if signoff and body.endswith(signoff) else None


def src_of(d: dict, field: str) -> str:
    """What a kept draft was written from: the template text, plus the reason and register when there are any. A
    draft with no reason and the friendly register hashes exactly as it did before those fields existed."""
    extra = {k: d[k] for k in ("reason", "register", "nickname") if d.get(k) and d.get(k) != "friendly"}
    return src_hash((d.get(field) or "") + ("\n" + json.dumps(extra, sort_keys=True, ensure_ascii=False) if extra else ""))


UNSAFE_LINE = re.compile(r"@|\d{3}[\s.)-]*\d{3}[\s.-]*\d{4}|\d{7,}")


def public_reason(d: dict) -> dict | None:
    """The reason row as Claude sees it: type, date, whether it may be mentioned, and the fact line only when it may.
    A line that holds an email, a phone number or the person's last name is not sent at all (the reason becomes None)."""
    r = d.get("reason")
    if not isinstance(r, dict) or not r.get("type"):
        return None
    out = {"type": str(r["type"]), "date": str(r.get("date") or ""), "mention": bool(r.get("mention"))}
    if r.get("confirmed") is True:
        out["confirmed"] = True
    if out["mention"]:
        line = " ".join(str(r.get("line") or "").split())[:200]
        last_names = [w.lower() for w in str(d.get("name") or "").split()[1:] if len(w) >= 3]
        if not line or UNSAFE_LINE.search(line) or any(re.search(rf"\b{re.escape(w)}\b", line.lower()) for w in last_names):
            return None
        out["line"] = line
    return out


def _item(d: dict, key: str, template: str, others: list[str]) -> dict:
    nick, avoid = str(d.get("nickname") or ""), []
    for o in list(d.get("avoid_openers") or []) + others:
        if o and o not in avoid and not re.search(r"\d|@", o):
            avoid.append(o)
    row = {"key": key, "first_name": first_name(d.get("name", "")), "pool": d.get("pool", ""), "days_quiet": d.get("days_quiet"),
           "template_draft": template, "reason": public_reason(d), "register": "familiar" if d.get("register") == "familiar" else "friendly",
           "avoid_openers": avoid[:MAX_AVOID]}
    if nick:
        row["nickname"] = nick
    return row


def todo(text_q: dict, email_q: dict, cache: dict, signoff: str) -> dict:
    """Drafts with no kept Claude version of their current template text: {"text": [...], "email": [...]}. Each item
    also gets the openers of every other draft of its kind shown today (the kept Claude wording, else the template)."""
    out, plan, shown = {"text": [], "email": []}, [], {}
    for d in (text_q.get("drafts") or []):
        if d.get("text"):
            plan.append(("text", "text:" + str(d.get("person_id", "")), d, d["text"], src_of(d, "text")))
    for d in (email_q.get("drafts") or []):
        parts = split_signoff(d.get("body") or "", signoff)
        if parts:
            plan.append(("email", "email:" + str(d.get("person_id", "")), d, parts[0], src_of(d, "body")))
    for kind, key, d, template, src in plan:
        hit = cache.get(key, {})
        shown[key] = (kind, outreach.opener(hit["text"] if hit.get("src") == src and hit.get("text") else template, first_name(d.get("name", "")), str(d.get("nickname") or "")))
    for kind, key, d, template, src in plan:
        if cache.get(key, {}).get("src") != src:
            row = _item(d, key, template, [o for k, (kd, o) in shown.items() if k != key and kd == kind])
            if kind == "email":
                row["subject"] = d.get("subject", "")
            out[kind].append(row)
    return {k: v[:MAX_ROWS] for k, v in out.items()}


def write(client, kind: str, rows: list[dict], style: list[dict], log: Path, now: datetime, cap: float = CAP) -> dict:
    """One request: every row of one kind. Returns {key: text}. Raises ValueError when the cap is used up."""
    before = cc_ask.spent_today(log, now)
    if before >= cap:
        raise ValueError(f"today's draft limit of ${cap:.2f} is used up")
    ask = {"kind": "text message" if kind == "text" else "email body", "calebs_own_rewrites": style, "items": rows}
    resp = jarvis._create(client, model=MODEL, max_tokens=8000, output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
                          system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                          messages=[{"role": "user", "content": json.dumps(ask, ensure_ascii=False)}])
    u = getattr(resp, "usage", None)
    usage = {k: getattr(u, k, 0) or 0 for k in ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")}
    cost = jarvis.cost_usd(getattr(resp, "model", MODEL) or MODEL, usage) or jarvis.cost_usd(MODEL, usage) or 0.0
    spend = (read_json(log, []) + [{"at": now.isoformat(timespec="seconds"), "kind": kind, "drafts": len(rows),
                                    "model": getattr(resp, "model", MODEL), "cost": round(cost, 6), **usage}])[-2000:]
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(json.dumps(spend))
    if getattr(resp, "stop_reason", "") != "end_turn":  # refusal or cut off: keep the templates
        return {}
    try:
        got = json.loads(next(b.text for b in resp.content if getattr(b, "type", "") == "text"))["drafts"]
    except (StopIteration, ValueError, KeyError, TypeError):
        return {}
    want, kept, taken = {r["key"]: r for r in rows}, {}, set()
    for d in got:  # in order: a draft that opens like one already kept in this batch falls back to its template
        row = want.get(d.get("key"))
        if not row or d["key"] in kept or not ok_text(d.get("text"), row):
            continue
        start = outreach.opener(d["text"], row["first_name"], row.get("nickname", ""))
        if start in taken:
            continue
        taken.add(start)
        kept[d["key"]] = d["text"].strip()
    return kept


BANNED = re.compile(r"\bcircl(e|ing) back\b|\btouch(ing)? base\b", re.I)
CONGRATS = re.compile(r"\bcongrat\w*|\b(so )?happy for (you|y[’']?all)\b|\bbig news\b|\bexciting news\b|\bcheers to\b|\bproud of (you|y[’']?all)\b", re.I)
# Fair housing: family, age, faith and health words never go in a real estate draft. insight.PROTECTED_WORDS is the
# list the seller score already skips notes on. Faith, health and schools are added here.
FAITH_HEALTH = re.compile(r"\b(church|pray(er|ers|ing)?|bless(ed|ing|ings)?|god|bible|faith|christian|catholic|baptist|mosque|temple|synagogue|"
                          r"sick|illness|surgery|hospital|cancer|health|disab\w+|wheelchair|diagnos\w+|funeral|schools?)\b", re.I)
SOCIAL = re.compile(r"\b(liked|likes|liking|double[- ]tap\w*|instagram|insta|facebook|your (post|story|comment)|my (post|posts|story|stories|page|feed)|"
                    r"the post|social media|followed|following me)\b", re.I)
NUMBER_WORDS = re.compile(r"\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred|"
                          r"thousand|million|dozen|half)\b", re.I)
DATE_WORDS = re.compile(r"\b(january|february|march|april|june|july|august|september|october|november|december|"
                        r"monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|yesterday|weekend|"
                        r"(this|next|last) (week|month|year|spring|summer|fall|winter))\b", re.I)
STREET = re.compile(r"\b(?:[A-Z][A-Za-z]+|\d+)\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Highway|Hwy|Parkway|Pkwy|Trail|Circle)\b")
TOWNS = ("Baton Rouge", "Zachary", "Central", "Denham Springs", "Prairieville", "Gonzales", "Walker", "Baker", "St. George", "St George", "Watson",
         "Livingston", "Port Allen", "Brusly", "Addis", "Plaquemine", "St. Francisville", "Geismar", "Dutchtown", "Greenwell Springs", "Pride",
         "Slaughter", "Clinton", "Shenandoah", "Sorrento", "Donaldsonville", "Hammond", "Ponchatoula", "Covington", "Mandeville", "Lafayette",
         "New Orleans", "Metairie", "Ascension", "Louisiana", "Mississippi", "Texas")
TOWN = re.compile(r"\b(" + "|".join(re.escape(t) for t in TOWNS) + r")\b")
PLAIN_CAPS = {"I", "I'm", "I'll", "I'd", "I've", "Caleb", "KW", "REALTOR", "Realtor", "OK", "Ok", "Hey", "Hi", "Yall", "Y'all", "HOA", "Jackson", "Keller", "Williams", "First", "Choice"}
MID_CAPITAL = re.compile(r"(?<=[a-z,] )[A-Z][A-Za-z'’]+")  # a capital after a lower-case word: a name or a place, not a new sentence


def _nums(text: str) -> set:
    return {re.sub(r"\D", "", m) for m in re.findall(r"\d[\d,]*", text or "")}


def problem(text, row: dict) -> str:
    """Why a draft is not kept, in a few words, or '' when it is fine. `row` is the item that went to Claude."""
    t = (text or "").strip()
    template = row.get("template_draft") or ""
    reason = row.get("reason") if isinstance(row.get("reason"), dict) else {}
    names = [n for n in (row.get("first_name"), row.get("nickname")) if n]
    if not t or "—" in t or ";" in t or "#" in t or len(t) > max(400, 3 * len(template)):
        return "not plain or not the right size"
    if names and not any(n.lower() in t.lower() for n in names):
        return "wrong first name"
    if BANNED.search(t):
        return "circling back or touch base"
    if "subject" not in row and "\n" in t:
        return "more than one bubble"
    if outreach.opener(t, *names[:2]) in (row.get("avoid_openers") or []):
        return "an opener already in use"
    # ---- every fact in the draft has to be in the item: the template, the reason line when it may be mentioned, the name
    line = str(reason.get("line") or "") if reason.get("mention") else ""
    hay = " ".join(str(x or "") for x in (template, line, reason.get("date") if line else "", row.get("subject"), *names))
    low = hay.lower()
    if _nums(t) - _nums(hay):
        return "a number that is not in the item"
    for rx, what in ((NUMBER_WORDS, "a number"), (DATE_WORDS, "a date")):
        if any(m.group(0).lower() not in low for m in rx.finditer(t)):
            return what + " that is not in the item"
    if any(m.group(0).lower() not in low for rx in (STREET, TOWN) for m in rx.finditer(t)):
        return "a street or town that is not in the item"
    if any(m.group(0).replace("’", "'") not in PLAIN_CAPS and m.group(0).replace("’", "'").lower() not in low for m in MID_CAPITAL.finditer(t)):
        return "a name or place that is not in the item"
    # ---- nothing unconfirmed is congratulated, and no protected word is added
    if CONGRATS.search(t) and not (reason.get("type") == "life_update" and reason.get("confirmed") is True):
        return "congratulations with no confirmed life update"
    if any(m.group(0).lower() not in template.lower() for rx in (insight.PROTECTED_WORDS, FAITH_HEALTH) for m in rx.finditer(t.lower())):
        return "a family, age, faith or health word"
    if not line and SOCIAL.search(t) and not SOCIAL.search(template):
        return "social activity it may not mention"
    return ""


def ok_text(text, row: dict) -> bool:
    """A draft is kept only when it is plain, about the right size, addressed to the right first name, opens its own
    way, and says nothing the item did not give it (see problem)."""
    return not problem(text, row)


def run(client, text_q: dict, email_q: dict, folder: Path, log: Path, now: datetime, signoff: str, cap: float = CAP) -> dict:
    """One pass. Writes what is missing, keeps it in claude-drafts.json. Returns {"written": n, "note": str}."""
    cache_path = folder / "claude-drafts.json"
    cache = read_json(cache_path, {})
    work, written, note, asked = todo(text_q, email_q, cache, signoff), 0, "", False
    src = {"text:" + str(d.get("person_id", "")): src_of(d, "text") for d in (text_q.get("drafts") or [])}
    src.update({"email:" + str(d.get("person_id", "")): src_of(d, "body") for d in (email_q.get("drafts") or [])})
    for kind in ("text", "email"):
        if not work[kind]:
            continue
        try:
            got = write(client, kind, work[kind], examples(folder / "style-examples.jsonl", kind), log, now, cap)
        except ValueError as e:
            note = str(e)
            break
        for key, text in got.items():
            cache[key] = {"src": src[key], "text": text, "at": now.isoformat(timespec="seconds")}
        for row in work[kind]:  # asked for and not kept: the template stays, and it is not asked for again until its source changes
            if row["key"] not in got:
                cache[row["key"]] = {"src": src[row["key"]], "text": "", "rejected": True, "at": now.isoformat(timespec="seconds")}
        written += len(got)
        asked = True
    if asked:
        day = now.timestamp() - KEEP_DAYS * 86400
        cache = {k: v for k, v in cache.items() if datetime.fromisoformat(v["at"]).timestamp() >= day}
        folder.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    return {"written": written, "note": note}


def apply(text_q: dict, email_q: dict, cache: dict, signoff: str) -> tuple[dict, dict, int]:
    """The queues with Claude's wording where a kept draft matches the current template. The template text stays
    on the row as `template_text`, and `by` says who wrote what is shown. Returns new copies and how many changed."""
    n = 0

    def swap(d: dict, kind: str, field: str) -> dict:
        nonlocal n
        hit = cache.get(f"{kind}:{d.get('person_id', '')}")
        if not hit or hit.get("rejected") or not hit.get("text") or hit.get("src") != src_of(d, field):
            return d
        n += 1
        return {**d, field: hit["text"] + (signoff if kind == "email" else ""), "template_text": d[field], "by": "claude"}

    if text_q.get("drafts"):
        text_q = {**text_q, "drafts": [swap(d, "text", "text") for d in text_q["drafts"]]}
    if email_q.get("drafts"):
        email_q = {**email_q, "drafts": [swap(d, "email", "body") for d in email_q["drafts"]]}
    return text_q, email_q, n
