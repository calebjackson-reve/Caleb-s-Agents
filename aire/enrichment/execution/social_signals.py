#!/usr/bin/env python3
"""Social signals. One job: turn an engagers list into per-handle counts.

Instagram and Facebook give no per-person API for who liked or commented on Caleb's posts, so the
input is a CSV the Mac companion (Claude in Chrome) fills in while scrolling Caleb's own recent posts:

  handle,platform,action,date,post
  jane.doe,instagram,comment,2026-10-12,https://www.instagram.com/p/...
  jane.doe,instagram,like,2026-10-15,...
  JohnD,facebook,share,2026-10-01,...

Metricool stays account level (reach, best posting times) and goes in the morning brief, not here.

  python3 social_signals.py --engagers ../out/engagers.csv --handles ../out/handles.csv
handles.csv (person_id,platform,handle) comes from merge_hwc.py (the Hot-Warm-Cold sheet has Instagram and Facebook columns).
"""
from __future__ import annotations
import argparse
import csv
import json
from datetime import date
from pathlib import Path

WEIGHT = {"like": 1, "comment": 3, "share": 4, "dm": 5, "story_reply": 3, "follow": 2}

# Since 2026-11-12 the engagers list may also say what kind of post each row was on, so a like on a just-sold and a
# like on a dog photo stop looking the same. Two optional columns, and the old five-column file still loads:
#   post_type   listing, just_sold, open_house, market_update, neighborhood or personal
#   said        what they wrote, for comments and messages. It stays on the Mac, like text snippets do.
# The post type can also come from a small posts table filled once per post (post,post_type), keyed by the post URL.
# A person fills these in by hand. Nothing here reads Instagram or Facebook.
POST_TYPES = ("listing", "just_sold", "open_house", "market_update", "neighborhood", "personal")
REAL_ESTATE_POSTS = ("listing", "just_sold", "open_house", "market_update")
_POST_WORDS = {"just sold": "just_sold", "sold": "just_sold", "open house": "open_house", "market": "market_update", "market update": "market_update"}


def norm_post_type(v: str) -> str:
    """'Just Sold' -> 'just_sold', 'market' -> 'market_update'. Anything unknown is '' (not counted as real estate)."""
    t = " ".join((v or "").strip().lower().replace("_", " ").replace("-", " ").split())
    t = _POST_WORDS.get(t, t).replace(" ", "_")
    return t if t in POST_TYPES else ""


def norm_post(url: str) -> str:
    return (url or "").strip().lower().split("?")[0].rstrip("/")


def post_types(posts: list[dict]) -> dict:
    """The posts table as {post url: post type}."""
    return {norm_post(r.get("post", "")): norm_post_type(r.get("post_type", "")) for r in posts or [] if r.get("post")}


def with_post_types(engagers: list[dict], posts: list[dict] | None = None) -> list[dict]:
    """Each engagers row with a clean `action`, `post_type` (its own column first, then the posts table, else '') and `said`."""
    table = post_types(posts or [])
    return [{**e, "action": (e.get("action") or "").strip().lower().replace(" ", "_"),
             "post_type": norm_post_type(e.get("post_type", "")) or table.get(norm_post(e.get("post", "")), ""),
             "said": (e.get("said") or "").strip()} for e in engagers]


def norm_handle(h: str) -> str:
    return (h or "").strip().lstrip("@").lower().split("/")[-1]


def build(engagers: list[dict], handles: list[dict], as_of: date | None = None) -> dict:
    as_of = as_of or date.today()
    who = {(r["platform"].lower(), norm_handle(r["handle"])): r["person_id"] for r in handles if r.get("handle")}
    out: dict[str, dict] = {}
    for e in engagers:
        key = (e["platform"].lower(), norm_handle(e["handle"]))
        pid = who.get(key)
        d = {"person_id": pid, "handle": key[1], "platform": key[0]}
        s = out.setdefault(pid or f"unmatched:{key[0]}:{key[1]}", {**d, "social_90d": 0, "social_weight_90d": 0, "last_engaged": "", "actions": {}})
        try:
            age = (as_of - date.fromisoformat(e["date"][:10])).days
        except ValueError:
            age = 999
        if age <= 90:
            s["social_90d"] += 1
            s["social_weight_90d"] += WEIGHT.get(e["action"].lower(), 1)
        s["last_engaged"] = max(s["last_engaged"], e["date"][:10])
        s["actions"][e["action"].lower()] = s["actions"].get(e["action"].lower(), 0) + 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engagers", required=True)
    ap.add_argument("--handles", required=True)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "out" / "social-signals.json"))
    a = ap.parse_args()
    eng = list(csv.DictReader(open(a.engagers, newline="")))
    hs = list(csv.DictReader(open(a.handles, newline="")))
    out = build(eng, hs)
    Path(a.out).write_text(json.dumps(out, indent=1))
    matched = sum(1 for k in out if not k.startswith("unmatched"))
    print(f"{len(eng)} engagements, {matched} people matched, {len(out) - matched} handles not in CRM -> {a.out}")


if __name__ == "__main__":
    main()
