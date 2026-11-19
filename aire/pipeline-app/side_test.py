"""Checks for the deal side rule with made-up people: on an open deal the Deals sheet's Side column decides the word,
Listing is selling and Buyer is buying, in the call list, the heat reasons and the contact card. The streets are the two
that were mislabeled (Basil Ln, S Turnberry Ave) with no house numbers and invented names.
Run: python3 aire/pipeline-app/side_test.py"""
import sys
from datetime import date

import insight as I
import links

fails = 0


def check(ok, label):
    global fails
    print(("ok   " if ok else "FAIL ") + label)
    fails += 0 if ok else 1


TODAY = date(2026, 11, 11)


def person(pid, name, street, said, reason):
    return {"person_id": pid, "display": name, "phone": "(225) 555-01%02d" % int(pid), "street": street, "band": "hot", "stage": "nurture",
            "last_messages": [f"2026-11-09: {said}"], "reasons": [reason], "temp": "hot", "owes_reply": True, "last_inbound": "2026-11-09"}


# Two sellers whose texts talk about showings (the old word match called that buying), a buyer, a past buyer now
# talking about selling, a Both deal and someone on two open deals that disagree.
BASIL = person("1", "Sam Sellerone", "100 Basil Ln", "Can you set up a tour for the Saturday showing?", "Talked about buying 2 days ago")
TURN = person("2", "Tess Sellertwo", "200 S Turnberry Ave", "Is it still available? Looking to hear about offers.", "Talked about buying 3 days ago")
BUYER = person("3", "Bo Buyerthree", "300 Oak St", "We want to buy and make an offer.", "Talked about buying 1 days ago")
PAST = person("4", "Pia Pastfour", "400 Elm St", "Thinking about selling our house.", "Talked about selling 4 days ago")
BOTH = person("5", "Bea Bothfive", "500 Pine St", "Thinking about selling and buying.", "Talked about selling 5 days ago")
CLASH = person("6", "Cy Clashsix", "600 Fir St", "Want to buy a lot.", "Talked about buying 6 days ago")
PEOPLE = [BASIL, TURN, BUYER, PAST, BOTH, CLASH]


def card(deal, stage, side, pid):
    return {"deal": deal, "key": deal.lower(), "stage": stage, "status": stage, "side": side, "crm": {"person_id": pid}}


CARDS = [card("100 Basil Ln, Town, LA", "contract", "Listing", "1"),
         card("200 S Turnberry Ave, Town, LA", "appointment", "Listing", "2"),
         card("300 Oak St, Town, LA", "contract", "Buyer", "3"),
         card("399 Old Rd, Town, LA", "closed", "Buyer", "4"),
         card("500 Pine St, Town, LA", "contract", "Both", "5"),
         card("600 Fir St, Town, LA", "appointment", "Listing", "6"), card("601 Fir St, Town, LA", "contract", "Buyer", "6")]
FEED = {"people": PEOPLE, "touches_due": PEOPLE, "heat": {"hot": PEOPLE, "warm": []}, "new_leads": [], "deals": [],
        "facts": {"2": {"street": "200 S Turnberry Ave",
                        "deals": [{"address": "200 S Turnberry Ave", "side": "Listing", "stage": "active"}]}}}

ties = links.tie(CARDS, FEED)
by = links.sides(ties)
check(I.side_word("Listing") == "selling" and I.side_word("buyer") == "buying" and I.side_word("Both") == "" and I.side_word(None) == "",
      "Listing is selling, Buyer is buying, Both and blank have no word")
check(by == {"1": "selling", "2": "selling", "3": "buying"},
      "sides: Basil and Turnberry sellers are selling, the buyer is buying, and Both, closed-only and clashing people get nothing: " + str(by))
check("4" not in by and "5" not in by and "6" not in by, "a closed buyer deal, a Both deal and two open deals that disagree set no side")

sided = links.apply_sides(FEED, by)
pick = lambda feed, pid: next(r for r in feed["touches_due"] if r["person_id"] == pid)
check(pick(sided, "1")["reasons"] == ["Talked about selling 2 days ago"] and pick(sided, "2")["reasons"] == ["Talked about selling 3 days ago"],
      "Basil and Turnberry heat reasons say selling, not buying")
check(pick(sided, "3")["reasons"] == ["Talked about buying 1 days ago"] and pick(sided, "4")["reasons"] == ["Talked about selling 4 days ago"]
      and pick(sided, "5")["reasons"] == ["Talked about selling 5 days ago"], "the buyer stays buying and people with no open side keep what their texts said")
check(all(r["reasons"] for r in sided["heat"]["hot"]) and sided["heat"]["hot"][0]["deal_side"] == "selling" and "deal_side" not in sided["heat"]["hot"][3],
      "the heat lists carry the side too, only on the deal people")
check(FEED["touches_due"][0]["reasons"] == ["Talked about buying 2 days ago"], "the feed itself is not changed")

rows = {r["person_id"]: r for r in I.call10(sided, TODAY, set(), n=20)["rows"]}
unsided = {r["person_id"]: r for r in I.call10(FEED, TODAY, set(), n=20)["rows"]}
check(unsided["1"]["reason"].startswith("buying") and unsided["2"]["reason"].startswith("buying"),
      "before the rule, the call list called the Basil and Turnberry sellers buying (showing, tour, still available)")
check(rows["1"]["reason"].startswith("selling") and rows["2"]["reason"].startswith("selling"), "call list: Basil and Turnberry say selling: " + rows["1"]["reason"] + " / " + rows["2"]["reason"])
check(rows["3"]["reason"].startswith("buying") and rows["4"]["reason"].startswith("selling"), "call list: the buyer says buying, the past buyer's own selling talk stands")
check(rows["5"]["reason"] == unsided["5"]["reason"] and rows["6"]["reason"] == unsided["6"]["reason"], "call list: Both and clashing people are untouched")

book = I.Book(FEED, [], [], [], TODAY)
deal_fact = lambda pid: next(f for f in book.card(pid)["facts"] if f["key"] == "deal")["value"]
check(deal_fact("2") == "200 S Turnberry Ave, selling, active", "contact card: Turnberry's deal reads selling, not listing: " + str(deal_fact("2")))

# ---- a seller whose texts say nothing about buying or selling, and a seller on an expired offer
QUIET = person("7", "Quin Quietseven", "700 Basil Ln", "Thanks, talk soon.", "Last contact 3 days ago, no buying or selling signal")
EXPIRED = person("8", "Ed Expiredeight", "800 Fir St", "Is it still available? Any showing this week?", "Talked about buying 2 days ago")
P2 = [QUIET, EXPIRED]
CARDS2 = [card("700 Basil Ln, Town, LA", "contract", "Listing", "7"),
          {**card("800 Fir St, Town, LA", "offer", "Listing", "8"), "offer": {"expired": True}}]
FEED2 = {"people": P2, "touches_due": P2, "heat": {"hot": P2, "warm": []}, "new_leads": [],
         "deals": [{"person_id": "7", "address": "700 Basil Ln", "price": 400000}, {"person_id": "8", "address": "800 Fir St", "price": 250000}]}
ties2 = links.tie(CARDS2, FEED2)
by2 = links.sides(ties2)
check(ties2[1]["expired_offer"] and by2 == {"7": "selling", "8": "selling"}, "an expired offer on a Listing row is still selling, the sheet still says Listing: " + str(by2))
rows2 = {r["person_id"]: r for r in I.call10(links.apply_sides(FEED2, by2), TODAY, set(), n=20)["rows"]}
plain2 = {r["person_id"]: r for r in I.call10(FEED2, TODAY, set(), n=20)["rows"]}
check(rows2["7"]["reason"].startswith("selling, live deal at 700 Basil Ln"), "call list: a Listing person with no buying or selling words in their texts still reads selling: " + rows2["7"]["reason"])
check(rows2["8"]["reason"].startswith("selling") and plain2["8"]["reason"].startswith("buying"), "call list: the expired-offer seller reads selling, and read buying before the rule")
check(all(rows2[k]["score"] == plain2[k]["score"] and rows2[k]["points"] == plain2[k]["points"] for k in ("7", "8")), "the label never moves a score or a rank")

print("\nALL PASS" if not fails else f"\n{fails} FAILED")
sys.exit(1 if fails else 0)
