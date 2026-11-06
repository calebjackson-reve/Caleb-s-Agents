"""Checks for every Command Center calculation. Made-up deals only. Run: python3 aire/pipeline-app/cc_test.py"""
import json
import tempfile
import unittest
from datetime import date, datetime
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
        cl = cc.closings(dl, cc.deal_rows(SHEET), T)
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


if __name__ == "__main__":
    unittest.main(verbosity=1)
