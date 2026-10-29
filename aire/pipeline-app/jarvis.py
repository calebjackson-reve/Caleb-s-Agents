"""Jarvis, the brain behind Pipeline's voice (2026-10-29).

Claude answers with tools over today's feed.json instead of one fixed slice of it, so any question the app's data can
answer gets answered: anyone in the book by name, street or town, who is due and why, who looks mislabeled, tasks,
deals, leads, partners, the Market Monitor. Every tool is read only. `propose` only queues a change; the Pipeline
screen shows it and nothing is written until Caleb taps yes (the same crm.py write path as every other button).

Phones and emails never go to the model, only has_phone and has_email, and the last four digits for someone with no
name so Caleb can tell who it is.
"""
from __future__ import annotations

import json
import re
import uuid

SYSTEM = """You are Jarvis, the voice inside Pipeline, Caleb Jackson's daily real estate tool. Caleb is a REALTOR with
Keller Williams First Choice around Baton Rouge and St. Francisville. Talk like his sharp, trusted assistant who knows
every person in his book: warm, direct, plain words, short sentences. Two to four sentences, because you are heard, not
read. No lists, no markdown, no em dashes, no filler, no "great question".

How you work:
- Look it up with your tools before you answer. Every name, number, date and quote you say must come from a tool
  result in this conversation. If the tools do not have it, say so in one line and say what you do have.
- Who to reach out to: people waiting on Caleb (owes_reply) first, then people whose label is wrong in a way that
  matters (texting but marked cold, hot gone quiet), then hot and warm by days quiet. Give the name and the one reason
  that matters, like "she texted Tuesday about the Zachary house".
- Point out a wrong label in the same breath: "Paul is marked cold but you two texted four times this month, I'd move
  him to warm." Then queue the fix with propose so Caleb can tap yes. Never say it is changed. Say it is ready for
  his yes.
- Skip people with no name unless he asks. If you must mention one, say "the number ending" and the last four.
- propose queues a band or Type fix, a task or a note. Nothing is written until Caleb taps yes on the screen. You never
  send texts or email, never schedule, never promise to.
- Never read out phone numbers or email addresses.
- Fair housing: never describe, rank or sort people or neighborhoods by race, color, religion, national origin, sex,
  familial status or disability."""

MAX_TURNS = 8
# $ per million tokens: input, 5-minute cache write, cache read, output. From the live pricing page, read 2026-10-29
# (https://platform.claude.com/docs/en/about-claude/pricing). Re-check when a price changes.
PRICES = {"claude-opus-5-5": (4.0, 5.0, 0.20, 20.0), "claude-sonnet-5-5": (2.0, 2.50, 0.10, 10.0),
          "claude-haiku-5-5": (0.10, 0.125, 0.01, 0.50)}


def cost_usd(model: str, u: dict) -> float | None:
    """Exact spend for one usage tally, all four meters at their own rate. None for a model not in PRICES."""
    p = PRICES.get(model)
    if not p:
        return None
    return (u.get("input_tokens", 0) * p[0] + u.get("cache_creation_input_tokens", 0) * p[1]
            + u.get("cache_read_input_tokens", 0) * p[2] + u.get("output_tokens", 0) * p[3]) / 1e6
BANDS = ["hot", "warm", "lukewarm", "cold", "ice-cold"]
PRO_TYPES = ["agent", "lender", "vendor"]

TOOLS = [
    {"name": "overview", "description": "Today at a glance: counts of touches due, replies owed, tasks, overdue, deals, "
     "leads, label review by rule, texts and emails sent today against the caps, feed age. Start here for a brief.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "who_to_contact", "description": "Who Caleb should reach out to now, best first: owes_reply, then hot and warm "
     "by days quiet. Each row has the reason, last texts and any label problem. Filters are optional.",
     "input_schema": {"type": "object", "properties": {
         "limit": {"type": "integer", "description": "default 8, max 30"},
         "band": {"type": "string", "enum": BANDS},
         "owes_reply_only": {"type": "boolean"},
         "min_days_quiet": {"type": "integer"},
         "city": {"type": "string"},
         "include_unnamed": {"type": "boolean", "description": "default false"}}}},
    {"name": "find_person", "description": "Find anyone in the whole book (not only people due) by name, part of a "
     "name, street, town, or last four digits of a phone. Returns up to 8 matches with person_id.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "person_detail", "description": "Everything on one person: band, stage, type, address, last touch, last "
     "texts, owes_reply, days quiet, next action, their tasks and deals, label problems, market activity near them.",
     "input_schema": {"type": "object", "properties": {"person_id": {"type": "string"}}, "required": ["person_id"]}},
    {"name": "label_review", "description": "Contacts whose band or Type looks wrong. Rules: texting_but_cold, "
     "hot_gone_quiet, past_client_no_band, pro_as_client. Each row has the suggested fix and why.",
     "input_schema": {"type": "object", "properties": {
         "rule": {"type": "string", "enum": ["texting_but_cold", "hot_gone_quiet", "past_client_no_band", "pro_as_client"]},
         "limit": {"type": "integer", "description": "default 8"}}}},
    {"name": "count_people", "description": "Count and sample the whole book by band, stage, type and town, e.g. how "
     "many past clients in Zachary.",
     "input_schema": {"type": "object", "properties": {
         "band": {"type": "string", "description": "a band, or 'blank'"}, "stage": {"type": "string"},
         "type": {"type": "string"}, "city": {"type": "string"},
         "limit": {"type": "integer", "description": "sample size, default 5"}}}},
    {"name": "tasks", "description": "Open tasks, soonest due first.",
     "input_schema": {"type": "object", "properties": {"overdue_only": {"type": "boolean"}, "limit": {"type": "integer"}}}},
    {"name": "deals", "description": "Live deals: address, who, side, stage, price, expected close, next step, last event.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "leads", "description": "New leads from the last two weeks and where they came from.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "partners", "description": "Agents, lenders and vendors due a touch as referral partners.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "market", "description": "Market Monitor rows, newest first: permits, new listings, listing changes, with "
     "the nearest known person and miles.",
     "input_schema": {"type": "object", "properties": {
         "label": {"type": "string", "description": "e.g. new listing, listing change, roof, new build, pool"},
         "city": {"type": "string"}, "farm": {"type": "string"}, "limit": {"type": "integer", "description": "default 8"}}}},
    {"name": "propose", "description": "Queue a change for Caleb's yes on the screen. Nothing is written until he taps "
     "yes. action relabel needs band or type; task needs task and due (YYYY-MM-DD); note needs text. why is one plain "
     "sentence he will read on the card.",
     "input_schema": {"type": "object", "properties": {
         "action": {"type": "string", "enum": ["relabel", "task", "note"]},
         "person_id": {"type": "string"},
         "band": {"type": "string", "enum": BANDS}, "type": {"type": "string", "enum": PRO_TYPES},
         "task": {"type": "string"}, "due": {"type": "string"}, "text": {"type": "string"},
         "why": {"type": "string"}}, "required": ["action", "person_id", "why"]}},
]


def _last4(phone: str) -> str:
    d = re.sub(r"\D", "", phone or "")
    return d[-4:] if len(d) >= 4 else ""


def _clip(xs: list, limit, default: int, cap: int = 30) -> list:
    try:
        n = int(limit) if limit else default
    except (TypeError, ValueError):
        n = default
    return xs[:max(1, min(n, cap))]


class Tools:
    """The read side over one feed snapshot. One instance per question, so the answer sees one consistent feed."""

    def __init__(self, feed: dict, sent_today: dict | None = None, caps: dict | None = None, today: str = ""):
        self.f = feed or {}
        self.sent, self.caps, self.today = sent_today or {}, caps or {}, today
        self.due = {r["person_id"]: r for r in self.f.get("touches_due", [])}
        self.people = {p["person_id"]: p for p in self.f.get("people", [])}
        self.review = {r["person_id"]: r for r in self.f.get("label_review", [])}
        self.pins = {p["person_id"]: p for p in self.f.get("map", {}).get("pins", []) if p.get("person_id")}
        self.proposals: list[dict] = []

    def name(self, pid: str, row: dict | None = None) -> str:
        row = row or self.people.get(pid) or self.due.get(pid) or {}
        n = (row.get("display") or "").strip()
        if n:
            return n
        tail = _last4(row.get("phone", "") or (self.due.get(pid) or {}).get("phone", ""))
        return f"no name (number ending {tail})" if tail else f"no name (#{pid})"

    def _flag(self, pid: str) -> dict | None:
        r = self.review.get(pid)
        return {"rule": r["rule"], "suggest": r.get("suggest_band") or r.get("suggest_type"), "why": r["why"]} if r else None

    def _due_row(self, r: dict) -> dict:
        pid = r["person_id"]
        return {"person_id": pid, "name": self.name(pid, r), "band": r.get("band"), "stage": r.get("stage"),
                "days_quiet": r.get("days_quiet"), "owes_reply": r.get("owes_reply"), "next_action": r.get("next_action"),
                "last_texts": (r.get("last_messages") or [])[-2:], "has_phone": bool(r.get("phone")),
                "city": (self.people.get(pid) or {}).get("city", ""), "label_problem": self._flag(pid)}

    # ---- tools
    def overview(self) -> dict:
        c = self.f.get("counts", {})
        rules: dict[str, int] = {}
        for r in self.f.get("label_review", []):
            rules[r["rule"]] = rules.get(r["rule"], 0) + 1
        return {"today": self.today, "feed_as_of": self.f.get("as_of"), "feed_generated_at": self.f.get("generated_at"),
                "contacts": c.get("contacts"), "touches_due": c.get("touches_due"), "by_band_due": c.get("by_band"),
                "owes_reply": sum(1 for r in self.f.get("touches_due", []) if r.get("owes_reply")),
                "tasks_open": c.get("tasks_open"), "tasks_overdue": c.get("tasks_overdue"), "deals_live": c.get("deals_live"),
                "new_leads": len(self.f.get("new_leads", [])), "partners_due": len(self.f.get("partners", [])),
                "label_review": rules, "market_rows": len(self.f.get("market", {}).get("rows", [])),
                "sent_today": self.sent, "caps": self.caps}

    def who_to_contact(self, limit=None, band=None, owes_reply_only=False, min_days_quiet=None, city=None,
                       include_unnamed=False) -> dict:
        rows = self.f.get("touches_due", [])  # the engine's order: owes_reply newest first, then band, signal, silence
        if not include_unnamed:
            rows = [r for r in rows if (r.get("display") or "").strip()]
        if band:
            rows = [r for r in rows if r.get("band") == band]
        if owes_reply_only:
            rows = [r for r in rows if r.get("owes_reply")]
        if min_days_quiet is not None:
            rows = [r for r in rows if r.get("days_quiet") is None or r["days_quiet"] >= int(min_days_quiet)]
        if city:
            rows = [r for r in rows if city.lower() in ((self.people.get(r["person_id"]) or {}).get("city") or "").lower()]
        return {"matching": len(rows), "rows": [self._due_row(r) for r in _clip(rows, limit, 8)]}

    def find_person(self, query: str = "") -> dict:
        q = (query or "").strip().lower()
        if not q:
            return {"error": "say a name, street, town or last four of a phone"}
        digits = re.sub(r"\D", "", q)
        words = q.split()
        hits = []
        for pid, p in self.people.items():
            hay = f"{p.get('display', '')} {p.get('street', '')} {p.get('city', '')}".lower()
            phone = (self.due.get(pid) or {}).get("phone", "") or (self.pins.get(pid) or {}).get("phone", "")
            if all(w in hay for w in words) or (len(digits) == 4 and _last4(phone) == digits):
                exact = (p.get("display") or "").lower() == q
                hits.append((0 if exact else 1, p.get("display") or "~", pid))
        hits.sort()
        return {"matches": len(hits), "people": [{"person_id": pid, "name": self.name(pid), "band": self.people[pid].get("band"),
                                                  "stage": self.people[pid].get("stage"), "type": self.people[pid].get("type"),
                                                  "city": self.people[pid].get("city")} for _, _, pid in hits[:8]]}

    def person_detail(self, person_id: str = "") -> dict:
        pid = str(person_id)
        p, d = self.people.get(pid), self.due.get(pid)
        if not p and not d:
            return {"error": f"no person {pid} in the feed (Do Not Contact people are left out)"}
        p = p or {}
        out = {"person_id": pid, "name": self.name(pid), "band": p.get("band") or (d or {}).get("band"), "stage": p.get("stage"),
               "type": p.get("type"), "street": p.get("street"), "city": p.get("city"), "last_touch": p.get("last_touch"),
               "last_inbound": p.get("last_inbound"), "last_outbound": p.get("last_outbound"), "next_action": p.get("next_action"),
               "has_phone": p.get("has_phone"), "has_email": p.get("has_email"), "due_now": bool(d),
               "label_problem": self._flag(pid)}
        if d:
            out.update(days_quiet=d.get("days_quiet"), owes_reply=d.get("owes_reply"), last_texts=(d.get("last_messages") or [])[-3:])
        out["tasks"] = [{"task": t.get("task"), "due": t.get("due"), "overdue": t.get("overdue")}
                        for t in self.f.get("tasks", []) if str(t.get("person_id")) == pid]
        out["deals"] = [{k: x.get(k) for k in ("address", "side", "stage", "price", "expected_close", "next_step", "last_event")}
                        for x in self.f.get("deals", []) if str(x.get("person_id")) == pid]
        out["market_nearby"] = [{k: m.get(k) for k in ("date", "label", "address", "city", "price", "value")} | {"miles": m["nearest"].get("miles")}
                                for m in self.f.get("market", {}).get("rows", []) if str((m.get("nearest") or {}).get("person_id")) == pid][:5]
        return out

    def label_review(self, rule=None, limit=None) -> dict:
        rows = [r for r in self.f.get("label_review", []) if not rule or r["rule"] == rule]
        # Named people first: a fix Caleb can picture beats one he cannot.
        rows = sorted(rows, key=lambda r: not (r.get("display") or "").strip())
        return {"matching": len(rows), "rows": [{"person_id": r["person_id"], "name": self.name(r["person_id"], r), "rule": r["rule"],
                                                 "now": r.get("band") or r.get("type") or "blank",
                                                 "suggest": r.get("suggest_band") or r.get("suggest_type"), "why": r["why"]}
                                                for r in _clip(rows, limit, 8)]}

    def count_people(self, band=None, stage=None, type=None, city=None, limit=None) -> dict:
        rows = list(self.people.values())
        if band:
            rows = [p for p in rows if (p.get("band") or "blank") == band.lower()]
        if stage:
            rows = [p for p in rows if (p.get("stage") or "").lower() == stage.lower()]
        if type:
            rows = [p for p in rows if (p.get("type") or "").lower() == type.lower()]
        if city:
            rows = [p for p in rows if city.lower() in (p.get("city") or "").lower()]
        named = [p for p in rows if (p.get("display") or "").strip()]
        return {"count": len(rows), "named": len(named),
                "sample": [{"person_id": p["person_id"], "name": p["display"], "band": p.get("band"), "city": p.get("city")}
                           for p in _clip(named, limit, 5)]}

    def tasks(self, overdue_only=False, limit=None) -> dict:
        rows = [t for t in self.f.get("tasks", []) if t.get("overdue") or not overdue_only]
        return {"matching": len(rows), "rows": [{"task": t.get("task"), "who": t.get("display"), "person_id": t.get("person_id"),
                                                 "due": t.get("due"), "overdue": t.get("overdue")} for t in _clip(rows, limit, 10)]}

    def deals(self) -> dict:
        return {"rows": [{k: x.get(k) for k in ("address", "display", "person_id", "side", "stage", "price", "expected_close",
                                                "next_step", "last_event", "last_event_at")} for x in self.f.get("deals", [])]}

    def leads(self) -> dict:
        return {"rows": [{"person_id": x.get("person_id"), "name": x.get("display"), "source": x.get("source"),
                          "received": x.get("received"), "next_action": x.get("next_action")} for x in self.f.get("new_leads", [])]}

    def partners(self) -> dict:
        return {"rows": [{"person_id": x.get("person_id"), "name": x.get("display"), "type": x.get("type"),
                          "days_quiet": x.get("days_quiet"), "next_action": x.get("next_action")} for x in self.f.get("partners", [])]}

    def market(self, label=None, city=None, farm=None, limit=None) -> dict:
        rows = self.f.get("market", {}).get("rows", [])
        if label:
            rows = [m for m in rows if label.lower() in (m.get("label") or "").lower()]
        if city:
            rows = [m for m in rows if city.lower() in (m.get("city") or "").lower()]
        if farm:
            rows = [m for m in rows if farm.lower() in (m.get("farm") or "").lower()]
        rows = sorted(rows, key=lambda m: m.get("date") or "", reverse=True)
        return {"matching": len(rows), "rows": [{**{k: m.get(k) for k in ("date", "label", "address", "city", "price", "value", "farm", "source")},
                                                 "nearest": {"person_id": (m.get("nearest") or {}).get("person_id"),
                                                             "name": (m.get("nearest") or {}).get("display"),
                                                             "miles": (m.get("nearest") or {}).get("miles")}} for m in _clip(rows, limit, 8)]}

    def propose(self, action="", person_id="", band=None, type=None, task=None, due=None, text=None, why="") -> dict:
        pid = str(person_id)
        if pid not in self.people and pid not in self.due:
            return {"error": f"no person {pid}; find them first"}
        if action == "relabel":
            if band not in BANDS and type not in PRO_TYPES:
                return {"error": "relabel needs a band (" + ", ".join(BANDS) + ") or a type (agent, lender, vendor)"}
            cur = (self.people.get(pid) or self.due.get(pid) or {}).get("band", "")
            p = {"action": "relabel", "band": band if band in BANDS else "", "type": type if type in PRO_TYPES else "", "expect_band": cur or ""}
        elif action == "task":
            if not (task or "").strip() or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", due or ""):
                return {"error": "task needs task text and due as YYYY-MM-DD"}
            p = {"action": "task", "task": task.strip(), "due": due}
        elif action == "note":
            if not (text or "").strip():
                return {"error": "note needs text"}
            p = {"action": "note", "text": text.strip()}
        else:
            return {"error": "action is relabel, task or note"}
        p.update(id=uuid.uuid4().hex[:8], person_id=pid, name=self.name(pid), why=(why or "").strip())
        self.proposals.append(p)
        return {"queued": True, "id": p["id"], "note": "On Caleb's screen for a yes. Nothing written yet."}

    def run(self, name: str, args: dict) -> dict:
        fn = getattr(self, name, None) if name in {t["name"] for t in TOOLS} else None
        if not fn:
            return {"error": f"no tool {name}"}
        try:
            return fn(**(args or {}))
        except TypeError as e:
            return {"error": f"bad input for {name}: {e}"}


def ask(client, model: str, tools: Tools, question: str, history: list[dict] | None = None, effort: str = "medium") -> dict:
    """The tool loop. Returns answer, proposals, the tool calls made (for tests and the eval) and token usage.
    `client` is an anthropic.Anthropic (or a fake with the same shape)."""
    messages = list(history or []) + [{"role": "user", "content": f"Today is {tools.today}. Caleb asked, by voice: {question}"}]
    used = {"input_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}
    calls = []
    # Caching: tools + system are byte-stable, so one explicit breakpoint on system caches that prefix across every
    # question, and top-level automatic caching covers the growing tool loop inside one question. Nothing volatile
    # (today's date, the question) sits above the breakpoint.
    kwargs = dict(model=model, max_tokens=1500, tools=TOOLS, output_config={"effort": effort},
                  system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                  cache_control={"type": "ephemeral"})
    for _ in range(MAX_TURNS):
        try:  # refusal fallback on the current Opus and Fable models; older SDKs do not know the parameter
            resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", messages=messages, **kwargs)
        except TypeError:
            resp = client.messages.create(messages=messages, **kwargs)
        for k in used:
            used[k] += int(getattr(resp.usage, k, 0) or 0)
        if getattr(resp, "stop_reason", "") == "refusal":
            return {"answer": "", "refused": True, "proposals": tools.proposals, "calls": calls, "usage": used}
        blocks = list(resp.content)
        uses = [b for b in blocks if getattr(b, "type", "") == "tool_use"]
        if not uses:
            text = " ".join(b.text for b in blocks if getattr(b, "type", "") == "text").strip()
            return {"answer": text, "proposals": tools.proposals, "calls": calls, "usage": used, "model": getattr(resp, "model", model)}
        messages.append({"role": "assistant", "content": [b.model_dump() if hasattr(b, "model_dump") else vars(b) for b in blocks]})
        results = []
        for b in uses:
            out = tools.run(b.name, dict(b.input or {}))
            calls.append({"tool": b.name, "input": dict(b.input or {})})
            results.append({"type": "tool_result", "tool_use_id": b.id, "content": json.dumps(out, ensure_ascii=False, default=str)})
        messages.append({"role": "user", "content": results})
    return {"answer": "I went around in circles on that one. Ask it a simpler way.", "proposals": tools.proposals,
            "calls": calls, "usage": used}
