"""Audience pools for Pipeline's predraft step. One job: given a feed row, say which pool the person is in and
hand back the next unused line from that pool, filled in. No sending here, no network, no file writes.

    from pools import load_templates, audience, next_line
    t = load_templates()
    pool = audience(row)                                  # sphere, past-client, active-buyer, seller-candidate, partner, recruit, new-lead, under-contract, seller-presentation
    text = next_line(t["texts"][pool], used=[0, 2], row=row)      # short line for a text
    body = next_line(t["pools"][pool], used=[], row=row) + SIGNOFF  # email body

Pipeline is the one sender (Caleb, 2026-10-20). It keeps its own send log, Do Not Contact check and daily cap.
"""
from __future__ import annotations
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates.md"
SIGNOFF = "\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303"
SELLER_WORDS = ("equity_review", "mover", "sell", "listing", "downsiz", "upsiz", "land")


def load_templates() -> dict:
    text = TEMPLATES.read_text(encoding="utf-8")
    sections: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line.rstrip())
    pools: dict[str, list[str]] = {}
    texts: dict[str, list[str]] = {}
    for name, lines in sections.items():
        if name.startswith("Pool: "):
            pools[name[6:].strip()] = [re.sub(r"^\d+\.\s*", "", l) for l in lines if re.match(r"^\d+\.", l)]
        elif name.startswith("Text: "):
            texts[name[6:].strip()] = [re.sub(r"^\d+\.\s*", "", l) for l in lines if re.match(r"^\d+\.", l)]

    def phrases(key: str) -> list[str]:
        for name, lines in sections.items():
            if name.lower().startswith(key):
                return [p.strip().lower() for p in " ".join(lines).split("|") if p.strip()]
        return []

    tests = []
    for name, lines in sections.items():
        if name.lower().startswith("test addresses"):
            tests = [l.strip().lower() for l in lines if "@" in l]
    return {"pools": pools, "texts": texts, "subjects": phrases("subjects"), "optout": phrases("opt-out"),
            "handoff": phrases("hand-to-caleb"), "tests": tests}


def audience(row: dict) -> str:
    """Which pool a CRM person belongs to. Who they are to Caleb decides first, then what they are doing."""
    typ = (row.get("type") or "").lower()
    stage = (row.get("stage") or "").lower()
    opp = (row.get("opportunity_types") or "").lower()
    nxt = (row.get("next_action") or "").lower()
    if typ in ("agent", "lender", "vendor"):
        return "partner"
    if typ == "recruit":
        return "recruit"
    if "new lead" in stage or "contacted" in stage:
        return "new-lead"
    if "under contract" in stage or stage == "active":
        return "under-contract"
    if "active_buyer" in opp or "buyer" in nxt or "pre-approved" in nxt or "preapproved" in nxt:
        return "active-buyer"
    if any(w in opp or w in nxt for w in SELLER_WORDS):
        return "seller-candidate"
    if "past client" in stage or "past_client" in opp:
        return "past-client"
    return "sphere"


def first_name(row: dict) -> str:
    """A usable first name, or '' when the row is a phone number, a household or a question mark."""
    name = row.get("display") or row.get("name") or ""
    first = (name.split() or [""])[0].title()
    if not first.isalpha() or first.lower() in ("household", "unknown"):
        return ""
    return first


def pick_template(pool: list[str], used: list[int]) -> int | None:
    """Next template index not yet used on this person, in order. None when the pool is exhausted."""
    for i in range(len(pool)):
        if i not in used:
            return i
    return None


def fill(template: str, row: dict) -> str:
    return template.replace("{{firstName}}", first_name(row) or "there").replace("{{address}}", row.get("address") or "your place")


def next_line(pool: list[str], used: list[int], row: dict) -> tuple[int, str] | None:
    """(index, filled text) for the next unused line, or None when exhausted or the person has no usable first name."""
    if not first_name(row):
        return None
    i = pick_template(pool, used)
    return None if i is None else (i, fill(pool[i], row))
