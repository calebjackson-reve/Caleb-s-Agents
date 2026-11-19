"""Checks for links.py (deals tied to people, the Fix list), proof.py (the weekly proof line) and learn.py (the
learning loop), with made-up people. Run: python3 aire/pipeline-app/round58_test.py"""
import json
import random
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path

import insight
import learn
import links
import proof

fails = 0


def check(ok, label):
    global fails
    print(("ok   " if ok else "FAIL ") + label)
    fails += 0 if ok else 1


TODAY = date(2026, 11, 11)  # a Wednesday
feed = {"people": [
    {"person_id": "1", "display": "Ann Buyer", "stage": "nurture", "street": "12 Oak St"},
    {"person_id": "2", "display": "Bob Buyer", "stage": "nurture", "street": "12 Oak St"},
    {"person_id": "3", "display": "Cara Linked", "stage": "showing scheduled", "street": ""},
    {"person_id": "4", "display": "Dee Named Person", "stage": "past client", "street": ""},
    {"person_id": "5", "display": "Eve Stale", "stage": "under contract", "street": "900 Gone Rd"},
    {"person_id": "6", "display": "", "stage": "", "street": "4 Blank Ct", "city": "Zachary"},
    {"person_id": "7", "display": "Ann Buyer", "stage": "", "street": ""},
    {"person_id": "8", "display": "Sold Sam", "stage": "nurture", "street": "77 Elm St"}],
    "touches_due": [{"person_id": "1", "display": "Ann Buyer", "stage": "nurture", "phone": "+12255550101"},
                    {"person_id": "3", "display": "Cara Linked", "stage": "showing scheduled", "phone": "+12255550101"}],
    "market": {"rows": [{"type": "pending", "label": "pending", "address": "55 Birch Ln", "date": "2026-11-08", "source": "Flexmls alert mail"},
                        {"type": "permit", "address": "12 Oak St", "date": "2026-11-01"}]}}
cards = [
    {"key": "12 oak", "deal": "12 Oak St", "stage": "contract", "status": "Under Contract", "side": "Buyer", "act": "2026-11-25", "since": "2026-11-03", "price": 300000.0, "commission": 9000.0, "differs": []},
    {"key": "40 pine", "deal": "40 Pine Rd", "stage": "contract", "status": "Under Contract", "side": "Listing", "act": "2026-12-01", "since": "2026-10-01", "price": 410000.0, "commission": None,
     "crm": {"person_id": "3", "address": "40 Pine Rd"}, "differs": [{"field": "price", "crm": "400000"}]},
    {"key": "9 fig", "deal": "9 Fig Way", "stage": "contract", "status": "Pending", "side": "Buyer", "act": None, "since": None, "price": None, "commission": None, "differs": []},
    {"key": "5 ash", "deal": "5 Ash Ct", "stage": "closed", "status": "Closed", "side": "Listing", "act": "2026-10-12", "since": "2026-09-01", "price": 250000.0, "commission": 7500.0,
     "check": "Sellers Dee Named Person and spouse. Paid.", "differs": []},
    {"key": "55 birch", "deal": "55 Birch Ln", "stage": "appointment", "status": "Active Listing", "side": "Listing", "act": None, "since": "2026-10-20", "price": 199000.0, "commission": None, "differs": []},
    {"key": "8 gum", "deal": "8 Gum St", "stage": "offer", "status": "Offer", "side": "Buyer", "since": "2026-11-01", "price": 180000.0, "commission": None, "offer": {"expired": True, "date": "2026-11-06"}, "differs": []},
    {"key": "3 bay", "deal": "3 Bay Dr", "stage": "offer", "status": "Offer", "side": "Buyer", "since": "2026-11-09", "price": 210000.0, "commission": None, "offer": {"expired": False, "date": "2026-11-14"}, "differs": []},
    {"key": "77 elm", "deal": "77 Elm St", "stage": "closed", "status": "Closed", "side": "Buyer", "act": "2025-11-20", "since": "2025-10-01", "price": 230000.0, "commission": 6900.0, "differs": []},
]
sales = [{"close": "2025-11-20", "address": "77 Elm Street", "side": "Buyer", "price": 235000}, {"close": "2026-05-11", "address": "12 Oak St", "side": "Buyer", "price": 1}]

# ---- 5. deals tied to people
ties = links.tie(cards, feed)
t = {x["key"]: x for x in ties}
check([p["person_id"] for p in t["12 oak"]["people"]] == ["1", "2"] and t["12 oak"]["how"] == "same address", "a deal is tied to everyone at its address")
check([p["person_id"] for p in t["40 pine"]["people"]] == ["3"] and t["40 pine"]["how"] == "CRM Deals tab", "the CRM Deals tab link wins")
check([p["person_id"] for p in t["5 ash"]["people"]] == ["4"] and t["5 ash"]["how"] == "name in the deal's note", "then the whole name in the deal's note")
check(t["9 fig"]["people"] == [] and t["9 fig"]["how"] == "", "a deal nobody matches is tied to nobody, never a guess")
lk = links.unlinked(ties)
check([r["key"] for r in lk] == ["3 bay", "55 birch", "9 fig"] and all(r["why"].startswith("No person is tied") for r in lk) and lk[2]["status"] == "Pending",
      "Link this deal: every live deal with no person tied is listed, and an expired offer or a closed deal is not")
check(links.unlinked([{**x, "people": [{"person_id": "1", "display": "Ann Buyer"}]} for x in ties]) == [] and "8 gum" not in [r["key"] for r in lk] and "5 ash" not in [r["key"] for r in lk],
      "a deal with a person on it is not on the list")
over = links.overlay(ties, feed)
check(over["1"]["stage"] == "under contract" and over["3"]["stage"] == "under contract" and over["4"]["stage"] == "past client" and over["8"]["stage"] == "past client" and "5" not in over,
      "a signed contract makes them Under contract, a closing makes them Past client")
shown = links.apply_overlay(feed, over)
check(shown["touches_due"][0]["stage"] == "under contract" and shown["touches_due"][0]["sheet_stage"] == "nurture" and feed["touches_due"][0]["stage"] == "nurture",
      "the stage shows in Pipeline with the sheet's own stage kept beside it, and the feed itself is not changed")
c = links.counts(ties)
check(c == {"open": 5, "contract": 3, "offer": 1, "listing": 1, "other": 0, "expired_offers": 1}, f"an offer past its deadline is out of the open count: {c}")
board = links.board_contract(ties)
check(len(board) == c["contract"] and board[0]["display"] == "Ann Buyer" and board[0]["others"] == 1 and board[2]["person_id"] == "" and board[2]["deal"] == "9 Fig Way",
      "the Board's Under contract column has one row per deal, so it matches the Deals page")
ci = links.checkins(ties, sales, feed, TODAY)
kinds = {(r["person_id"], r["kind"]): r for r in ci}
check(("4", "30 days after closing") in kinds and kinds[("4", "30 days after closing")]["due"] == "2026-11-11", "a closing sets a 30 day check-in")
check(("8", "home anniversary, 1 year") in kinds and kinds[("8", "home anniversary, 1 year")]["due"] == "2026-11-20" and ("4", "home anniversary, 1 year") not in kinds,
      "a purchase sets a yearly home anniversary, a listing side does not")
check(any(r["kind"] == "6 months after closing" and r["due"] == "2026-11-11" and r["person_id"] == "1" for r in ci), "and a 6 month check-in")
check(sum(1 for r in ci if r["person_id"] == "8" and r["kind"].startswith("home anniversary")) == 1, "the same closing on the sheet and in the sales record is one check-in, not two")

# ---- 6. the Fix list
fx = links.fixes(feed, cards, ties, sales, {"cap_amount": 24000})
kind = lambda k: [r for r in fx if r["kind"] == k]
check(len(kind("no_name")) == 1 and kind("no_name")[0]["ref"] == "6" and "4 Blank Ct" in kind("no_name")[0]["what"], "a contact with no name is on the list")
dup = kind("duplicate")
check(len(dup) == 2 and any("one phone" in r["problem"] and r["ref"] == "1+3" for r in dup) and any("one name" in r["problem"] and r["ref"] == "1+7" for r in dup), "people who share a phone or a whole name are listed once each")
st = kind("stage")
check({r["ref"] for r in st} == {"1", "2", "3", "5", "8"} and any(r["ref"] == "5" and "no deal under contract" in r["problem"] for r in st) and all(r["ref"] != "4" for r in st),
      "a stage the deals contradict is listed, and one that already agrees is not")
pr = kind("price")
check(len(pr) == 2 and any("$410,000" in r["problem"] and "$400,000" in r["problem"] for r in pr) and any("$230,000" in r["problem"] and "$235,000" in r["problem"] for r in pr),
      "a deal price that differs from the CRM tab or the sales record is listed with both numbers")
check(len(kind("mls")) == 1 and "Flexmls says pending on 2026-11-08" in kind("mls")[0]["problem"], "a Deals row that does not match Flexmls is listed")
check(len(kind("offer")) == 1 and kind("offer")[0]["what"] == "8 Gum St", "an expired offer is listed to confirm")
check(all(r["problem"] and r["fix"] and r["from"] and r["id"] for r in fx) and len({r["id"] for r in fx}) == len(fx), "every row has the problem, a suggested fix, its source and its own id")
log = [{"id": dup[0]["id"], "action": "approve", "at": "2026-11-11T09:00:00"}, {"id": pr[0]["id"], "action": "dismiss", "at": "x"}, {"id": "gone", "action": "approve", "at": "x"}]
d = links.with_decisions(fx, log)
check(len(d["open"]) == len(fx) - 2 and len(d["approved"]) == 1 and d["dismissed"] == 1 and d["resolved"] == 1, "an approved or set-aside row leaves the open list, and a fixed one drops off")
cap = links.cap_note({"cap_amount": 24000})
check(cap["amount"] == 24000 and cap["differs"] and "$20,000 plus the $3,000 royalty, $23,000" in cap["note"], "the cap shows the Goals value with a note when it is not $23,000")
check(links.cap_note({"cap_amount": 23000})["note"] == "" and links.cap_note({})["amount"] is None and "unknown" in links.cap_note({})["note"], "a matching cap has no note, and no cap in Goals is unknown")

# ---- 8. the weekly proof line
a, b = proof.last_week(TODAY)
check((a, b) == (date(2026, 11, 2), date(2026, 11, 8)) and proof.last_week(date(2026, 11, 9))[0] == date(2026, 11, 2), "the week is the last full Monday to Sunday")
leads = [{"received": "2026-11-03T10:00:00-06:00", "crm": {"person_id": "1"}}, {"received": "2026-11-04T09:00:00-06:00", "crm": {"person_id": "3"}},
         {"received": "2026-11-05", "crm": {"person_id": "2"}}, {"received": "2026-11-10T09:00:00-06:00", "crm": {"person_id": "9"}}]
sent = [{"status": "sent", "kind": "text", "person_id": "1", "at": "2026-11-03T10:12:00-06:00"}, {"status": "sent", "kind": "text", "person_id": "3", "at": "2026-11-04T11:00:00-06:00"},
        {"status": "sent", "kind": "email", "person_id": "3", "at": "2026-11-06T11:00:00-06:00"}, {"status": "dry-run", "kind": "text", "person_id": "2", "at": "2026-11-05T11:00:00-06:00"},
        {"status": "sent", "kind": "text", "person_id": "1", "at": "2026-10-20T10:00:00-05:00"}]
bridge_log = [{"job_type": "call", "status": "posted", "person_id": "3", "at": "2026-11-05T14:00:00-06:00"}, {"job_type": "call", "status": "dry-run", "at": "2026-11-05T15:00:00-06:00"}]
cal = [{"kind": "showing", "day": "2026-11-04"}, {"kind": "listing", "day": "2026-11-07", "invite": True}, {"kind": "block", "day": "2026-11-05"}, {"kind": "client", "day": "2026-11-10"}]
cal_log = proof.past_appointments([], [{"kind": "showing", "day": "2026-11-01", "title": "Showing - 1 Old Rd"}, {"kind": "showing", "day": "2026-11-20", "title": "later"}], date(2026, 11, 1))
check(len(cal_log) == 1 and len(proof.past_appointments(cal_log, [{"kind": "showing", "day": "2026-11-01", "title": "Showing - 1 Old Rd"}], TODAY)) == 1, "appointments that have happened are kept once each, so last week can still be counted")
late = proof.build(TODAY, leads, sent, bridge_log, [{"kind": "client", "day": "2026-11-12", "title": "x"}], ties)
check(late["appointments"]["value"] is None and "only looks forward" in late["appointments"]["note"], "when nothing on record reaches back to that week, appointments read unknown, never 0")
pf = proof.build(TODAY, leads, sent, bridge_log, cal, ties, cal_log)
check(pf["leads"]["value"] == 3 and pf["first_reply"] == {**pf["first_reply"], "value": 66, "measured": 2, "of": 3}, "leads in, and the median first reply from the leads that can be measured")
check(pf["texts"]["value"] == 2 and pf["emails"]["value"] == 1 and pf["calls"]["value"] == 1 and pf["appointments"]["value"] == 1, "texts, calls and appointments count real records only, never a dry run or an unaccepted invite")
check(pf["deals"]["list"] == ["12 Oak St"] and pf["gci"]["value"] is None and pf["gci"]["pending"] == 9000.0 and "no start date" in pf["deals"]["note"],
      "a deal that started after a Pipeline text counts, its commission is pending, and GCI is unknown while an open deal has no start date")
dated = [dict(x, since=x["since"] or "2026-01-05") for x in ties]
check(proof.build(TODAY, leads, sent, bridge_log, cal, dated, cal_log)["gci"]["value"] == 0, "with every open deal dated and none of the counted deals closed, GCI is a known $0")
gone = proof.build(TODAY, None, sent, bridge_log, cal, None, cal_log)
check(gone["leads"]["value"] is None and gone["deals"]["value"] is None and gone["gci"]["value"] is None and gone["first_reply"]["value"] is None, "a read that never ran makes its numbers unknown, never 0")
empty = proof.build(TODAY, [], [], [], [], [])
check(empty["first_reply"]["value"] is None and empty["first_reply"]["why"] and empty["leads"]["value"] == 0, "with no record the first reply time is unknown, with the reason")
check(len(proof.keep(proof.keep([], pf), pf)) == 1, "one proof row a week")

# ---- C. the learning loop
tmp = Path(tempfile.mkdtemp())
check(learn.current(tmp)["seller"] == {k: float(v) for k, v in insight.SELLER_MAX.items()} and learn.current(tmp)["call10"]["money"] == 40.0, "with no version yet the hand-set weights are in use")
check(not any(learn.BANNED.search(f) for fs in learn.FEATURES.values() for f in fs) and all(learn.BANNED.search(w) for w in ("family status", "religion", "age", "disability", "race", "kids")),
      "no model input is a protected trait, and the check would catch one")
rows_c = [{"person_id": "1", "score": 60, "fractions": {"money": 1, "intent": 0.5, "waiting": 0, "cadence": 1}}]
rows_s = [{"person_id": "8", "score": 45, "fractions": {"years": 1, "past": 1}}, {"person_id": "9", "score": 10, "fractions": {}}]
check(learn.log_ranked(tmp, TODAY, rows_c, rows_s) == 2 and learn.log_ranked(tmp, TODAY + timedelta(days=1), rows_c, rows_s) == 0 and learn.log_ranked(tmp, TODAY + timedelta(days=7), rows_c, rows_s) == 2,
      "each ranked person is logged once a week per list")
check(learn.add_feedback(tmp, "call10", "1", "good", datetime(2026, 11, 11, 9))["verdict"] == "good" and len(learn._lines(tmp / "feedback.jsonl")) == 1, "a Good call tap is logged")
try:
    learn.add_feedback(tmp, "call10", "1", "great", datetime(2026, 11, 11, 9)); check(False, "an unknown verdict is refused")
except ValueError:
    check(True, "an unknown verdict is refused")
ev = learn.events({"people": [{"person_id": "1", "street": "12 Oak St", "last_inbound": "2026-11-15"}], "facts": {"1": {"notes": [{"at": "2026-12-01", "note": "Listing appointment set for Friday"}]}}},
                  [{"status": "sent", "kind": "text", "person_id": "1", "at": "2026-11-12T10:00:00-06:00"}, {"status": "dry-run", "person_id": "1", "at": "2026-11-12T11:00:00-06:00"}],
                  [{"job_type": "call", "status": "posted", "person_id": "1", "at": "2026-11-13T10:00:00-06:00"}], [{"kind": "showing", "title": "Showing - 12 Oak St", "day": "2026-11-20"}], ties)
check(ev["1"] == {"texted": ["2026-11-12"], "called": ["2026-11-13"], "replied": ["2026-11-15"], "appointment": ["2026-11-20", "2026-12-01"]} and ev["3"]["listing"] == ["2026-10-01"] and ev["4"]["closed"] == ["2026-10-12"],
      "outcomes come from the send log, the call log, texts back, the calendar, Notes and Deals, with dates")
row = {"day": "2026-11-11", "list": "call10", "person_id": "1", "rank": 1, "top": True}
o = learn.outcome(row, ev, date(2026, 12, 20))
check(o["texted"] == "2026-11-12" and o["appointment"] == "2026-11-20" and o["yes"] and not o["resolved"] and o["none_30"] is False and o["none_60"] is None
      and learn.outcome(row, ev, date(2027, 2, 20))["resolved"], "an appointment within 90 days is a yes, and it only counts as an answer once the 90 days are up, the same as a no")
check(learn.outcome(row, ev, date(2026, 11, 18))["appointment"] is None, "an appointment still ahead on the calendar is not counted yet")
o2 = learn.outcome({**row, "person_id": "zz"}, ev, date(2026, 12, 20))
o3 = learn.outcome({**row, "person_id": "zz"}, ev, date(2027, 2, 20))
check(not o2["resolved"] and o2["none_30"] is True and o2["none_90"] is None and o3["resolved"] and not o3["yes"] and o3["none_90"] is True, "nothing in 30, 60 and 90 days is recorded as each date passes, and a no only counts after 90 days")

random.seed(7)
def made(n, start, signal="activity"):
    out = []
    for i in range(n):
        x = {k: random.choice([0, 0, 1]) * random.choice([0.33, 0.67, 1]) for k in learn.FEATURES["seller"]}
        out.append(({"day": (start + timedelta(days=i % 20)).isoformat(), "week": learn.week_of(start + timedelta(days=i % 20)), "list": "seller", "person_id": f"p{start}{i}", "rank": i + 1, "top": i < 25, "score": 0, "x": x},
                    random.random() < 0.08 + 0.75 * x[signal]))
    return out
def seed(folder, pairs):
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / "ranked.jsonl").open("a") as fh:
        fh.write("".join(json.dumps(r) + "\n" for r, _ in pairs))
    return {r["person_id"]: {"appointment": [(date.fromisoformat(r["day"]) + timedelta(days=10)).isoformat()]} for r, y in pairs if y}
t1 = tmp / "few"
ev1 = seed(t1, made(12, date(2026, 6, 1)))
v = learn.retrain(t1, ev1, date(2026, 11, 9))
check(v["lists"]["seller"]["used"] is False and "Not enough outcomes yet: 12 of 40" in v["lists"]["seller"]["note"] and v["weights"]["seller"] == learn.HAND["seller"] and v["version"] == 1,
      "with too few outcomes the weights do not move, and the version says why")
t2 = tmp / "enough"
ev2 = seed(t2, made(160, date(2026, 6, 1)))
v1 = learn.retrain(t2, ev2, date(2026, 11, 9))
w1, h = v1["weights"]["seller"], learn.HAND["seller"]
check(v1["lists"]["seller"]["used"] and w1["activity"] > h["activity"] and abs(sum(w1.values()) - 100) < 0.6, f"with enough outcomes the weights move toward what predicted: activity {h['activity']} to {w1['activity']}")
check(all(abs(w1[k] - h[k]) <= learn.MAX_STEP + 0.05 for k in h), "no weight moves more than the weekly cap")
check(v1["lists"]["seller"]["new_auc"] >= v1["lists"]["seller"]["old_auc"] and v1["lists"]["seller"]["changes"], "the version records its test against the old weights and what changed")
check(not learn.due(t2, datetime(2026, 11, 9, 7)) and not learn.due(t2, datetime(2026, 11, 13, 9)) and learn.due(t2, datetime(2026, 11, 16, 6, 5)) and not learn.due(t2, datetime(2026, 11, 16, 5, 59))
      and learn.due(t2, datetime(2026, 11, 17, 9)), "the retrain is due once a week from Monday 6 AM, and a Mac that slept through Monday catches up")
check(v1["lists"]["seller"]["holdout"] is False and "same answers it learned from" in v1["lists"]["seller"]["note"], "with no older answers to hold back, the version says its test was on the answers it learned from")
v2 = learn.retrain(t2, ev2, date(2026, 11, 16))
check(v2["version"] == 2 and len(json.loads((t2 / "versions.json").read_text())) == 2 and learn.current(t2)["seller"] == v2["weights"]["seller"], "every version is kept with its date, weights and test results")
t3 = tmp / "worse"
old = made(150, date(2026, 1, 5), "activity")
new = made(60, date(2026, 7, 6), "years")
ev3 = {**seed(t3, old), **seed(t3, new)}
learn._write(t3 / "versions.json", [{"version": 1, "date": "2026-11-02", "week": "2026-11-02", "lists": {"seller": {}, "call10": {}},
                                    "weights": {"seller": {"years": 60.0, "equity": 0.0, "life": 10.0, "activity": 10.0, "past": 10.0, "anniversary": 10.0}, "call10": learn.HAND["call10"]}}])
v3 = learn.retrain(t3, ev3, date(2026, 11, 9))
i3 = v3["lists"]["seller"]
check(i3["holdout"] is True and i3["used"] is False and i3["new_auc"] < i3["old_auc"] and "tested worse" in i3["note"] and v3["weights"]["seller"]["years"] == 60.0, "a version that tests worse on the last 90 days is not used, and it says so")
sc = learn.scorecard(t2, ev2, date(2026, 11, 16))
check(sc["current"]["seller"]["words"][0].endswith("%") and "counts" in sc["current"]["seller"]["words"][0] and not sc["current"]["seller"]["hand_set"] and sc["current"]["call10"]["hand_set"],
      "the scorecard says the weights in plain words: " + sc["current"]["seller"]["words"][0])
check(len(sc["versions"]) == 2 and sc["versions"][0]["version"] == 2 and isinstance(sc["changed"]["seller"], dict), "it lists each version, newest first, and what changed since last week")
lm = learn.top_last_month(tmp, ev, TODAY)
check(lm["n"] == 0 and lm["replied"] is None and "2026-11-11" in lm["why"], "with no rank log from a month ago the top 25 result is unknown, with the date the log started")
t4 = tmp / "month"
pairs = made(30, date(2026, 10, 1))
ev4 = seed(t4, pairs)
lm4 = learn.top_last_month(t4, ev4, date(2026, 11, 11))
check(0 < lm4["n"] <= 25 and lm4["appointment"] == sum(1 for r, y in pairs if y and r["top"] and r["day"] <= "2026-10-12") and lm4["listing"] == 0, "of last month's top 25, it counts who set an appointment")

print("\nALL PASS" if not fails else f"\n{fails} FAILED")
sys.exit(1 if fails else 0)
