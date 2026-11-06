"""Checks for the Command Center sync, with Google faked. Made-up data only.
Run: python3 aire/pipeline-app/cc_sync_test.py"""
import base64
import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

import cc
import cc_sync as S

NOW = datetime(2026, 11, 5, 9, 0, tzinfo=cc.CENTRAL)


class Call:
    def __init__(self, value=None, error=None, log=None, name=""):
        self.value, self.error, self.log, self.name = value, error, log, name

    def execute(self):
        if self.log is not None:
            self.log.append(self.name)
        if self.error:
            raise self.error
        return self.value


class FakeSheets:
    """values().get/update/append/clear and spreadsheets().get/batchUpdate over an in-memory sheet."""
    def __init__(self, tabs):
        self.tabs, self.log = tabs, []

    def spreadsheets(self): return self
    def values(self): return self

    def get(self, spreadsheetId, range=None, fields=None):
        if fields:
            return Call({"sheets": [{"properties": {"title": t}} for t in self.tabs]})
        tab = range.split("!")[0].strip("'")
        return Call({"values": [list(r) for r in self.tabs.get(tab, [])]})

    def batchUpdate(self, spreadsheetId, body):
        self.tabs[body["requests"][0]["addSheet"]["properties"]["title"]] = []
        return Call({}, log=self.log, name="addSheet")

    def update(self, spreadsheetId, range, valueInputOption, body):
        tab = range.split("!")[0].strip("'")
        self.tabs[tab] = [list(r) for r in body["values"]] + self.tabs.get(tab, [])[len(body["values"]):]
        return Call({}, log=self.log, name="update " + tab)

    def append(self, spreadsheetId, range, valueInputOption, insertDataOption, body):
        self.tabs[range.split("!")[0].strip("'")].extend(body["values"])
        return Call({}, log=self.log, name="append")

    def clear(self, spreadsheetId, range):
        self.tabs[range.split("!")[0].strip("'")] = []
        return Call({}, log=self.log, name="clear")


def hdr(frm, subj):
    return {"headers": [{"name": "From", "value": frm}, {"name": "Subject", "value": subj}]}


def thread(i, frm, subj, snippet="", body=None):
    p = hdr(frm, subj)
    if body:
        p.update(mimeType="text/plain", body={"data": base64.urlsafe_b64encode(body.encode()).decode().rstrip("=")})
    return {"id": i, "messages": [{"internalDate": "1793887200000", "snippet": snippet, "payload": p}]}


class Mappers(unittest.TestCase):
    def test_calendar(self):
        r = S.calendar_rows([{"id": "a", "summary": "Showing", "start": {"dateTime": "2026-11-05T10:00:00-06:00"}, "end": {"dateTime": "2026-11-05T11:00:00-06:00"}},
                             {"id": "b", "start": {"date": "2026-11-06"}, "end": {"date": "2026-11-07"}, "transparency": "transparent", "creator": {"email": "x@example.com"}}])
        self.assertEqual((r[0]["allDay"], r[1]["allDay"], r[1]["title"], r[1]["free"], r[1]["creator"]), (False, True, "(no title)", True, "x@example.com"))

    def test_outside_invite(self):
        mine = {"organizer": {"email": "me@example.com", "self": True}}
        theirs = {"organizer": {"email": "vendor@example.com"}, "attendees": [{"email": "me@example.com", "self": True, "responseStatus": "needsAction"}]}
        yes = {"organizer": {"email": "client@example.com"}, "attendees": [{"email": "me@example.com", "self": True, "responseStatus": "accepted"}]}
        self.assertEqual([S.is_invite(e) for e in (mine, theirs, yes)], [False, True, False])
        self.assertTrue(S.calendar_rows([{**theirs, "start": {"dateTime": "2026-11-05T10:00:00-06:00"}, "end": {"dateTime": "2026-11-05T11:00:00-06:00"}}])[0]["invite"])

    def test_thread_and_body(self):
        t = thread("t", "Pat <pat@example.com>", "Hi", body="Line one\nLine two")
        self.assertEqual(S.thread_row(t)["subject"], "Hi")
        self.assertTrue(S.thread_row(t)["received"].startswith("2026-11-05"))
        self.assertIn("Line two", S.body_text(t["messages"][0]))

    def test_lead_labeled_and_loose(self):
        b = "Name: Jordan Sample\nPhone: (225) 555-0142\nEmail: jordan@example.com\nCity: St. Francisville\nnoreply@luxurypresence.com"
        r = S.lead_row(thread("l", "Luxury Presence", "New lead: Jordan Sample", body=b), b)
        self.assertEqual((r["name"], r["phone"], r["email"], r["area"], r["test"]), ("Jordan Sample", "(225) 555-0142", "jordan@example.com", "St. Francisville", False))
        loose = "Someone asked about a home value. Reach riley@example.com or 225.555.0187"
        r = S.lead_row(thread("m", "Luxury Presence", "Home value request", body=loose), loose)
        self.assertEqual((r["phone"], r["email"], r["source"]), ("225.555.0187", "riley@example.com", "Home value request"))
        self.assertTrue(S.lead_row(thread("n", "LP", "New lead: Test"), "")["test"])

    def test_lead_keeps_every_labeled_line(self):
        b = ("Name: Pat Example\nPhone: 225-555-0100\nEmail: pat@example.com\nAddress: 12 Demo Way, Zachary, LA\n"
             "Message: Thinking of selling in spring\nTimeframe: 3-6 months\nValuation Source: https://example.com/v\nTimeframe: dupe")
        r = S.lead_row(thread("f", "LP", "Home value request"), b)
        self.assertEqual((r["address"], r["message"]), ("12 Demo Way, Zachary, LA", "Thinking of selling in spring"))
        self.assertEqual([k for k, v in r["fields"]], ["Address", "Message", "Timeframe", "Valuation Source"])

    def test_bank(self):
        self.assertEqual(S.bank_row(thread("b", "Chase", "Your balance", "Available balance is $12,345.67"))["amount"], 12345.67)
        self.assertEqual(S.bank_row(thread("d", "Chase", "Direct deposit posted", "$1,000.00"))["type"], "Deposit")
        self.assertIsNone(S.bank_row(thread("x", "Chase", "Card used online"))["amount"])


class Pass(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        S.write_doc("config", {"rows": {"deals_sheet_id": "made-up-sheet", "crm_sheet_id": "made-up-crm"}}, self.dir)
        self.sheets = FakeSheets({"Deals": [["Deal", "Status", "Commission", "Act of sale"], ["1 Demo Ln", "Under Contract", "$5,000", "2026-11-20"]]})
        self.ok = {"sheets": self.sheets, "calendar": None, "gmail": None}
        S.FETCH_REAL = dict(S.FETCH)
        S.FETCH.update(calendar=lambda s, c, n: [], inbox=lambda s, c, n: [], leads=lambda s, c, n: [],
                       commission_mail=lambda s, c, n: [], bank_mail=lambda s, c, n: [],
                       news=lambda s, c, n: [], market=lambda s, c, n: {})

    def tearDown(self):
        S.FETCH.clear(); S.FETCH.update(S.FETCH_REAL)

    def test_first_pass_reads_everything(self):
        st = S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.assertTrue(all(v["ok"] for v in st["results"].values()), st)
        self.assertEqual(cc.build(self.dir, NOW)["scorecard"]["pending"]["value"], 5000)
        self.assertIn("Goals", self.sheets.tabs)
        self.assertEqual(self.sheets.tabs["Scorecard history"][1][0], "2026-11-05")

    def test_not_due_is_skipped_and_force_reads(self):
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        st = S.run_pass(NOW.replace(minute=5), svc=self.ok, folder=self.dir)
        self.assertNotIn("deals", st["results"])
        self.assertIn("deals", S.run_pass(NOW.replace(minute=5), force=True, svc=self.ok, folder=self.dir)["results"])

    def test_failure_keeps_last_good(self):
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        S.FETCH["deals"] = lambda s, c, n: (_ for _ in ()).throw(TimeoutError("sheet slow"))
        later = NOW.replace(hour=10)
        st = S.run_pass(later, svc=self.ok, folder=self.dir)
        self.assertFalse(st["results"]["deals"]["ok"])
        p = cc.build(self.dir, later)
        self.assertEqual((p["fresh"]["deals"]["state"], p["scorecard"]["pending"]["value"]), ("failed", 5000))
        self.assertIn("sheet slow", p["fresh"]["deals"]["error"])

    def test_no_sign_in_marks_every_read(self):
        S.SERVICES_REAL, S.services = S.services, lambda: (_ for _ in ()).throw(RuntimeError("no Google sign-in yet"))
        try:
            st = S.run_pass(NOW, folder=self.dir)
        finally:
            S.services = S.SERVICES_REAL
        self.assertIn("no Google sign-in", st["error"])
        self.assertEqual(cc.build(self.dir, NOW)["fresh"]["calendar"]["state"], "failed")

    def test_history_once_a_day_after_six(self):
        S.run_pass(NOW.replace(hour=5), svc=self.ok, folder=self.dir)
        self.assertEqual(len(self.sheets.tabs["Scorecard history"]), 1)  # header only before 6 AM
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        S.run_pass(NOW.replace(hour=11), svc=self.ok, folder=self.dir)
        self.assertEqual(len(self.sheets.tabs["Scorecard history"]), 2)

    def test_goals_go_up_then_come_down(self):
        cc.save_goals(self.dir, {"gci_goal": 150000, "cap_start": "2026-01-01"}, NOW)
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.assertIn(["gci_goal", 150000], self.sheets.tabs["Goals"])
        self.assertFalse(S.read_doc("goals", self.dir).get("sheet_pending"))
        self.sheets.tabs["Goals"] = [["goal", "value"], ["gci_goal", "175000"], ["cap_start", "2026-02-01"]]
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.assertEqual(cc.build(self.dir, NOW)["goals"], {"gci_goal": 175000.0, "cap_start": "2026-02-01"})

    def test_bad_goal_in_sheet_is_an_error_not_a_crash(self):
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.sheets.tabs["Goals"] = [["goal", "value"], ["wire_money_to", "1"]]
        st = S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.assertFalse(st["results"]["goals"]["ok"])

    def test_writes_are_atomic(self):
        S.write_doc("x", {"a": 1}, self.dir)
        self.assertEqual(json.loads((self.dir / "x.json").read_text()), {"a": 1})
        self.assertFalse((self.dir / "x.json.tmp").exists())


    def test_life_rows_go_up_and_come_back(self):
        cc.queue_row(self.dir, "Life", {"kind": "upkeep", "name": "Change AC filter", "every_days": "90", "date": "2026-08-01"}, NOW)
        cc.queue_row(self.dir, "Workout log", {"date": "2026-11-05", "focus": "Upper push", "minutes": "45"}, NOW)
        p = cc.build(self.dir, NOW)  # pending rows show before the sync runs
        self.assertTrue(p["life"]["upkeep"][0]["pending"])
        self.assertEqual(p["workouts"]["done_7"], 1)
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        self.assertEqual(self.sheets.tabs["Life"][1][:2], ["upkeep", "Change AC filter"])
        self.assertEqual(self.sheets.tabs["Workout log"][1][:2], ["2026-11-05", "Upper push"])
        self.assertEqual(self.sheets.tabs["Workouts"][1][0], "Mon")  # starter plan written once, for Caleb to edit
        self.assertEqual(S.read_doc("outbox", self.dir)["rows"], [])
        p = cc.build(self.dir, NOW)
        self.assertFalse(p["life"]["upkeep"][0]["pending"])
        self.assertEqual(p["life"]["upkeep"][0]["days"], -6)  # Aug 1 + 90 days = Oct 30, six days before Nov 5

    def test_no_sign_in_still_reads_news_and_market(self):
        S.SERVICES_REAL, S.services = S.services, lambda: (_ for _ in ()).throw(RuntimeError("no Google sign-in yet"))
        S.FETCH["news"] = lambda s, c, n: [{"title": "x", "url": "https://example.com", "date": "2026-11-05"}]
        try:
            st = S.run_pass(NOW, folder=self.dir)
        finally:
            S.services = S.SERVICES_REAL
        self.assertTrue(st["results"]["news"]["ok"])
        self.assertEqual(cc.build(self.dir, NOW)["fresh"]["deals"]["state"], "failed")

    def test_failed_read_retries_within_30_minutes(self):
        S.FETCH["market"] = lambda s, c, n: (_ for _ in ()).throw(TimeoutError("slow"))
        S.run_pass(NOW, svc=self.ok, folder=self.dir)
        S.FETCH["market"] = lambda s, c, n: {"rate": None, "areas": [], "gbrar": {"month": "2026-09"}}
        st = S.run_pass(NOW.replace(minute=31), svc=self.ok, folder=self.dir)
        self.assertTrue(st["results"]["market"]["ok"])

    def test_market_survives_one_slow_source(self):
        real = S.http_get
        S.http_get = lambda url, timeout=60: (_ for _ in ()).throw(TimeoutError("slow")) if "Zip" in url else (
            b"d,v\n2026-10-29,7.24\n2026-11-05,7.18\n" if "fred" in url else b"month_date_yyyymm,county_fips,active_listing_count\n202610,22033,1889\n")
        try:
            m = S.FETCH_REAL["market"](None, {}, NOW)
        finally:
            S.http_get = real
        self.assertEqual((m["rate"]["rate"], m["areas"][0]["active"]), (7.18, 1889))
        self.assertIn("Realtor.com zip", m["warnings"][0])


class Public(unittest.TestCase):
    def test_news(self):
        xml = b"""<rss><channel><item><title>Home sales rise in Baton Rouge - The Advocate</title><link>https://news.example.com/a</link>
        <pubDate>Thu, 05 Nov 2026 14:00:00 GMT</pubDate><source url="https://theadvocate.com">The Advocate</source></item>
        <item><title>No link</title><link>http://insecure.example.com</link></item></channel></rss>"""
        r = S.news_rows(xml, "local")
        self.assertEqual([(x["title"], x["source"], x["date"]) for x in r], [("Home sales rise in Baton Rouge", "The Advocate", "2026-11-05T08:00-06:00")])

    def test_rate_and_areas(self):
        self.assertEqual(S.rate_rows("observation_date,MORTGAGE30US\n2026-10-29,7.24\n2026-11-05,7.18\n"),
                         {"rate": 7.18, "date": "2026-11-05", "prior": 7.24, "prior_date": "2026-10-29", "change": -0.06})
        csv_text = "month_date_yyyymm,postal_code,active_listing_count,active_listing_count_yy,median_listing_price,median_days_on_market,quality_flag\n202610,70775,46,0.12,477450.0,130,0\n202610,99999,1,0,1,1,0\n"
        a = S.area_rows(csv_text, "zip", [("St. Francisville", "zip", "70775")])
        self.assertEqual((len(a), a[0]["active"], a[0]["median_price"]), (1, 46, 477450.0))
        pts = cc.market({"rate": S.rate_rows("d,v\n2026-10-29,7.24\n2026-11-05,7.18\n"), "areas": a, "gbrar": None})["points"]
        self.assertIn("7.18%", pts[0]); self.assertIn("down 0.06", pts[0])
        self.assertIn("St. Francisville: 46 active listings, median list price $477,450, 130 median days on market", pts[1])
        self.assertIn("+12%", pts[1]); self.assertIn("Realtor.com, 2026-10", pts[1])


if __name__ == "__main__":
    unittest.main(verbosity=1)
