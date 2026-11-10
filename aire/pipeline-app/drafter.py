"""Claude writes each draft (Caleb, 2026-11-09). The follow-up library still picks who gets a draft, the pool and the
template. This takes that template draft and has Claude Sonnet 5.5 write it the way Caleb would, using his own
rewrites (out/handoff/style-examples.jsonl) as the style guide.

Cost control: one request per kind per pass, a draft is written once and kept (out/handoff/claude-drafts.json)
until its template text changes, every request's exact cost goes to out/draft-usage.json, and once today's spend
reaches the cap (PIPELINE_DRAFT_CAP, default $0.50) the template drafts are shown as they are until midnight.
PIPELINE_CLAUDE_DRAFTS=off turns it off. Only first names, the pool, days quiet and the draft text go to Claude:
never a phone, an email address or a last name. Nothing here sends. Caleb reads every draft before it goes."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path

import cc_ask
import jarvis

MODEL = os.getenv("PIPELINE_DRAFT_MODEL", "claude-sonnet-5-5")
CAP = float(os.getenv("PIPELINE_DRAFT_CAP", "0.50"))
ON = os.getenv("PIPELINE_CLAUDE_DRAFTS", "on").strip().lower() not in ("off", "0", "no", "false")
MAX_EXAMPLES, MAX_ROWS, KEEP_DAYS = 20, 30, 14
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
- Never write that you are an AI or an assistant. Return the message only, ready for Caleb to read and send."""
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


def todo(text_q: dict, email_q: dict, cache: dict, signoff: str) -> dict:
    """Drafts with no kept Claude version of their current template text: {"text": [...], "email": [...]}."""
    out = {"text": [], "email": []}
    for d in (text_q.get("drafts") or []):
        key = "text:" + str(d.get("person_id", ""))
        if d.get("text") and cache.get(key, {}).get("src") != src_hash(d["text"]):
            out["text"].append({"key": key, "first_name": first_name(d.get("name", "")), "pool": d.get("pool", ""),
                                "days_quiet": d.get("days_quiet"), "template_draft": d["text"]})
    for d in (email_q.get("drafts") or []):
        key, parts = "email:" + str(d.get("person_id", "")), split_signoff(d.get("body") or "", signoff)
        if parts and cache.get(key, {}).get("src") != src_hash(d["body"]):
            out["email"].append({"key": key, "first_name": first_name(d.get("name", "")), "pool": d.get("pool", ""),
                                 "days_quiet": d.get("days_quiet"), "subject": d.get("subject", ""), "template_draft": parts[0]})
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
    want = {r["key"]: r for r in rows}
    return {d["key"]: d["text"].strip() for d in got if d.get("key") in want and ok_text(d.get("text"), want[d["key"]])}


def ok_text(text, row: dict) -> bool:
    """A draft is kept only when it is plain, about the right size and addressed to the right first name."""
    t = (text or "").strip()
    if not t or "—" in t or ";" in t or "#" in t or len(t) > max(400, 3 * len(row["template_draft"])):
        return False
    return not row["first_name"] or row["first_name"].lower() in t.lower()


def run(client, text_q: dict, email_q: dict, folder: Path, log: Path, now: datetime, signoff: str, cap: float = CAP) -> dict:
    """One pass. Writes what is missing, keeps it in claude-drafts.json. Returns {"written": n, "note": str}."""
    cache_path = folder / "claude-drafts.json"
    cache = read_json(cache_path, {})
    work, written, note = todo(text_q, email_q, cache, signoff), 0, ""
    src = {"text:" + str(d.get("person_id", "")): d.get("text") for d in (text_q.get("drafts") or [])}
    src.update({"email:" + str(d.get("person_id", "")): d.get("body") for d in (email_q.get("drafts") or [])})
    for kind in ("text", "email"):
        if not work[kind]:
            continue
        try:
            got = write(client, kind, work[kind], examples(folder / "style-examples.jsonl", kind), log, now, cap)
        except ValueError as e:
            note = str(e)
            break
        for key, text in got.items():
            cache[key] = {"src": src_hash(src[key]), "text": text, "at": now.isoformat(timespec="seconds")}
        written += len(got)
    if written:
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
        if not hit or hit.get("src") != src_hash(d.get(field) or ""):
            return d
        n += 1
        return {**d, field: hit["text"] + (signoff if kind == "email" else ""), "template_text": d[field], "by": "claude"}

    if text_q.get("drafts"):
        text_q = {**text_q, "drafts": [swap(d, "text", "text") for d in text_q["drafts"]]}
    if email_q.get("drafts"):
        email_q = {**email_q, "drafts": [swap(d, "email", "body") for d in email_q["drafts"]]}
    return text_q, email_q, n
