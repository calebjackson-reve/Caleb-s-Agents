#!/usr/bin/env python3
"""Two today, the practice run. A report only: no screen, no draft, no send, no CRM write, and nothing read from
Instagram or Facebook. It reads the engagers list a person filled in by hand (who liked, commented on or shared
Caleb's own posts, with each post's type), matches handles to the CRM through handles.csv, applies every gate and
hold rule in outreach.py, scores people the way the outreach plan says, and writes one week of "two today" picks:
for each day the two picks (who and why) and the next three backups.

  python3 two_today.py --example                         # the made-up people in fixtures/two-today-example
  python3 two_today.py [--engagers F] [--handles F] [--posts F] [--feed F] [--end YYYY-MM-DD] [--days 7] [--out F]

Defaults: ../enrichment/out/engagers.csv, handles.csv and (when it is there) posts.csv, ../crm/feed.json, and the
report goes to out/two-today-practice-<end>.md. Those folders are git-ignored: the real list and the report stay on
the Mac. Prints counts only, never a name.

Scoring (look back 14 days from each day):
  engagement    like 1, follow 2, comment 3, story reply 3, share 4, direct message 5 (social_signals.WEIGHT). Full
                value in the last 7 days, half for days 8 to 14. Capped at 12.
  reason        the best one only: commented on or shared a listing, just-sold, open house or market post 7, liked 3
                or more of those 5, liked 1 or 2 of them 2. Only personal or neighborhood posts: 0, not eligible.
  match         a handle on file for a CRM person 5, unmatched 0
  timing        past their cadence date 3, otherwise 0
Ties go to the higher transact score when the feed row has one, then the longer silence. Nothing about the person's
own profile is scored. A question in a comment, message or story reply is a reply Caleb owes: it goes on the reply
list and never takes a pick slot. An unmatched handle never gets a text, and takes a slot only when fewer than two
matched people qualify. Nobody is a pick twice in 30 days. If one person qualifies, one is shown. Never padded.

Holds and cadence are read from the feed as it is on the last day, for every day of the week."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
AIRE = HERE.parent
EXAMPLE = HERE / "fixtures" / "two-today-example"
sys.path.insert(0, str(AIRE / "enrichment" / "execution"))

import outreach  # noqa: E402
import social_signals as social  # noqa: E402

LOOKBACK, REPEAT_DAYS, ENGAGE_CAP = 14, 30, 12
POST_WORDS = {"listing": "listing", "just_sold": "just sold", "open_house": "open house", "market_update": "market", "neighborhood": "neighborhood", "personal": "personal"}
DID = {"comment": "Commented on", "share": "Shared", "dm": "Messaged you about", "story_reply": "Replied to", "like": "Liked", "follow": "Followed you"}


def read_csv(path: Path) -> list[dict]:
    with Path(path).open(newline="", encoding="utf-8-sig") as f:
        return [{(k or "").strip().lower(): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]


def read_json(path: Path, default):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _day(v) -> date | None:
    try:
        return date.fromisoformat(str(v or "")[:10])
    except ValueError:
        return None


def _nice(d: date) -> str:
    return f"{d.strftime('%a %b')} {d.day}"


def _silence(row: dict, today: date) -> int:
    """Days since the last contact either way. Never touched counts as the longest silence."""
    if isinstance(row.get("days_quiet"), int):
        return row["days_quiet"]
    seen = [d for d in (_day(row.get("last_inbound")), _day(row.get("last_outbound"))) if d and d <= today]
    return (today - max(seen)).days if seen else 99999


def score_day(day: date, engagers: list[dict], handles: list[dict], ctx: dict, picked: dict | None = None) -> dict:
    """One day's picks. `engagers` are with_post_types rows, `ctx` is outreach.context, `picked` is {key: day} of
    earlier social picks. Returns picks (two at most), backups (three at most), replies and everyone left out with why."""
    picked = picked or {}
    who = {(r.get("platform", "").lower(), social.norm_handle(r.get("handle", ""))): str(r.get("person_id") or "") for r in handles if r.get("handle")}
    people: dict = {}
    replies, unreadable = [], 0
    for e in engagers:
        d = _day(e.get("date"))
        if d is None:
            unreadable += 1  # a row with no readable date is never scored
            continue
        if d > day or (day - d).days > LOOKBACK:
            continue
        key = ((e.get("platform") or "").lower(), social.norm_handle(e.get("handle", "")))
        pid = who.get(key, "")
        k = pid or f"unmatched:{key[0]}:{key[1]}"
        p = people.setdefault(k, {"key": k, "person_id": pid, "handle": key[1], "platform": key[0], "acts": [], "question": False})
        p["acts"].append({"day": d, "action": e.get("action", ""), "post_type": e.get("post_type", ""), "said": e.get("said", "")})
        if e.get("action") in ("comment", "dm", "story_reply") and "?" in (e.get("said") or ""):
            p["question"] = True
            replies.append({"key": k, "person_id": pid, "handle": key[1], "platform": key[0], "day": d.isoformat(), "action": e["action"], "post_type": e.get("post_type", "")})
    cands, out = [], []
    for k, p in people.items():
        row = ctx["rows"].get(p["person_id"]) if p["person_id"] else None
        name = (row or {}).get("display") or ("@" + p["handle"])
        leave = lambda why, rule: out.append({"key": k, "who": name, "rule": rule, "why": why})
        real = [a for a in p["acts"] if a["post_type"] in social.REAL_ESTATE_POSTS]
        strong = sorted((a for a in real if a["action"] in ("comment", "share")), key=lambda a: a["day"])
        likes = [a for a in real if a["action"] == "like"]
        reason_pts = 7 if strong else 5 if len(likes) >= 3 else 2 if likes else 0
        if p["question"]:
            leave("Asked a question. It is on the reply list, not a pick.", "reply")
            continue
        if not reason_pts:
            leave("No real estate reason: only personal or neighborhood posts, or no post type filled in.", "no_reason")
            continue
        if k in picked and 0 <= (day - picked[k]).days < REPEAT_DAYS:
            leave(f"Already a social pick {(day - picked[k]).days} days ago. One pick per person in {REPEAT_DAYS} days.", "repeat")
            continue
        timing, quiet, transact = 0, 99999, None
        if p["person_id"]:  # a matched person passes every gate and hold rule, or is left out with the reason
            if row is None:
                leave("Handle is on file, but the person is not in the CRM feed (Do Not Contact people never are).", "gate")
                continue
            if str(row.get("type") or "").lower() in outreach.PRO_TYPES or p["person_id"] in ctx["partners"]:
                leave("Vendor, agent, lender or recruit: not client outreach.", "gate")
                continue
            first = outreach.first_name(row.get("display"))
            if not first.isalpha():
                leave("No usable first name. Hand to Caleb.", "gate")
                continue
            hold = outreach.hold_for(p["person_id"], ctx, "text")
            if hold:
                leave(hold["why"] + (f" Until {hold['until']}." if hold.get("until") else ""), hold["rule"])
                continue
            due = p["person_id"] in ctx["due"]
            if not due and not outreach.pull_ahead_ok(p["person_id"], ctx):
                leave("Cold, inside cadence, and something already went out in the last 30 days.", "pull_ahead")
                continue
            timing, quiet, transact = (3 if due else 0), _silence(row, ctx["today"]), row.get("transact_score")
        age = lambda a: (day - a["day"]).days
        engage = min(ENGAGE_CAP, sum(social.WEIGHT.get(a["action"], 1) * (1 if age(a) <= 7 else 0.5) for a in p["acts"]))
        match = 5 if p["person_id"] else 0
        if strong:
            a = strong[-1]
            why = f"{DID[a['action']]} your {POST_WORDS[a['post_type']]} post {_nice(a['day'])}."
            reason = {"type": "social_" + a["action"], "line": f"They {DID[a['action']].lower()} your {POST_WORDS[a['post_type']]} post.", "date": a["day"].isoformat(), "mention": True}
        else:  # likes are a reason to reach out and never a thing to quote
            why = f"Liked {len(likes)} of your real estate posts since {_nice(min(a['day'] for a in likes))}."
            reason = {"type": "likes", "line": why, "date": max(a["day"] for a in likes).isoformat(), "mention": False}
        if row:
            why += "".join(f" {x}." for x in (str(row.get("stage") or "").strip().capitalize(), f"Last talked {quiet} days ago" if quiet < 99999 else "No contact on record",
                                              "Past their cadence date" if timing else "Inside cadence") if x)
        total = engage + reason_pts + match + timing
        cands.append({"key": k, "person_id": p["person_id"], "who": name, "city": (row or {}).get("city", ""), "handle": p["handle"], "matched": bool(p["person_id"]),
                      "total": total, "parts": {"engagement": engage, "reason": reason_pts, "match": match, "timing": timing}, "why": why, "reason": reason,
                      "note": "" if p["person_id"] else "Not in your CRM yet. Never a text: link to a person, reply in Instagram, or skip.",
                      "_sort": (-total, -(transact if isinstance(transact, (int, float)) else -1), -quiet, name)})
    cands.sort(key=lambda c: c["_sort"])
    matched = [c for c in cands if c["matched"]]
    picks = matched[:2] + ([c for c in cands if not c["matched"]][:2 - len(matched[:2])] if len(matched) < 2 else [])
    chosen = {c["key"] for c in picks}
    backups = [c for c in cands if c["key"] not in chosen][:3]
    strip = lambda c: {k: v for k, v in c.items() if k != "_sort"}
    return {"day": day.isoformat(), "picks": [strip(c) for c in picks], "backups": [strip(c) for c in backups], "replies": replies, "out": out, "unreadable_rows": unreadable}


def run_week(end: date, days: int, engagers: list[dict], handles: list[dict], ctx: dict, picked: dict | None = None) -> list[dict]:
    """`days` days ending on `end`, oldest first. Each day's picks rest for 30 days, so later days cannot repeat them."""
    picked, out = dict(picked or {}), []
    for n in range(days - 1, -1, -1):
        day = end - timedelta(days=n)
        r = score_day(day, engagers, handles, ctx, picked)
        for c in r["picks"]:
            picked[c["key"]] = day
        out.append(r)
    return out


def report(week: list[dict], example: bool = False) -> str:
    def card(c: dict, i: int) -> list[str]:
        p = c["parts"]
        where = f" ({c['city']})" if c.get("city") else ""
        lines = [f"{i}. **{c['who']}**{where}, {c['total']:g} points. {c['why']}",
                 f"   Points: engagement {p['engagement']:g}, reason {p['reason']}, match {p['match']}, timing {p['timing']}. "
                 f"The text may mention it: {'yes' if c['reason']['mention'] else 'no, likes are never quoted'}."]
        return lines + ([f"   {c['note']}"] if c["note"] else [])

    lines = ["# Two today, practice run" + (" (EXAMPLE, made-up people)" if example else ""), "",
             "A practice run. Nothing was sent, drafted or written to the CRM. The engagers list was filled in by hand.",
             "Holds and cadence are read from the feed as it is on the last day. Stays on this Mac.", ""]
    for r in week:
        d = date.fromisoformat(r["day"])
        lines += [f"## {d.strftime('%A')}, {_nice(d)}", ""]
        lines += ["Picks:" if r["picks"] else "Picks: none. Nobody qualified, and the list is never padded."]
        for i, c in enumerate(r["picks"], 1):
            lines += card(c, i)
        if len(r["picks"]) == 1:
            lines += ["   Only one person qualified today."]
        if r["backups"]:
            lines += ["", "Backups:"]
            for i, c in enumerate(r["backups"], 1):
                lines += card(c, i)
        if r["replies"]:
            lines += ["", "Reply in Instagram (a question you owe an answer, not one of the two):"]
            lines += [f"- @{q['handle']} asked a question on {_nice(date.fromisoformat(q['day']))}" + (f", {POST_WORDS.get(q['post_type'], '')} post" if q.get("post_type") else "") + "." for q in r["replies"]]
        if r["out"]:
            lines += ["", "Left out:"] + [f"- {o['who']}: {o['why']}" for o in r["out"]]
        lines.append("")
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--example", action="store_true", help="run on the made-up people in fixtures/two-today-example")
    ap.add_argument("--engagers")
    ap.add_argument("--handles")
    ap.add_argument("--posts")
    ap.add_argument("--feed")
    ap.add_argument("--end", help="last day of the week, YYYY-MM-DD. Default: the feed's day")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    src = EXAMPLE if a.example else AIRE / "enrichment" / "out"
    engagers_p, handles_p = Path(a.engagers or src / "engagers.csv"), Path(a.handles or src / "handles.csv")
    posts_p = Path(a.posts or src / "posts.csv")
    feed_p = Path(a.feed or (EXAMPLE / "people.json" if a.example else AIRE / "crm" / "feed.json"))
    for p in (engagers_p, handles_p, feed_p):
        if not p.exists():
            print(f"two today: {p.name} is not there yet, nothing to score")
            return 1
    feed = read_json(feed_p, {})
    end = _day(a.end) or _day(feed.get("as_of")) or date.today()
    logs = (lambda n: []) if a.example else (lambda n: (lambda v: v if isinstance(v, list) else [])(read_json(HERE / "out" / n, [])))
    ctx = outreach.context(feed, end, send_log=logs("send-log.json"), bridge_log=logs("bridge-log.json"))
    engagers = social.with_post_types(read_csv(engagers_p), read_csv(posts_p) if posts_p.exists() else [])
    week = run_week(end, a.days, engagers, read_csv(handles_p), ctx)
    out = Path(a.out or HERE / "out" / f"two-today-practice-{end.isoformat()}{'-example' if a.example else ''}.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report(week, a.example), encoding="utf-8")
    print(f"two today practice run: {len(week)} days, {sum(len(r['picks']) for r in week)} picks, {sum(len(r['backups']) for r in week)} backups, "
          f"{len({q['key'] for r in week for q in r['replies']})} to reply to, {len(engagers)} rows read -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
