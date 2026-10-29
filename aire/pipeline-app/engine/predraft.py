#!/usr/bin/env python3
"""Pre-written drafts for the people at the top of the feed, so Pipeline opens with one ready.

Ported from the retired native app on 2026-10-29. Run by aire/crm/refresh_feed.sh after every feed rebuild,
with the Python that has Full Disk Access. Reads feed.json and Messages (read only), drafts with the on-Mac
model, and writes only $AIRE_HOME/pipeline/predrafts.json (0600). Never sends, never writes the CRM.

Who gets what:
  - People who texted last (owes_reply): a model reply written from the real conversation. Never a template.
    Redrafted only when the conversation changed. Up to MAX_REPLIES per run, model calls are slow.
  - Everyone else on the list: the next unused check-in line from their follow-up pool (aire/follow-up/pools.py,
    instant). Nobody gets the same line twice: used template ids come from Pipeline's own send log.

Why drafts used to fail (feed.log, 2026-10-29: "failed": 3 of 28, then 4 of 27, "drafted": 0):
  the model was never told the validator's rules, so it wrote "I'll", "I'm" and sentence-opening words like
  "Sure" that the old name check read as a stranger's name. Both retries hit the same wall. Now the prompt
  states every banned form, the retry quotes the exact refusal, there are three tries, sentence-starting
  words are not names, and every refusal reason is counted in the log line (never a name or a message).

Prints one JSON line of counts. Env: AIRE_HOME, AIRE_FEED, AIRE_FOLLOWUP, AIRE_PREDRAFTS, AIRE_MODEL, AIRE_MODEL_URL.
"""
from __future__ import annotations

import collections
import datetime as dt
import json
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import conversation as rc  # noqa: E402

REPO_AIRE = HERE.parents[1]
AIRE_HOME = pathlib.Path(os.environ.get("AIRE_HOME") or pathlib.Path.home() / ".aire")
FEED = pathlib.Path(os.environ.get("AIRE_FEED") or REPO_AIRE / "crm" / "feed.json")
FOLLOWUP = pathlib.Path(os.environ.get("AIRE_FOLLOWUP") or REPO_AIRE / "follow-up")
OUT = pathlib.Path(os.environ.get("AIRE_PREDRAFTS") or AIRE_HOME / "pipeline" / "predrafts.json")
STATE = pathlib.Path(os.environ.get("AIRE_PIPELINE_STATE") or AIRE_HOME / "pipeline" / "state.json")
FEED_MAX_AGE = 7200
TIME_BUDGET = int(os.environ.get("AIRE_PREDRAFT_BUDGET", "300"))   # seconds per run, so a slow model never stacks runs
MAX_REPLIES = 12
MAX_CHECKINS = 25
TRIES = 3


def load_feed():
    try:
        f = json.loads(FEED.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, "no feed"
    at = rc.parse(f.get("generated_at", ""))
    if not at or (dt.datetime.now(dt.timezone.utc) - at).total_seconds() > FEED_MAX_AGE:
        return None, "feed stale"
    if f.get("header_ok") is False:
        return None, "header_ok false"
    return f, ""


def candidates(feed):
    rows = feed.get("touches_due", []) or []
    owes = [r for r in rows if r.get("owes_reply")][:MAX_REPLIES]
    rest = [r for r in rows if not r.get("owes_reply")][:MAX_CHECKINS]
    return [r for r in owes + rest if str(r.get("person_id", ""))]


def used_templates():
    """Template ids already sent to each person, from Pipeline's send log. Nobody gets the same line twice."""
    try:
        sends = json.loads(STATE.read_text(encoding="utf-8")).get("sends", []) or []
    except (OSError, ValueError):
        return {}
    used = {}
    for s in sends:
        if s.get("template_id") and s.get("status") in ("sent", "handed_off", "live_sent"):
            used.setdefault(str(s.get("person_id", "")), set()).add(s["template_id"])
    return used


def load_pools():
    """aire/follow-up/pools.py when present (it lands with PR 61). Without it, check-in lines are skipped."""
    try:
        sys.path.insert(0, str(FOLLOWUP))
        import pools  # type: ignore
        return pools, pools.load_templates()
    except Exception:
        return None, None


def template_draft(row, channel, used, pools, templates):
    person = {**row, "display": row.get("display", ""), "address": ""}
    pool = pools.audience(person)
    lines = (templates["texts"] if channel == "Text" else templates["pools"]).get(pool) or []
    prefix = f"{pool}:{channel}:"
    taken = [int(t.split(":")[-1]) for t in used if t.startswith(prefix) and t.split(":")[-1].isdigit()]
    got = pools.next_line(lines, used=taken, row=person)
    if not got:
        return None
    i, text = got
    body = text if channel == "Text" else text + pools.SIGNOFF
    subject = "" if channel == "Text" else (templates["subjects"][i % len(templates["subjects"])] if templates["subjects"] else "Checking in")
    return dict(body=body, subject=subject, method="template", templateID=prefix + str(i), pool=pool)


def run():
    feed, why = load_feed()
    if not feed:
        return {"ok": False, "reason": why}
    try:
        old = json.loads(OUT.read_text(encoding="utf-8")).get("drafts", {})
    except (OSError, ValueError):
        old = {}
    pools, templates = load_pools()
    used = used_templates()
    counts = collections.Counter()
    reasons = collections.Counter()
    drafts = {}
    start = time.time()
    reader = rc.Reader()
    if reader.error:
        counts["messages_unavailable"] = 1
    try:
        for row in candidates(feed):
            pid = str(row["person_id"])
            channel = "Text" if row.get("phone") else "Email"
            if not row.get("owes_reply"):
                t = template_draft(row, channel, used.get(pid, set()), pools, templates) if pools else None
                if t:
                    drafts[pid] = dict(contextHash="", channel=channel, latestTurnAt="",
                                       draftedAt=dt.datetime.now(dt.timezone.utc).isoformat(), **t)
                    counts["templated"] += 1
                else:
                    counts["skipped"] += 1
                    reasons["no pool line" if pools else "pools.py missing"] += 1
                continue
            ctx = reader.read(row.get("phone", ""), row.get("email", ""), row.get("display", ""), pid)
            if not ctx.get("available") or not ctx.get("turns"):
                counts["skipped"] += 1
                reasons["no conversation"] += 1
                continue
            prior = old.get(pid)
            if prior and prior.get("contextHash") == ctx["contextHash"] and prior.get("channel") == channel and prior.get("body"):
                drafts[pid] = prior
                counts["kept"] += 1
                continue
            if time.time() - start > TIME_BUDGET:
                counts["skipped"] += 1
                reasons["out of time"] += 1
                continue
            d, rejected = None, ""
            for _ in range(TRIES):
                try:
                    d = rc.draft(ctx, channel, rejected=rejected)
                    break
                except ValueError as e:
                    rejected = str(e)
                    reasons[rejected[:60]] += 1
                except Exception as e:
                    rejected = f"{type(e).__name__}"
                    reasons["model error: " + type(e).__name__] += 1
                    if "URLError" in rejected or "Connection" in rejected:
                        break  # the model is down; do not burn the budget on it
            if not d:
                counts["failed"] += 1
                continue
            latest = max((t.get("at", "") for t in ctx["turns"]), default="")
            drafts[pid] = dict(contextHash=ctx["contextHash"], channel=channel, body=d["body"], subject=d.get("subject", ""),
                               method=d.get("method", "local-model"), latestTurnAt=latest,
                               draftedAt=dt.datetime.now(dt.timezone.utc).isoformat())
            counts["drafted"] += 1
    finally:
        reader.close()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(f".{os.getpid()}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(json.dumps({"generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "drafts": drafts}))
    tmp.replace(OUT)
    return {"ok": True, **{k: counts[k] for k in ("kept", "drafted", "templated", "skipped", "failed")},
            "total": len(drafts), "seconds": round(time.time() - start), "reasons": dict(reasons.most_common(8))}


if __name__ == "__main__":
    print(json.dumps(run()))  # counts and refusal reasons only, never names or message text
