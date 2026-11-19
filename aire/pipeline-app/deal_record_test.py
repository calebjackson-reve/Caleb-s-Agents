#!/usr/bin/env python3
"""One deal record: every screen reads side, close date, price and status from links.records (the AIRE Deals sheet).
This fails if any two screens disagree for any open deal. Made-up people and addresses.

    python3 aire/pipeline-app/deal_record_test.py            the fixture below
    python3 aire/pipeline-app/deal_record_test.py --live     also this Mac's real reads (read only, prints no names)
"""
import json
import sys
from datetime import date, datetime
from pathlib import Path

import cc
import links
from deal_screens import disagreements, screens

HERE = Path(__file__).resolve().parent
fails = 0


def check(ok, label):
    global fails
    print(("ok   " if ok else "FAIL ") + label)
    fails += 0 if ok else 1


TODAY, NOW = date(2026, 11, 11), datetime(2026, 11, 11, 12, 0, tzinfo=cc.CENTRAL)
SHEET = [["Deal", "Side", "Status", "Price", "Commission", "Inspection", "Appraisal / financing", "Act of sale", "Check", "Source"],
         # the CRM tab has a later close date for this one
         ["410 S Heron Ln", "Listing", "Under Contract", 300000, 6000, "", "", "2026-11-23", "", ""],
         # an offer past its deadline that the CRM tab still calls active at the list price
         ["77 Egret Rd", "Listing", "Offer", 475000, "", "", "", "2026-11-16", "Marsh offer expired Nov 4 9 AM, counter still waiting on signatures. Listed at $510,000", ""],
         # the CRM tab has the wrong side and an old price
         ["5 Wren Ct", "Buyer", "Under Contract", 210000, 5250, "", "", "2026-12-04", "", ""],
         ["9 Finch St", "Buyer", "Offer", 180000, "", "", "", "2026-12-15", "Offer open until Nov 20 5 PM", ""],
         ["12 Lark Ave", "Listing", "Active", 350000, "", "", "", "", "", ""],
         ["3 Dove Way", "Buyer", "Closed", 199000, 4975, "", "", "2026-10-02", "", ""]]
FEED = {
    "people": [{"person_id": "1", "display": "Ann Example", "stage": "nurture", "street": "410 S Heron Ln"},
               {"person_id": "11", "display": "Abe Example", "stage": "nurture", "street": "410 S Heron Ln"},
               {"person_id": "2", "display": "Bea Sample", "stage": "nurture", "street": "77 Egret Rd"},
               {"person_id": "3", "display": "Cal Madeup", "stage": "nurture", "street": ""},
               {"person_id": "4", "display": "Dot Pretend", "stage": "nurture", "street": ""},
               {"person_id": "5", "display": "Eli Fiction", "stage": "nurture", "street": "12 Lark Ave"},
               {"person_id": "6", "display": "Fay Nobody", "stage": "nurture", "street": ""}],
    "touches_due": [{"person_id": "1", "display": "Ann Example", "stage": "nurture", "phone": "+12255550101", "reasons": ["Live deal, active", "Talked about buying"]},
                    {"person_id": "2", "display": "Bea Sample", "stage": "nurture", "phone": "+12255550102", "reasons": ["Live deal, active", "You marked them hot"]},
                    {"person_id": "3", "display": "Cal Madeup", "stage": "nurture", "phone": "+12255550103", "reasons": ["Talked about selling"]}],
    "deals": [
        {"deal_id": "410-heron", "person_id": "1", "display": "Ann Example", "address": "410 South Heron Lane, Zachary, LA 70791", "side": "Listing", "stage": "active",
         "price": "300000", "expected_close": "2026-11-29", "next_step": "", "updated_at": "2026-10-29T12:00:00-05:00"},
        {"deal_id": "77-egret", "person_id": "2", "display": "Bea Sample", "address": "77 Egret Road, Saint Francisville, LA 70775", "side": "Listing", "stage": "active",
         "price": "510000", "expected_close": "", "next_step": "", "updated_at": "2026-10-30T15:00:00-05:00"},
        {"deal_id": "5-wren", "person_id": "3", "display": "Cal Madeup", "address": "5 Wren Court, Baton Rouge, LA 70808", "side": "Listing", "stage": "under_contract",
         "price": "215000", "expected_close": "2026-12-04", "next_step": "", "updated_at": "2026-11-01T09:00:00-05:00"},
        {"deal_id": "9-finch", "person_id": "4", "display": "Dot Pretend", "address": "9 Finch Street, Zachary, LA 70791", "side": "Buyer", "stage": "showing",
         "price": "180000", "expected_close": "", "next_step": "", "updated_at": "2026-11-09T09:00:00-05:00"},
        {"deal_id": "300-teal", "person_id": "6", "display": "Fay Nobody", "address": "300 Teal Dr, New Roads, LA 70760", "side": "Buyer", "stage": "active",
         "price": "150000", "expected_close": "2026-12-20", "next_step": "", "updated_at": "2026-11-05T09:00:00-05:00"}],
    "map": {"pins": [{"key": "deal:410-heron", "kind": "deal", "person_id": "1", "address": "410 South Heron Lane, Zachary, LA 70791", "stage": "active", "side": "Listing"},
                     {"key": "deal:77-egret", "kind": "deal", "person_id": "2", "address": "77 Egret Road, Saint Francisville, LA 70775", "stage": "active", "side": "Listing"},
                     {"key": "person:1", "kind": "person", "person_id": "1", "display": "Ann Example", "stage": "nurture"}]},
}
FEED["facts"] = {d["person_id"]: {"deals": [{k: d[k] for k in ("address", "side", "stage", "price", "expected_close", "updated_at")}]} for d in FEED["deals"]}

recs, views = screens(SHEET, FEED, [], [], TODAY, NOW)
R = {r["key"]: r for r in recs}

# ---- the record itself
check(R["410 heron"]["close"] == "2026-11-23" and R["410 heron"]["status"] == "Under Contract" and R["410 heron"]["price"] == 300000 and R["410 heron"]["side"] == "Listing" and R["410 heron"]["open"],
      "the record takes side, close date, price and status from the Deals sheet")
check(R["77 egret"]["expired_offer"] and not R["77 egret"]["open"] and R["77 egret"]["status"] == "Offer" and R["77 egret"]["price"] == 475000,
      "an offer past its deadline is one thing everywhere: status Offer, expired, not open")
check(R["9 finch"]["open"] and not R["9 finch"]["expired_offer"], "an offer still inside its deadline is open")
check([p["person_id"] for p in R["410 heron"]["people"]] == ["1"] and R["12 lark"]["people"][0]["person_id"] == "5", "each record carries the people the deal is tied to")

# ---- mismatch 1: the close date (the sheet says Nov 23, the CRM tab said Nov 29)
check(views["Home paydays"]["410 heron"]["close"] == "2026-11-23" and views["Home deadlines"]["410 heron"]["close"] == "2026-11-23", "Home shows the sheet's act of sale")
check(views["Contact card"]["410 heron"]["close"] == "2026-11-23" and views["Contact card"]["410 heron"]["status"] == "Under Contract",
      "the contact card shows the same close date and status as Home, not the CRM tab's later date")
check(views["Contact card history"]["410 heron"] == {"close": "2026-11-23", "price": 300000, "from": links.SHEET, "rows": 1},
      "the card's deal history lists the deal once, from the Deals sheet")
row = next(d for d in links.apply_records(FEED, recs)["deals"] if d["deal_id"] == "410-heron")
check(row["crm_said"]["expected_close"] == "2026-11-29" and row["crm_said"]["stage"] == "active" and row["record"] == links.SHEET, "what the CRM tab said is kept beside the record, not shown as the deal")

# ---- mismatch 2: live on one screen, expired on the Fix list
check(views["Fix list"]["77 egret"]["expired_offer"], "the Fix list says the offer expired")
check(views["Contact card"]["77 egret"] == {"side": "Listing", "close": "2026-11-16", "price": 475000, "status": "Offer", "open": False, "expired_offer": True},
      "the contact card says the same: an expired offer at the offer price, not a live deal at the list price")
check(views["Map pin"]["77 egret"] == {"side": "Listing", "status": "Offer", "open": False} and not views["Board"]["77 egret"]["open"] and not views["Deals page"]["77 egret"]["open"],
      "the map pin, the board count and the Deals page all say it is not open")
check(links.counts(links.tie(cc.merge_deals(cc.deal_cards(cc.deal_rows(SHEET), TODAY, NOW), FEED["deals"])[0], FEED))["open"] == sum(1 for r in recs if r["open"]) == 4,
      "the open count is the number of open records")

why = {r["person_id"]: r["reasons"] for r in links.apply_records(FEED, recs)["touches_due"]}
check(why["1"] == ["Live deal, under contract", "Talked about buying"] and why["2"] == ["Offer past its deadline, not a live deal", "You marked them hot"]
      and FEED["touches_due"][0]["reasons"][0] == "Live deal, active", "the heat reason says the record's status, not the CRM tab's stage")

# ---- side and price
check(views["Contact card"]["5 wren"]["side"] == "Buyer" and views["Contact card"]["5 wren"]["price"] == 210000 and views["Claude answers"]["5 wren"]["side"] == "Buyer",
      "side and price come from the sheet when the CRM tab has them wrong")
check(views["Call list"]["5 wren"]["side_word"] == "buying" and views["Call list"]["410 heron"]["side_word"] == "selling", "the call list says the record's side")

# ---- a deal only in the CRM tab, and nothing written
only = links.person_deals(recs, links.apply_records(FEED, recs), "6")
check(len(only) == 1 and only[0]["record"] == links.CRM_TAB and only[0]["expected_close"] == "2026-12-20", "a deal only in the CRM tab still shows, marked as CRM only")
check(links.person_deals(recs, FEED, "1")[0]["expected_close"] == "2026-11-23" and len(links.person_deals(recs, FEED, "1")) == 1, "a card built from the raw feed still reads the record")
check(FEED["deals"][0]["expected_close"] == "2026-11-29" and "record" not in FEED["deals"][0] and "status" not in FEED["map"]["pins"][0], "the feed itself is never changed")
check(links.apply_records({"_error": "x"}, recs) == {"_error": "x"} and links.apply_records(FEED, []) is not FEED and links.records([], []) == [], "an empty or broken read is handled")

# ---- the rule: no two screens disagree for any open deal
bad = disagreements(recs, views)
check(not bad, "no two screens disagree on side, close date, price or status for any open deal" + ("".join("\n       " + b for b in bad)))
covered = {s: len(v) for s, v in views.items()}
check(all(covered[s] for s in views), f"every screen was compared: {covered}")

# The checker must catch a disagreement: put the CRM tab's values back on one screen and it has to fail.
broken = {**views, "Contact card": {**views["Contact card"], "410 heron": {**views["Contact card"]["410 heron"], "close": "2026-11-29"}}}
check(any("Contact card says close '2026-11-29'" in b for b in disagreements(recs, broken)), "the check fails when one screen shows a different close date")
broken = {**views, "Map pin": {**views["Map pin"], "77 egret": {**views["Map pin"]["77 egret"], "open": True}}}
check(any("Map pin says open True" in b for b in disagreements(recs, broken)), "the check fails when one screen calls an expired offer live")
old_card = [{"address": d["address"], "side": d["side"], "close": d["expected_close"] or None, "price": cc.num(d["price"]), "status": d["stage"]} for d in FEED["deals"]]
before = {**views, "Contact card": {cc.deal_key(d["address"]): {k: d[k] for k in ("side", "close", "price")} for d in old_card}}
check(len(disagreements(recs, before)) >= 4, "the check fails on the old contact card, which read the CRM tab")

if "--live" in sys.argv:  # this Mac's real reads, read only. Prints deal keys and fields, never a person's name.
    root = HERE.parent if (HERE.parent / "crm" / "feed.json").exists() else Path.home() / "Caleb-s-Agents" / "aire"
    if "--root" in sys.argv:
        root = Path(sys.argv[sys.argv.index("--root") + 1])
    feed = json.loads((root / "crm" / "feed.json").read_text(encoding="utf-8"))
    raw = cc.load(root / "pipeline-app" / "out" / "cc")
    now = datetime.now(cc.CENTRAL)
    cal = cc.deal_deadlines(cc.cal_events(cc._rows(raw["calendar"]), ((raw.get("config") or {}).get("rows") or {}).get("coordinator_domains") or []))
    lrecs, lviews = screens(cc._rows(raw["deals"]), feed, cal, cc._rows(raw.get("sales")), now.date(), now)
    lbad = disagreements(lrecs, lviews)
    live = [r for r in lrecs if r["open"] or r["expired_offer"]]
    print(f"\nlive reads at {root}: {len(live)} open or expired deals, {sum(len(v) for v in lviews.values())} screen rows compared")
    for r in live:
        print(f"  {r['key']}: side {r['side']}, close {r['close']}, price {r['price']}, status {r['status']}{', offer expired' if r['expired_offer'] else ''}, open {r['open']}")
    check(not lbad, "live reads: no two screens disagree for any open deal" + ("".join("\n       " + b for b in lbad)))

print(f"\n{'ALL PASSED' if not fails else str(fails) + ' FAILED'}")
sys.exit(1 if fails else 0)
