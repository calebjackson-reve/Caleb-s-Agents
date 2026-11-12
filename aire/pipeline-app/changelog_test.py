"""Checks for the weekly changelog step in learn.retrain, with made-up people and temp folders.
Run: python3 aire/pipeline-app/changelog_test.py"""
import json
import random
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

import learn

fails = 0


def check(ok, label):
    global fails
    print(("ok   " if ok else "FAIL ") + label)
    fails += 0 if ok else 1


random.seed(11)
tmp = Path(tempfile.mkdtemp())
FR = {"money": 1, "intent": 0.5, "waiting": 0, "cadence": 1}


def made(n, start, signal="activity", tag="p"):
    out = []
    for i in range(n):
        x = {k: random.choice([0, 0, 1]) * random.choice([0.33, 0.67, 1]) for k in learn.FEATURES["seller"]}
        d = start + timedelta(days=i % 20)
        out.append(({"day": d.isoformat(), "week": learn.week_of(d), "list": "seller", "person_id": f"{tag}{start}{i}", "rank": i + 1, "top": i < 25, "score": 0, "x": x},
                    random.random() < 0.08 + 0.75 * x[signal]))
    return out


def seed(folder, pairs):
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / "ranked.jsonl").open("a") as fh:
        fh.write("".join(json.dumps(r) + "\n" for r, _ in pairs))
    return {r["person_id"]: {"appointment": [(date.fromisoformat(r["day"]) + timedelta(days=10)).isoformat()]} for r, y in pairs if y}


# ---- top 10 rank changes by person_id, and the no-change case
a = tmp / "moves"
rows = lambda ids: [{"person_id": p, "score": 50, "fractions": FR} for p in ids]
learn.log_ranked(a, date(2026, 11, 9), rows(["ann1", "bob2", "cy3"]), [])
learn.log_ranked(a, date(2026, 11, 16), rows(["bob2", "ann1", "dee4"]), [])
v = learn.retrain(a, {}, date(2026, 11, 16))
text = (a / "changelog.md").read_text()
check("## 2026-11-16 (version 1, week of 2026-11-16)" in text, "the entry is dated and carries the version")
check("call10 weights before: money 40, intent 30, waiting 20, cadence 10" in text and "call10 weights after: money 40, intent 30, waiting 20, cadence 10 (no change)" in text, "no-change case: before and after are the same and it says so")
check("ann1 1 to 2" in text and "bob2 2 to 1" in text and "dee4 entered at 3" in text and "cy3 left from 3" in text, "top 10 moves are listed by person_id")
check("rollback: none" in text and "Ann" not in text and "Bob" not in text, "no rollback, and no names in the file")
check(learn.top_moves(learn._lines(a / "ranked.jsonl"), "2026-11-09") is None, "with no earlier week there is nothing to compare")

# ---- before and after weights, outcomes added since last retrain
b = tmp / "weights"
ev = seed(b, made(12, date(2026, 6, 1)))
v1 = learn.retrain(b, ev, date(2026, 11, 9))
ev.update(seed(b, made(148, date(2026, 6, 1), tag="q")))
v2 = learn.retrain(b, ev, date(2026, 11, 16))
text = (b / "changelog.md").read_text()
added = v2["lists"]["seller"]["rows"] - v1["lists"]["seller"]["rows"]
second = text.split("## ")[2]
check(v2["lists"]["seller"]["used"] and "seller weights before: years 30, equity 20, life 20, activity 15, past 15, anniversary 0" in second and "seller weights after: years 28.8" in second and "(no change)" not in second.split("call10")[0], "changed weights show before and after")
check(f"seller outcomes added since last retrain: {added} " in text and added > 100 and "seller outcomes added since last retrain: 12 " in text, f"outcomes added are counted against the last retrain ({added})")
check(len(text.split("## ")) == 3, "each retrain appends one entry")

# ---- rollback
c = tmp / "worse"
ev3 = {**seed(c, made(150, date(2026, 1, 5), "activity")), **seed(c, made(60, date(2026, 7, 6), "years"))}
learn._write(c / "versions.json", [{"version": 1, "date": "2026-11-02", "week": "2026-11-02", "lists": {"seller": {}, "call10": {}},
                                   "weights": {"seller": {"years": 60.0, "equity": 0.0, "life": 10.0, "activity": 10.0, "past": 10.0, "anniversary": 10.0}, "call10": learn.HAND["call10"]}}])
v3 = learn.retrain(c, ev3, date(2026, 11, 9))
text = (c / "changelog.md").read_text()
check(v3["lists"]["seller"]["used"] is False and "seller rollback: new weights tested" in text and "last week's weights kept" in text and "call10 rollback: none" in text, "a rollback is written with both test scores")

# ---- dry mode
d = tmp / "dry"
ev4 = seed(d, made(12, date(2026, 6, 1)))
v4 = learn.retrain(d, ev4, date(2026, 11, 9), dry=True)
check(not (d / "changelog.md").exists() and v4["changelog"]["written"] is False and v4["changelog"]["entry"].startswith("## 2026-11-09"), "dry writes no changelog but returns the entry")
alt = tmp / "elsewhere" / "log.md"
learn.retrain(tmp / "dry2", {}, date(2026, 11, 9), changelog=alt, dry=True)
check(alt.exists() and not (tmp / "dry2" / "changelog.md").exists(), "dry with a path writes only to that path")

# ---- a changelog failure never fails the retrain or changes a weight
e1, e2 = tmp / "ok", tmp / "bad"
ev5 = seed(e1, made(160, date(2026, 6, 1)))
seed(e2, [(json.loads(x), 0) for x in (e1 / "ranked.jsonl").read_text().splitlines()])
good = learn.retrain(e1, ev5, date(2026, 11, 9))
blocker = tmp / "blocker"
blocker.write_text("a file, so nothing can be made under it")
bad = learn.retrain(e2, ev5, date(2026, 11, 9), changelog=blocker / "log.md")
check("error" in bad["changelog"] and bad["changelog"]["written"] is False, "an unwritable changelog is recorded as an error")
check(bad["weights"] == good["weights"] and json.loads((e2 / "versions.json").read_text())[0]["weights"] == good["weights"], "the version and weights are the same and still saved")
orig = learn.changelog_entry
learn.changelog_entry = lambda *a, **k: 1 / 0
try:
    worse = learn.retrain(tmp / "boom", {}, date(2026, 11, 9))
    check("ZeroDivisionError" in worse["changelog"]["error"] and (tmp / "boom" / "versions.json").exists(), "an error inside the entry code is recorded, not raised")
finally:
    learn.changelog_entry = orig

print("\nALL PASS" if not fails else f"\n{fails} FAILED")
sys.exit(1 if fails else 0)
