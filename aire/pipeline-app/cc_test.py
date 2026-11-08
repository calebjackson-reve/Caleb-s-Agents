"""Checks for every Command Center calculation. Made-up deals only. Run: python3 aire/pipeline-app/cc_test.py"""
import json
import re
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

import cc

T = date(2026, 11, 5)
NOW = datetime(2026, 11, 5, 9, 0, tzinfo=cc.CENTRAL)
HEAD = ["Deal", "Side", "Status", "Price", "Commission", "Inspection", "Appraisal / financing", "Act of sale", "Check", "Source"]
SHEET = [HEAD,
         ["100 Oak Ln", "Buyer", "Under Contract", "$250,000", "$7,500", "", "", "2026-11-20", "Waiting on appraisal. Due Friday", "contract"],
         ["200 Elm St", "Listing", "Under Contract", "300000", "", "", "", "2026-12-30", "", ""],
         ["300 Pine Dr", "Listing", "Closed", "400,000", "12,000", "", "", "2026-03-01", "", ""],
         ["400 Ash Ct", "Buyer", "Closed", "200000", "6000", "", "", "2025-12-01", "", ""],
         ["500 Fir Rd", "Listing", "Active Listing", "350000", "10500", "", "", "", "", ""],
         ["", "Buyer", "Offer", "1", "1", "", "", "", "", ""],
         ["600 Bay Ave", "Buyer", "Fell Through", "100000", "3000", "", "", "", "", ""]]


def ev(title, start, end=None, **k):
    return {"title": title, "start": start, "end": end or start, "allDay": len(start) == 10, **k}


class Deals(unittest.TestCase):
    def setUp(self):
        self.d = cc.deal_rows(SHEET)

    def test_parse(self):
        self.assertEqual(len(self.d), 6)  # the row with no deal name is dropped
        self.assertEqual(self.d[0]["price"], 250000.0)
        self.assertEqual(self.d[0]["commission"], 7500.0)
        self.assertIsNone(self.d[1]["commission"])

    def test_columns_by_name(self):
        moved = [[h for h in reversed(HEAD)]] + [list(reversed(r)) for r in SHEET[1:]]
        self.assertEqual(cc.deal_rows(moved)[0]["commission"], 7500.0)

    def test_stage(self):
        self.assertEqual([cc.stage_of(s) for s in ["Under Contract", "Pending", "Closed", "Offer", "Active Listing", "Fell Through", ""]],
                         ["contract", "contract", "closed", "offer", "appointment", "out", "other"])

    def test_next_step(self):
        self.assertEqual(cc.next_step("Signed Monday. Waiting on appraisal. Due Friday"), "Waiting on appraisal")
        self.assertEqual(cc.next_step(""), "")
        self.assertTrue(cc.next_step("x " * 80).endswith("…"))

    def test_pending(self):
        self.assertEqual(cc.pending_commission(self.d), {"value": 7500.0, "deals": 2, "blank": 1})

    def test_stages_add_up(self):
        st = {r["stage"]: r for r in cc.pipeline_stages(self.d, 4)}
        self.assertEqual(st["lead"]["n"], 4)
        self.assertEqual(st["contract"]["volume"], 550000)
        self.assertEqual(st["closed"]["commission"], 18000)
        self.assertEqual(sum(r["n"] for k, r in st.items() if k != "lead"), len(self.d))

    def test_cards_order_and_days(self):
        rows = cc.deal_rows([HEAD + ["Stage since"], SHEET[1] + ["2026-10-29"]])
        c = cc.deal_cards(rows, T)[0]
        self.assertEqual((c["days"], c["next"]), (7, "Waiting on appraisal"))


class Calendar(unittest.TestCase):
    COORD = ["example.com"]

    def test_kinds(self):
        k = lambda t, **x: cc.cal_kind({"title": t, **x}, self.COORD)
        self.assertEqual(k("Act of sale 100 Oak"), "closing")
        self.assertEqual(k("100 Oak - Inspection"), "inspection")
        self.assertEqual(k("100 Oak - Inspection", creator="tc@example.com"), "deadline")
        self.assertEqual(k("Showing 12 Main"), "showing")
        self.assertEqual(k("Listing appointment"), "listing")
        self.assertEqual(k("Sales block"), "block")
        self.assertEqual(k("Gym"), "personal")
        self.assertEqual(k("Coffee with buyer"), "client")
        self.assertEqual(k("Dinner"), "other")

    def test_week_load(self):
        evs = cc.cal_events([ev("Showing", "2026-11-05T10:00:00-06:00", "2026-11-05T11:30:00-06:00"),
                             ev("Sales block", "2026-11-05T08:00:00-06:00", "2026-11-05T09:00:00-06:00"),
                             ev("Gym", "2026-11-05T06:00:00-06:00", "2026-11-05T07:00:00-06:00"),
                             ev("Working hours", "2026-11-05T08:00:00-06:00", "2026-11-05T17:00:00-06:00"),
                             ev("Holiday", "2026-11-06")], self.COORD)
        w = cc.week_load(evs, T)
        self.assertEqual((len(w), w[0]["hours"], w[0]["events"], w[1]["hours"]), (7, 1.5, 1, 0))

    def test_deadlines_and_closings(self):
        evs = cc.cal_events([ev("100 Oak Ln - Act of sale", "2026-11-20"),
                             ev("700 Gum St - Inspection deadline", "2026-11-07"),
                             ev("800 Old Rd - Act of sale", "2026-12-25")], self.COORD)
        dl = cc.deal_deadlines(evs)
        self.assertEqual(len(cc.in_days(dl, T, 6)), 1)
        cards, _ = cc.merge_deals(cc.deal_cards(cc.deal_rows(SHEET), T), [])
        cl = cc.closings(cc.contract_deadlines(dl, cards), cards, T)
        self.assertEqual([(r["deal"], r["from"], r["money"]) for r in cl], [("100 Oak Ln", "both", 7500.0)])


class Mail(unittest.TestCase):
    def test_inbox(self):
        rows = cc.inbox_sorted([{"threadId": "a", "subject": "Lunch?", "sender": "x"},
                                {"threadId": "b", "subject": "Counter offer", "sender": "y"}],
                               [{"threadId": "c", "subject": "New lead: Pat", "sender": "lp"},
                                {"threadId": "a", "subject": "dupe", "sender": "x"},
                                {"threadId": "t", "subject": "New lead: Test", "test": True}], [])
        self.assertEqual([r["category"] for r in rows], ["Lead", "Deal", "Other"])

    def test_commission_resolved(self):
        out = cc.commission_mail([{"subject": "Not processed - 100 Oak Lane"}, {"subject": "Commission for 100 Oak Ln"},
                                  {"subject": "Not processed - 9 Elm St"}])
        self.assertEqual([r["status"] for r in out][:1], ["Not processed"])
        self.assertEqual(sorted(r["status"] for r in out), ["Not processed", "Notice", "Resolved"])


class Score(unittest.TestCase):
    def setUp(self):
        self.d = cc.deal_rows(SHEET)

    def test_gci_from_sheet_then_kw(self):
        s = cc.scorecard(self.d, [], [], {}, None, T)
        self.assertEqual((s["gci"]["value"], s["gci"]["from"], s["closings"]["value"]), (12000, "sheet", 1))
        self.assertEqual(s["gci"]["with_pending"], 19500)
        s = cc.scorecard(self.d, [], [], {}, {"value": 20000}, T)
        self.assertEqual((s["gci"]["value"], s["gci"]["from"], s["gci"]["with_pending"]), (20000, "kw_paid", 27500))

    def test_goal_pace_and_cap(self):
        g = {"gci_goal": 100000, "cap_amount": 3000, "cap_start": "2026-01-01"}
        s = cc.scorecard(self.d, [], [], g, None, T)
        self.assertEqual(s["gci"]["goal"]["pct"], 12.0)
        self.assertFalse(s["gci"]["goal"]["ahead"])
        self.assertEqual((s["cap"]["paid"], s["cap"]["pct"], s["cap"]["left"]), (3600.0, 100, 0))
        self.assertIsNone(cc.scorecard(self.d, [], [], {"cap_amount": 3000}, None, T)["cap"])  # no start, no cap number

    def test_leads_and_appts(self):
        leads = [{"received": "2026-11-04"}, {"received": "2026-10-01"}, {"received": "2026-11-05", "test": True}, {}]
        evs = cc.cal_events([ev("Showing", "2026-11-08T10:00:00-06:00", "2026-11-08T11:00:00-06:00"),
                             ev("Showing", "2026-11-20T10:00:00-06:00", "2026-11-20T11:00:00-06:00")], [])
        s = cc.scorecard([], evs, leads, {}, None, T)
        self.assertEqual((s["leads7"]["value"], s["leads7"]["undated"], s["appts7"]["value"]), (1, 1, 1))

    def test_history(self):
        h = cc.add_history([{"day": "2026-10-06", "gci": 1000}, {"day": "2026-11-05", "gci": 1}], {"day": "2026-11-05", "gci": 5000})
        self.assertEqual([r["gci"] for r in h], [1000, 5000])
        self.assertEqual(cc.deltas(h, h[-1], "gci"), {"7": 4000, "30": 4000})
        self.assertEqual(cc.deltas([], {"day": "2026-11-05", "gci": 5}, "gci"), {"7": None, "30": None})


class Trust(unittest.TestCase):
    def test_freshness(self):
        f = lambda m, n="calendar": cc.freshness(m, n, NOW)["state"]
        self.assertEqual(f({}), "missing")
        self.assertEqual(f({"at": "2026-11-05T08:30:00-06:00"}), "ok")
        self.assertEqual(f({"at": "2026-11-05T06:00:00-06:00"}), "stale")
        self.assertEqual(f({"at": "2026-11-05T08:59:00-06:00", "error": "token expired"}), "failed")
        self.assertEqual(f({"at": "2026-01-01T00:00:00-06:00"}, "goals"), "ok")  # goals never go stale

    def test_build_with_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            p = cc.build(Path(d), NOW)
        self.assertEqual(p["fresh"]["deals"]["state"], "missing")
        self.assertEqual(p["scorecard"]["gci"]["value"], 0)

    def test_build_with_files(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "deals.json").write_text(json.dumps({"at": NOW.isoformat(), "source": "AIRE Deals sheet", "rows": SHEET}))
            p = cc.build(Path(d), NOW)
        self.assertEqual(p["scorecard"]["pending"]["value"], 7500)
        self.assertEqual(p["fresh"]["deals"]["source"], "AIRE Deals sheet")
        self.assertEqual(p["history"][-1]["day"], "2026-11-05")


class Goals(unittest.TestCase):
    def test_clean(self):
        self.assertEqual(cc.clean_goals({"gci_goal": 100000, "cap_start": "2026-01-01"}), {"gci_goal": 100000, "cap_start": "2026-01-01"})
        for bad in ({"gci_goal": -1}, {"gci_goal": "lots"}, {"cap_start": "Jan 1"}, {"wire_to": 1},
                    {"closings_low": 9, "closings_high": 3}, {"appts": True}):
            with self.assertRaises(ValueError):
                cc.clean_goals(bad)

    def test_save_and_read_back(self):
        with tempfile.TemporaryDirectory() as d:
            cc.save_goals(Path(d), {"gci_goal": 50000}, NOW)
            p = cc.build(Path(d), NOW)
        self.assertEqual(p["goals"], {"gci_goal": 50000})
        self.assertEqual(p["scorecard"]["gci"]["goal"]["goal"], 50000)



class Bank(unittest.TestCase):
    def test_bank(self):
        b = cc.bank([{"type": "Balance", "amount": 900.0, "received": "2026-11-01"}, {"type": "Balance", "amount": 1200.0, "received": "2026-11-04"},
                     {"type": "Deposit", "amount": 500.0, "received": "2026-11-03"}, {"type": "Alert", "received": "2026-11-05"}])
        self.assertEqual((b["alerts"], b["deposits"], b["cash"]["value"], b["last_deposit"]["value"]), (4, 1, 1200.0, 500.0))
        self.assertIsNone(cc.bank([])["cash"])

    def test_problems_list(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "calendar.json").write_text(json.dumps({"at": NOW.isoformat(), "error": "token expired", "rows": []}))
            p = cc.build(Path(d), NOW)
        self.assertEqual([(x["name"], x["state"]) for x in p["problems"]], [("calendar", "failed")])



class LeadMatch(unittest.TestCase):
    def test_attach_crm(self):
        people = [{"person_id": "7", "phone": "+12255550142", "band": "hot"}, {"person_id": "9", "email": "Pat@Example.com", "phone": ""}]
        out = cc.attach_crm([{"phone": "(225) 555-0142"}, {"email": "pat@example.com "}, {"phone": "555-0142"}, {}], people)
        self.assertEqual([r["crm"] and r["crm"]["person_id"] for r in out], ["7", "9", None, None])
        self.assertEqual(out[0]["crm"]["band"], "hot")



class LifeAndWorkouts(unittest.TestCase):
    def test_life(self):
        items = [{"kind": "family", "name": "Mom birthday", "date": "1960-11-09"}, {"kind": "family", "name": "Anniversary", "date": "06-01"},
                 {"kind": "upkeep", "name": "Gutters", "every_days": "180"}, {"kind": "habit", "name": "Read"}, {"kind": "habit", "name": "Walk"}]
        log = [{"date": "2026-11-05", "item": "Read"}, {"date": "2026-11-04", "item": "read"}, {"date": "2026-11-03", "item": "Read"},
               {"date": "2026-11-04", "item": "Walk"}, {"date": "2026-10-01", "item": "Gutters"}]
        L = cc.life({"items": items, "log": log}, [], T)
        self.assertEqual([(f["name"], f["days"]) for f in L["family"]], [("Mom birthday", 4), ("Anniversary", 208)])
        self.assertEqual((L["upkeep"][0]["due"], L["upkeep"][0]["days"]), ("2027-03-30", 145))
        h = {x["name"]: x for x in L["habits"]}
        self.assertEqual((h["Read"]["today"], h["Read"]["streak"], h["Walk"]["today"], h["Walk"]["streak"]), (True, 3, False, 1))

    def test_workouts(self):
        plan = [{"day": "Mon", "focus": "Upper push"}, {"day": "Thursday", "focus": "Upper pull"}]
        log = [{"date": "2026-11-02", "focus": "Upper push", "minutes": "50"}, {"date": "2026-10-20", "focus": "x"}]
        W = cc.workouts({"plan": plan, "log": log}, [], T)
        self.assertEqual([w["day"] for w in W["week"]][:2], ["Mon", "Tue"])
        self.assertTrue(W["week"][0]["done"]); self.assertEqual(W["today"]["focus"], "Upper pull")
        self.assertEqual((W["done_7"], W["minutes_7"]), (1, 50))

    def test_queue_row_guards(self):
        with tempfile.TemporaryDirectory() as d:
            e = cc.queue_row(Path(d), "Life log", {"date": "2026-11-05", "item": "=HYPERLINK(1)", "kind": "habit"}, NOW)
            self.assertEqual(e["row"]["item"], "'=HYPERLINK(1)")
            for tab, row in (("Contacts", {}), ("Life", {"kind": "chores", "name": "x"}), ("Life", {"kind": "family", "name": "x", "date": "soon"}),
                             ("Workout log", {"date": "today"}), ("Life", {"kind": "upkeep", "name": "x", "every_days": "often"})):
                with self.assertRaises(ValueError):
                    cc.queue_row(Path(d), tab, row, NOW)



class Checklist(unittest.TestCase):
    def test_deal_checklist(self):
        r = {"inspection": "2026-11-01", "appraisal": "Cleared 11/3", "act": "2026-11-20"}
        c = {x["step"]: x for x in cc.checklist(r, T)}
        self.assertEqual((c["Inspection"]["state"], c["Appraisal and loan"]["state"], c["Act of sale"]["state"], c["Act of sale"]["days"]),
                         ("done", "done", "upcoming", 15))
        self.assertEqual(cc.checklist({"inspection": "", "act": "2026-11-05"}, T)[0]["state"], "missing")
        self.assertEqual(cc.checklist({"act": "2026-11-05"}, T)[2]["state"], "today")
        cards = cc.deal_cards(cc.deal_rows(SHEET), T)
        self.assertEqual((cards[0]["to_close"], len(cards[0]["checklist"])), (15, 3))
        self.assertEqual([c for c in cards if c["stage"] == "closed"][0]["checklist"], [])


class JudgeRound1(unittest.TestCase):
    """Fixes from the blind judge, round 1. Made-up deals and people."""
    COORD = ["example.com"]

    def test_deal_key_matches_spellings(self):
        self.assertEqual(cc.deal_key("2179 South Fake Avenue, Zachary, LA"), cc.deal_key("2179 S Fake Ave"))
        self.assertEqual(cc.deal_key("90108 Pretend Lane - Act of sale"), "90108 pretend")
        self.assertNotEqual(cc.deal_key("100 Oak Ln"), cc.deal_key("100 Elm St"))

    def test_one_deal_source_sheet_wins_and_says_where_crm_differs(self):
        cards = cc.deal_cards(cc.deal_rows(SHEET), T)
        crm = [{"address": "100 Oak Lane, Somewhere, LA", "stage": "active", "price": "260000", "expected_close": "2026-11-29"},
               {"address": "900 Nowhere Rd", "stage": "under_contract", "price": "1"},
               {"address": "901 Gone Rd", "stage": "lost"}]
        out, only = cc.merge_deals(cards, crm)
        oak = next(c for c in out if c["deal"] == "100 Oak Ln")
        self.assertEqual((oak["price"], oak["act"], oak["status"]), (250000.0, "2026-11-20", "Under Contract"))
        self.assertEqual(sorted(d["field"] for d in oak["differs"]), ["act of sale", "price", "status"])
        self.assertEqual([o["deal"] for o in only], ["900 Nowhere Rd"])  # lost CRM rows are not shown
        self.assertEqual(cc.pending_commission(cc.deal_rows(SHEET))["value"], 7500)  # CRM rows never add money

    def test_deadlines_one_per_deal_per_day(self):
        evs = cc.cal_events([ev("100 Oak Ln - Act of sale", "2026-11-20"), ev("100 Oak Lane - Closing", "2026-11-20"),
                             ev("700 Gum St - Inspection deadline", "2026-11-07"),
                             ev("700 Gum St - Appraisal deadline", "2026-11-07")], self.COORD)
        cards, _ = cc.merge_deals(cc.deal_cards(cc.deal_rows(SHEET), T), [])
        dl = cc.contract_deadlines(cc.deal_deadlines(evs), cards)
        oak = [r for r in dl if r["key"] == "100 oak"]
        self.assertEqual(len(oak), 1)
        self.assertEqual((oak[0]["what"], oak[0]["from"]), ("Act of sale", "both"))
        gum = [r for r in dl if r["key"] == "700 gum"]
        self.assertEqual(len(gum), 1)
        self.assertIn("Appraisal", gum[0]["what"])

    def test_calendar_act_of_sale_on_another_day_does_not_double_count(self):
        evs = cc.cal_events([ev("100 Oak Ln - Act of sale", "2026-11-22")], self.COORD)
        cards, _ = cc.merge_deals(cc.deal_cards(cc.deal_rows(SHEET), T), [])
        dl = cc.contract_deadlines(cc.deal_deadlines(evs), cards)
        oak = [r for r in dl if r["key"] == "100 oak"]
        self.assertEqual([(r["day"], r["from"]) for r in oak], [("2026-11-20", "sheet")])
        self.assertIn("2026-11-22", oak[0]["note"])

    def test_one_lead_list(self):
        email = [{"name": "Pat Example", "phone": "(225) 555-0101", "email": "pat@example.com", "received": "2026-11-05T08:30:00-06:00",
                  "crm": {"person_id": "P1"}},
                 {"name": "Test Lead", "test": True, "received": "2026-11-05T08:00:00-06:00"},
                 {"name": "Lee Sample", "phone": "", "email": "lee@example.com", "received": "2026-11-03T10:00:00-06:00", "crm": None}]
        crm = [{"person_id": "P1", "display": "Pat Example", "received": "2026-11-05"},
               {"person_id": "P2", "display": "Kim Madeup", "phone": "2255550102", "received": "2026-11-04", "source": "Luxury Presence 2026-11-04"}]
        rows = cc.merge_leads(email, crm, set(), NOW)
        self.assertEqual([r["name"] for r in rows], ["Pat Example", "Kim Madeup", "Lee Sample"])
        self.assertEqual([r["origin"] for r in rows], ["email", "crm", "email"])

    def test_call_within_the_hour_from_age_and_reply(self):
        d = cc.lead_due("2026-11-05T08:30:00-06:00", False, NOW)
        self.assertEqual((d["level"], d["label"]), ("now", "Call within the hour (30 min left)"))
        self.assertEqual(cc.lead_due("2026-11-05T06:00:00-06:00", False, NOW)["label"], "3h with no reply")
        self.assertEqual(cc.lead_due("2026-11-05T08:30:00-06:00", True, NOW)["label"], "Replied")
        self.assertEqual(cc.lead_due("2026-11-03", False, NOW)["label"], "2 days with no reply")
        rows = cc.merge_leads([], [{"person_id": "P3", "display": "Jo Fake", "received": "2026-11-04", "last_touch": "2026-11-04"}], set(), NOW)
        self.assertEqual(rows[0]["due"]["level"], "done")  # a touch logged on the lead's day counts as a reply

    def test_outside_invites_are_not_booked(self):
        evs = cc.cal_events([ev("Showing", "2026-11-05T10:00:00-06:00", "2026-11-05T11:00:00-06:00"),
                             ev("Vendor webinar", "2026-11-05T12:00:00-06:00", "2026-11-05T13:00:00-06:00", invite=True),
                             ev("Sales block", "2026-11-05T14:00:00-06:00", "2026-11-05T16:00:00-06:00")], self.COORD)
        w = cc.week_load(evs, T)
        self.assertEqual((w[0]["hours"], w[0]["events"]), (1.0, 1))

    def test_build_with_feed_counts_leads_once(self):
        with tempfile.TemporaryDirectory() as t:
            folder = Path(t)
            meta = {"at": NOW.isoformat(), "source": "test", "error": None}
            (folder / "leads.json").write_text(json.dumps({**meta, "rows": [{"name": "Pat Example", "phone": "2255550101", "received": "2026-11-05T08:30:00-06:00"}]}))
            (folder / "deals.json").write_text(json.dumps({**meta, "rows": SHEET}))
            feed = {"new_leads": [{"person_id": "P1", "display": "Pat Example", "phone": "+1 225 555 0101", "received": "2026-11-05"},
                                  {"person_id": "P2", "display": "Kim Madeup", "received": "2026-11-04"}],
                    "deals": [{"address": "100 Oak Lane", "stage": "under_contract", "price": "250000"}]}
            p = cc.build(folder, NOW, feed=feed)
            self.assertEqual(len(p["leads"]), 2)
            self.assertEqual(p["scorecard"]["leads7"]["value"], 2)
            self.assertEqual(p["stages"][0]["n"], 2)
            self.assertEqual(next(c for c in p["deals"] if c["deal"] == "100 Oak Ln")["differs"], [])



class JudgeRound2(unittest.TestCase):
    """Fixes from the blind judge, round 2. Made-up deals and people."""
    COORD = ["example.com"]

    def test_deal_key_finds_the_address_after_a_label(self):
        # item 5: a coordinator event titled "Act of Sale · <address>" keyed as "act of" and was counted twice
        self.assertEqual(cc.deal_key("Act of Sale · 2179 South Fake"), "2179 fake")
        self.assertEqual(cc.deal_key("Inspection 11/20 - 14150 Pretend Ln"), "14150 pretend")
        self.assertEqual(cc.deal_key("42553 Hwy 42"), "42553 hwy")
        self.assertEqual(cc.deal_key("Commission for 41st"), "commission for")

    def test_deadline_titled_label_first_merges_with_the_sheet(self):
        evs = cc.cal_events([ev("100 Oak Ln - Act of sale", "2026-11-20"), ev("Act of Sale · 100 Oak Lane", "2026-11-20")], self.COORD)
        cards, _ = cc.merge_deals(cc.deal_cards(cc.deal_rows(SHEET), T), [])
        dl = cc.contract_deadlines(cc.deal_deadlines(evs), cards)
        on_day = [r for r in dl if r["day"] == "2026-11-20"]
        self.assertEqual([(r["deal"], r["what"], r["from"]) for r in on_day], [("100 Oak Ln", "Act of sale", "both")])
        self.assertEqual(len([c for c in cc.closings(dl, cards, T) if c["day"] == "2026-11-20"]), 1)


    def test_one_new_lead_rule_rolling_7_and_14_days_no_test_leads(self):
        # item 4: one rule for the Dashboard, Scorecard, Leads, the nav and the brief
        day = lambda n: (T - timedelta(days=n)).isoformat()
        email = [{"name": "Pat Fixture", "received": day(0) + "T08:00:00-06:00", "threadId": "a"},
                 {"name": "Jo Fixture", "received": day(6) + "T08:00:00-06:00", "threadId": "b"},
                 {"name": "Lee Fixture", "received": day(7) + "T08:00:00-06:00", "threadId": "c"},
                 {"name": "Old Fixture", "received": day(14) + "T08:00:00-06:00", "threadId": "d"},
                 {"name": "Form Test", "received": day(1), "threadId": "e", "test": False}]
        crm = [{"person_id": "71", "display": "Kim Fixture", "received": day(13)},
               {"person_id": "72", "display": "Test Lead", "received": day(2)},
               {"person_id": "73", "display": "No Date Fixture"}]
        leads = cc.merge_leads(email, crm, set(), NOW)
        names = {r["name"] for r in leads}
        self.assertEqual(names, {"Pat Fixture", "Jo Fixture", "Lee Fixture", "Kim Fixture", "No Date Fixture"})
        lc = cc.lead_counts(leads, T)
        self.assertEqual((lc["d14"], lc["d7"], lc["undated"]), (5, 2, 1))
        sc = cc.scorecard([], [], leads, {}, None, T)
        self.assertEqual(sc["leads7"]["value"], lc["d7"])


    def test_reads_turn_amber_past_their_refresh_and_red_when_stale_or_failed(self):
        # item 6: the Deals sheet reads every 30 minutes
        at = lambda mins: (NOW - timedelta(minutes=mins)).isoformat()
        st = lambda m: cc.freshness(m, "deals", NOW)["state"]
        self.assertEqual([st({"at": at(m)}) for m in (20, 44, 50, 104, 110)], ["ok", "ok", "late", "late", "stale"])
        self.assertEqual(st({"at": at(1), "error": "quota"}), "failed")  # a failed read is never ok, however new
        self.assertEqual(cc.freshness({"at": at(50)}, "deals", NOW)["late_after"], 45)

    def test_pace_matches_the_sync(self):
        import cc_sync
        self.assertEqual(cc.PACE_MIN, {k: v[0] for k, v in cc_sync.READS.items()})


    def test_scorecard_uses_saved_history_and_says_since_when(self):
        # item 10: three days saved in the sheet, none 7 days old yet
        saved = [{"day": "2026-11-02", "gci": 100.0, "pending": 0, "closings": 1, "leads7": 4, "appts7": 0},
                 {"day": "2026-11-03", "gci": 100.0, "pending": 0, "closings": 1, "leads7": 4, "appts7": 0},
                 {"day": "2026-11-04", "gci": 100.0, "pending": 0, "closings": 1, "leads7": 5, "appts7": 0}]
        today_row = {"day": T.isoformat(), "gci": 150.0, "pending": 0, "closings": 2, "leads7": 3, "appts7": 0}
        full = cc.add_history(saved, today_row)
        self.assertEqual(cc.deltas(full, today_row, "gci"), {"7": None, "30": None})
        self.assertEqual(cc.since_saved(saved, today_row, "gci"), {"since": "2026-11-02", "days": 3, "value": 50.0})
        self.assertEqual(cc.since_saved(saved, today_row, "leads7")["value"], -1)
        self.assertEqual(len(cc.saved_days(full, T)), 3)  # today's computed row is not history
        self.assertIsNone(cc.since_saved([], today_row, "gci"))


    def test_market_warnings_in_plain_words_and_each_tile_its_own_state(self):
        # items 14 and 15: no Python errors on Market, and a source that failed is red on its own tile only
        raw = {"rate": None, "areas": [{"area": "Fake Parish", "level": "county", "id": "1", "month": "202610", "active": 10.0}],
               "gbrar": None, "warnings": ["rate: TimeoutError: The read operation timed out",
                                           "Realtor.com zip: URLError: <urlopen error [Errno 54] Connection reset by peer>"]}
        m = cc.market(raw)
        self.assertEqual(m["warnings"], ["The mortgage rate (Freddie Mac, via FRED) did not load: the site took too long to answer",
                                         "Realtor.com inventory by ZIP did not load: the connection dropped"])
        self.assertFalse(any(re.search(r"Error|Errno|urlopen|<", w) for w in m["warnings"]))
        self.assertEqual({k: v["state"] for k, v in m["parts"].items()},
                         {"rate": "failed", "areas": "failed", "gbrar": "missing", "areas_county": "ok", "areas_zip": "failed"})
        self.assertEqual(cc.market({"rate": {"rate": 6.1, "change": 0, "date": "2026-11-05"}, "warnings": []})["parts"]["rate"]["state"], "ok")


    def test_paid_commission_with_no_closed_deal_is_flagged(self):
        # item 16: money in for a deal the sheet does not show as closed
        mail = [{"subject": "Commission for 300 Pine"}, {"subject": "Re: Commission for Pine Dr"}, {"subject": "Commission for Fake Chapel"},
                {"subject": "Commission for 41st"}, {"subject": "Commission Not Processed - 300 Pine Dr"}, {"subject": "Your CDA is ready"}]
        out = cc.commission_mail(mail, cc.deal_rows(SHEET))
        st = {r["subject"]: r["status"] for r in out}
        self.assertEqual(st["Commission for 300 Pine"], "Paid")          # 300 Pine Dr is Closed on the sheet
        self.assertEqual(st["Re: Commission for Pine Dr"], "Paid")
        self.assertEqual(st["Commission for Fake Chapel"], "No closed deal")
        self.assertEqual(st["Commission for 41st"], "No closed deal")    # too short to match any street
        self.assertEqual(st["Commission Not Processed - 300 Pine Dr"], "Resolved")
        self.assertEqual(st["Your CDA is ready"], "Notice")
        self.assertEqual({r["status"] for r in out[:2]}, {"No closed deal"})  # flags come first
        self.assertEqual(cc.commission_mail([{"subject": "Commission for 100 Oak Ln"}], cc.deal_rows(SHEET))[0]["status"], "No closed deal")  # under contract, not closed


if __name__ == "__main__":
    unittest.main(verbosity=1)
