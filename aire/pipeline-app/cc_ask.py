"""Ask Claude about the page you are on.

Sends only that page's numbers (built from cc.build, no phone numbers or email addresses, and no lead names while
money and contacts are hidden) and the question to Claude Sonnet 5.5 at low effort. The instructions are byte-stable
and cached. Every answer's exact cost (jarvis.cost_usd, all four token meters) goes to out/ask-usage.json; once
today's spend in Central time reaches the cap (PIPELINE_ASK_CAP, default $1.00) questions are refused until
midnight. Nothing here can send, save or change anything.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path

import cc
import jarvis

MODEL = os.getenv("PIPELINE_CC_ASK_MODEL", "claude-sonnet-5-5")
CAP = float(os.getenv("PIPELINE_ASK_CAP", "1.00"))
SYSTEM = """You answer Caleb Jackson's questions about one page of his Command Center. Caleb is a REALTOR with Keller
Williams First Choice in the Baton Rouge area. The page's numbers come with each question, each with its source and
as-of time. Answer only from them. If they do not say, say so in one sentence and name what the page does have. Never
invent a name, number or date, and say how old a number is when it matters. Never promise to send, text, email,
schedule or change anything: you cannot. Keep it short: two to five plain sentences, or a few short lines when he
asks for a list. Warm and direct. No em dashes, no semicolons."""

PAGES = {  # which parts of the payload each page is about
    "dash": ["scorecard", "deadlines", "closings", "inbox", "week", "news", "workouts"],
    "commission": ["scorecard", "deals", "closings", "commission_mail"],
    "deadlines": ["deadlines", "closings"], "calendar": ["calendar", "week"],
    "ccleads": ["leads"], "scorecard": ["scorecard", "goals", "history", "deltas"],
    "ccmarket": ["market"], "news": ["news"], "life": ["life"], "health": ["workouts", "health"],
    "bank": ["bank"], "sources": ["fresh", "sync"],
}
STRIP = re.compile(r"phone|email|sender|snippet|threadId|link|url|id$", re.I)
# With money and contacts hidden, free text that can carry a name, an address tied to a person, or what someone wrote
# stays on the Mac too: only counts, dates, stages, sources and amounts-as-hidden go.
PRIVATE_KEYS = {"name", "display", "message", "address", "subject", "fields", "next_action", "next", "title", "last_event",
                "note", "why", "last_messages", "check", "description"}


def _clean(v, hide_names: bool):
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if STRIP.search(k) or (hide_names and k in PRIVATE_KEYS):
                continue
            out[k] = _clean(x, hide_names)
        return out
    if isinstance(v, list):
        # [label, value] pairs (a lead's form fields): a phone or email label drops the pair, whatever the key was.
        if len(v) == 2 and all(isinstance(x, str) for x in v) and STRIP.search(v[0]):
            return None
        return [y for y in (_clean(x, hide_names) for x in v[:60]) if y is not None]
    return v


def page_context(payload: dict, page: str, private: bool) -> str:
    if page not in PAGES:
        raise ValueError("Ask Claude is not on this page yet. It is on the Dashboard and the Command Center pages")
    keys = PAGES[page]
    data = {k: _clean(payload.get(k), private) for k in keys if k in payload}
    data["as_of"] = {k: {"source": v.get("source"), "at": v.get("at"), "state": v.get("state")} for k, v in (payload.get("fresh") or {}).items()}
    data["today"] = payload.get("today")
    if private:  # money hidden on screen: send amounts as hidden too
        data = json.loads(re.sub(r'"(value|commission|price|volume|with_pending|paid|left|amount|money|gci|pending|cash|median_price)": -?[\d.]+',
                                 r'"\1": "hidden"', json.dumps(data, default=str)))
    return json.dumps(data, default=str, separators=(",", ":"))[:60000]


def spent_today(log: Path, now: datetime) -> float:
    day = now.astimezone(cc.CENTRAL).date().isoformat()
    try:
        rows = json.loads(log.read_text())
    except (OSError, ValueError):
        return 0.0
    return round(sum(r.get("cost", 0) for r in rows if str(r.get("at", "")).startswith(day)), 4)


def ask(client, payload: dict, page: str, question: str, private: bool, log: Path, now: datetime, cap: float = CAP) -> dict:
    question = (question or "").strip()[:500]
    if not question:
        raise ValueError("type a question")
    before = spent_today(log, now)
    if before >= cap:
        raise ValueError(f"today's Ask Claude limit of ${cap:.2f} is used up. It resets at midnight")
    resp = jarvis._create(client, model=MODEL, max_tokens=1200, output_config={"effort": "low"},
                          system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                          messages=[{"role": "user", "content": [
                              {"type": "text", "text": "Page: " + page + "\n" + page_context(payload, page, private)},
                              {"type": "text", "text": question}]}])
    u = getattr(resp, "usage", None)
    usage = {k: getattr(u, k, 0) or 0 for k in ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")}
    cost = jarvis.cost_usd(getattr(resp, "model", MODEL) or MODEL, usage) or jarvis.cost_usd(MODEL, usage) or 0.0
    try:
        rows = json.loads(log.read_text())
    except (OSError, ValueError):
        rows = []
    rows = (rows + [{"at": now.astimezone(cc.CENTRAL).isoformat(timespec="seconds"), "page": page, "model": getattr(resp, "model", MODEL),
                     "cost": round(cost, 6), **usage}])[-2000:]
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(json.dumps(rows))
    if getattr(resp, "stop_reason", "") == "refusal":
        return {"answer": "Claude declined that question.", "cost": cost, "spent": round(before + cost, 4), "cap": cap}
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    return {"answer": text or "No answer came back.", "cost": round(cost, 5), "spent": round(before + cost, 4), "cap": cap,
            "model": getattr(resp, "model", MODEL)}
