"""Checks for insight.py with made-up people: the lead card and first text, the call list, the fuller card and the
likely-seller score. Run: python3 aire/pipeline-app/insight_test.py"""
import sys
from datetime import date

import insight as I

fails = 0


def check(ok, label):
    global fails
    print(("ok   " if ok else "FAIL ") + label)
    fails += 0 if ok else 1


TODAY = date(2026, 11, 11)

# ---- 1. speed to lead
leads = [
    {"threadId": "t1", "name": "Pat Madeup", "phone": "(225) 555-0142", "email": "pat@example.com", "source": "Home value request",
     "received": "2026-11-11T09:00:00-06:00", "address": "14 Demo Oaks Ln", "fields": [["Address", "14 Demo Oaks Ln"]], "due": {"level": "now"}, "origin": "email"},
    {"threadId": "t2", "name": "Sky Sample", "phone": "", "email": "sky@example.com", "source": "Listing inquiry", "received": "2026-11-10",
     "fields": [["Listing", "902 Bayou Ridge"], ["Message", "Is it still available?"]], "due": {"level": "late"}, "origin": "email"},
    {"threadId": "t3", "name": "Done Already", "phone": "(225) 555-0100", "received": "2026-11-09", "due": {"level": "done"}, "origin": "email"},
    {"name": "Crm Only", "phone": "+12255550177", "source": "Sign call 2026-11-11", "received": "2026-11-11", "crm": {"person_id": "9"}, "due": {"level": "soon"}, "origin": "crm"},
    {"threadId": "t5", "name": "No Texts", "phone": "(225) 555-0155", "email": "nt@example.com", "received": "2026-11-11T10:00:00-06:00",
     "fields": [["Text me", "No"]], "due": {"level": "now"}, "origin": "email"},
    {"threadId": "t6", "name": "Website lead", "received": "2026-11-11T10:05:00-06:00", "due": {"level": "now"}, "origin": "email"},
]
cards = I.lead_cards(leads)
by = {c["name"]: c for c in cards}
check(len(cards) == 5 and "Done Already" not in by, "a lead that already got a reply is not on the New leads card")
check(by["Pat Madeup"]["draft"]["kind"] == "text" and by["Pat Madeup"]["draft"]["to"] == "+12255550142", "a lead with a phone gets a text first")
check(by["Sky Sample"]["draft"]["kind"] == "email" and "reply and tell me" in by["Sky Sample"]["draft"]["body"], "a lead with only an email gets an email, with a way to opt out")
check(all("Caleb Jackson with Keller Williams First Choice" in c["draft"]["body"] for c in cards), "every first reply names Caleb and Keller Williams First Choice")
check(by["Sky Sample"]["asked"] == "Is it still available?" and by["Pat Madeup"]["asked"] == "Home value for 14 Demo Oaks Ln", "what they asked comes from the form")
check(by["Website lead"]["asked"] == "" and by["Website lead"]["draft"]["kind"] == "" and "there" in by["Website lead"]["draft"]["body"],
      "a form with no question shows nothing made up, and no way to reach them means no send button")
check(by["No Texts"]["draft"]["kind"] == "email", "a form that said no to texts gets an email instead")
check(by["Crm Only"]["in_crm"] and not by["Pat Madeup"]["in_crm"], "a lead that is not in the CRM yet is marked so")
check(by["Pat Madeup"]["timed"] and not by["Sky Sample"]["timed"], "a lead with a day and no clock time gets no timer")
check(I.alert_text(by["Pat Madeup"]) == "New lead: Pat Madeup, Home value for 14 Demo Oaks Ln", "the alert reads New lead: name, what they asked")
lp = {"threadId": "t7", "name": "Lee Madeup", "phone": "(225) 555-0170", "source": "Website lead", "received": "2026-11-11T11:00:00-06:00", "due": {"level": "now"},
      "snippet": "You have a new lead from your Luxury Presence website. Lee Madeup lee@example.com Overview Type Home Valuation Source https://example.org/home-"}
lpc = I.lead_cards([lp])[0]
check(lpc["asked"] == "Home Valuation, on the website" and not lpc["own_words"] and "home value request" in lpc["draft"]["body"] and by["Sky Sample"]["own_words"],
      "a Luxury Presence email with no message shows the form's own type, not quoted as their words")
fresh, st = I.new_lead_alerts(cards, {})
check(fresh == [] and st["primed"] and len(st["seen"]) == 5, "the first pass only learns the leads already there")
fresh, st2 = I.new_lead_alerts(cards + [{"key": "t9", "name": "Brand New"}], st)
check([c["key"] for c in fresh] == ["t9"], "a new lead alerts once")
check(I.new_lead_alerts(cards + [{"key": "t9", "name": "Brand New"}], st2)[0] == [], "and never again")

# ---- 2. call these 10
check(I.amounts("we can go up to $700k on a duplex") == [(700000, True)] and I.amounts("call me at 225 555 0142 by 10/29, repair was $500") == []
      and I.amounts("thinking 1.2 million or 450K") == [(1200000, False), (450000, False)], "budgets are read from $ and k forms only")
feed = {"touches_due": [
    {"person_id": "1", "display": "Multi Buyer", "phone": "+12255550101", "band": "warm", "owes_reply": True, "last_inbound": "2026-09-28",
     "last_messages": ["2026-09-28: looking for a multifamily up to $700K"], "days_quiet": 44},
    {"person_id": "2", "display": "Quiet Hot", "phone": "+12255550102", "band": "hot", "owes_reply": False, "days_quiet": 12},
    {"person_id": "3", "display": "Credit Guy", "phone": "+12255550103", "band": "hot", "owes_reply": True, "last_inbound": "2026-11-01",
     "last_messages": ["2026-11-01: We do credit repair for your buyers, free consultation"]},
    {"person_id": "4", "display": "Lender Lou", "phone": "+12255550104", "band": "hot", "type": "lender", "owes_reply": True, "last_inbound": "2026-11-10"},
    {"person_id": "5", "display": "No Phone", "phone": "", "band": "hot", "owes_reply": True, "last_inbound": "2026-11-10", "last_messages": ["2026-11-10: want to sell for $900k"]},
    {"person_id": "6", "display": "Tagged Out", "phone": "+12255550106", "band": "hot", "stage": "Do_Not_Contact"},
    {"person_id": "7", "display": "Seller Sam", "phone": "+12255550107", "band": "cold", "owes_reply": True, "last_inbound": "2026-11-09",
     "last_messages": ["2026-11-09: what is my house worth"]},
    {"person_id": "8", "display": "Deal Dana", "phone": "+12255550108", "band": "lukewarm", "owes_reply": False, "days_quiet": 2},
    {"person_id": "9", "display": "Reached Today", "phone": "+12255550109", "band": "hot", "owes_reply": True, "last_inbound": "2026-11-10",
     "last_messages": ["2026-11-10: budget is $800k"]},
], "deals": [{"person_id": "8", "address": "5 Live Oak Ct", "price": "$255,000", "stage": "under_contract"}]}
c10 = I.call10(feed, TODAY, done={"9"})
ids = [r["person_id"] for r in c10["rows"]]
check(ids == ["1", "8", "7", "2"], "ranked by money and intent first, then cadence: " + ",".join(ids))
check(c10["rows"][0]["reason"] == "multifamily up to $700K, waiting 44 days", "the reason reads in a few words: " + c10["rows"][0]["reason"])
check(c10["rows"][1]["reason"] == "live deal at 5 Live Oak Ct, $255K" and c10["rows"][3]["reason"] == "hot cadence, quiet 12 days", "a live deal and a plain cadence row say so")
check(c10["left_out"] == {"spam or a pitch": 1, "vendor, agent or lender": 1, "no valid phone": 1, "Do Not Contact": 1, "already reached today": 1},
      "vendors, pitches, Do Not Contact, no phone and already reached are left out")
big = {"touches_due": [{"person_id": str(i), "display": f"P{i:02d}", "phone": f"+1225555{1000 + i}", "band": "hot"} for i in range(30)]}
check(len(I.call10(big, TODAY)["rows"]) == 10, "never more than ten")

# ---- 3 and 4. the fuller card and the seller score
feed2 = {"people": [
    {"person_id": "20", "display": "Olive Owner", "stage": "past client", "type": "client", "street": "12 Willow Bend", "city": "Zachary", "has_phone": True, "has_email": False},
    {"person_id": "21", "display": "Bare Bones", "stage": "nurture", "type": "", "street": "", "city": "", "has_phone": False, "has_email": False},
    {"person_id": "22", "display": "Agent Amy", "stage": "", "type": "agent", "street": "9 Broker Row", "has_phone": True, "has_email": True},
    {"person_id": "23", "display": "New Neighbor", "stage": "nurture", "type": "", "street": "40 Tupelo Lane", "has_phone": True, "has_email": True}],
    "facts": {"20": {"fair_market_value": "310000", "source": "Referral 2019-05-01", "street": "12 Willow Bend", "zip": "70791", "household": ["Otis Owner"],
                     "notes": [{"at": "2026-08-02", "note": "Expecting a baby in March, may need more room"}]},
              "22": {"street": "9 Broker Row"}, "23": {"street": "40 Tupelo Lane"}},
    "heat": {"hot": [], "warm": []}}
sales = [{"close": "2018-06-10", "address": "12 Willow Bend Dr", "side": "Buyer", "price": 180000},
         {"close": "2020-10-02", "address": "40 Tupelo Lane", "side": "Listing", "price": 220000},
         {"close": "2021-01-05", "address": "13 Willow Bend", "side": "Buyer", "price": 99000}]
hv = [{"origin": "email", "source": "Home value request", "received": "2026-11-10T08:00:00-06:00", "crm": {"person_id": "20"}}]
b = I.Book(feed2, [], sales, hv, TODAY)
c = b.card("20")
f = {x["key"]: x for x in c["facts"]}
check(f["value"]["value"] == "$310,000" and f["value"]["from"] == "parish assessment", "home value is the sheet's figure, labeled parish assessment")
check(f["equity"]["value"] is None and "mortgage" in f["equity"]["why"], "equity is unknown, and says why, when no source has a mortgage balance")
check(f["years"]["value"] == "8 years, since 2018-06-10" and f["deal"]["value"] == "12 Willow Bend Dr, buyer, closed, 2018-06-10", "years owned and the last deal come from the sales record at their address")
check(f["source"]["value"] == "Referral 2019-05-01" and f["household"]["value"] == "Otis Owner", "lead source and household come from the sheet")
check(c["known"] == 6 and c["total"] == 8, f"completeness counts what is known: {c['known']} of {c['total']}")
s = c["seller"]
check(s["score"] == 30 + 0 + 20 + 15 + 15 and s["reasons"][0].startswith("Owned 8 years") and len(s["reasons"]) == 2, f"seller score adds up with its top 2 reasons: {s['score']}")
bare = b.card("21")
check(bare["known"] == 0 and bare["seller"] is None and all(x["value"] is None and x["why"] for x in bare["facts"]), "a bare record shows 0 of 8, every fact unknown with a reason, and no score")
check(b.card("22")["seller"] is None, "an agent is never scored as a seller")
check(b.card("23")["seller"]["score"] == 15 and b.years_owned(b.deals_for("23", "40 Tupelo Lane")) is None, "a listing side at their address is a past deal, not years owned")
check(b.card("404")["ok"] is False, "someone not in the feed gets no card facts")
top = b.sellers()
check([r["person_id"] for r in top] == ["20", "23"] and top[0]["score"] == 80, "likely sellers list the scored homeowners, highest first, never a zero")
lease = I.Book({"people": [{"person_id": "30", "display": "Tenant Tia", "street": "22 Muscadine Rd"}]}, [], [{"close": "2025-09-12", "address": "22 Muscadine Rd", "side": "Buyer", "price": 1900, "type": "Residential Lease"}], [], TODAY)
check(lease.years_owned(lease.deals_for("30", "22 Muscadine Rd")) is None, "a lease is never counted as owning the home")
nl = I.call10({"new_leads": [{"person_id": "40", "display": "Fresh Lead", "phone": "+12255550140", "received": "2026-11-11", "source": "Website 2026-11-11"}],
               "touches_due": [{"person_id": "41", "display": "Old Hot", "phone": "+12255550141", "band": "hot", "days_quiet": 9}]}, TODAY)["rows"]
check(nl[0]["person_id"] == "40" and nl[0]["reason"] == "new lead, came in 2026-11-11", "a new lead ranks above a plain cadence touch")
many = {"people": [{"person_id": str(i), "display": f"H{i:02d}", "stage": "past client", "street": f"{i} Oak St"} for i in range(1, 41)]}
check(len(I.Book(many, today=TODAY).sellers()) == 25, "the list stops at 25")
old = I.Book({"people": feed2["people"]}, [], sales, [], TODAY).card("20")
check(any("does not carry this yet" in x["why"] for x in old["facts"]), "a feed built before facts existed says so and shows no number")
fm = I.formula()
check(fm["seller"]["max"] == 100 and sum(p["max"] for p in fm["seller"]["parts"]) == 100 and "7+ years scores 30" in fm["seller"]["parts"][0]["rule"],
      "the formula on the Sources page is written from the code's own numbers and adds to 100")

# ---- what the outside check found (2026-11-11)
far = I.Book({"people": [{"person_id": "50", "display": "Moved On", "street": "9 Oak St"}],
              "facts": {"50": {"street": "9 Oak St", "deals": [{"address": "500 Far Rd", "side": "buyer", "stage": "closed", "expected_close": "2015-01-01"}]}}}, today=TODAY)
fc = {x["key"]: x for x in far.card("50")["facts"]}
check(fc["years"]["value"] is None and fc["deal"]["value"].startswith("500 Far Rd") and far.card("50")["seller"]["score"] == 15,
      "a closed purchase at another address is their last deal, never years owned at this one")
check(I.new_lead_alerts([], {}, ready=False)[1]["primed"] is False and I.new_lead_alerts(cards, I.new_lead_alerts([], {}, ready=False)[1])[0] == [],
      "a first pass before the lead read exists learns nothing, and the next one still only learns")
burst = [{"key": f"b{i}", "name": f"B{i}"} for i in range(9)]
out, stb = I.new_lead_alerts(burst, {"primed": True, "seen": []})
check(len(out) == I.MAX_ALERTS and I.new_lead_alerts(burst, stb)[0] == [], "a burst alerts at most three times and the rest never alert later")
check(I.new_lead_alerts([], {"primed": True, "seen": [f"k{i}" for i in range(2500)]})[1]["seen"][-1] == "k2499", "remembered leads are trimmed oldest first")
for t in ("works in real estate", "expecting a call back", "engaged with the inspector", "transferred the utilities", "more space on the lot"):
    check(not I.LIFE.search(t), f"not a life event: {t}")
for t in ("expecting a baby in March", "got engaged last week", "retiring in the spring", "settling the estate", "they need more room"):
    check(bool(I.LIFE.search(t)), f"a life event: {t}")
for t in ("does the home warranty plan transfer", "free consultation with an inspector", "our rates are fine, we use Acme lender", "I loved your platform", "act now before it sells"):
    check(I.skip_reason({"phone": "+12255550111", "last_messages": [t]}) == "", f"a real client is kept on the list: {t}")
check(I.amounts("the seller wants $65,000 in repairs on the roof") == [] and I.amounts("we put $60k as the down payment, budget is $450k") == [(450000, True)], "a repair cost or a down payment is never read as a budget")
check(not I.lead_cards([{"threadId": "x", "received": "not-a-real-time-at-all", "due": {}}])[0]["timed"], "a lead whose time cannot be read gets no timer")

print("\nALL PASS" if not fails else f"\n{fails} FAILED")
sys.exit(1 if fails else 0)
