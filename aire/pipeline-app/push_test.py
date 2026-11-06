"""Push alert checks, no network. Run: python3 aire/pipeline-app/push_test.py"""
import json
import tempfile
import unittest
import urllib.error
from datetime import datetime
from pathlib import Path

import cc
import push as P

NOW = datetime(2026, 11, 5, 9, 0, tzinfo=cc.CENTRAL)
PAY = {"leads": [{"threadId": "a", "source": "Home value request", "area": "Zachary", "name": "Pat Example"}, {"threadId": "t", "test": True}],
       "deadlines": {"all": [{"day": "2026-11-06", "title": "1 Demo Ln - Appraisal deadline", "what": "Appraisal deadline"},
                             {"day": "2026-11-20", "title": "far away", "what": "x"}]},
       "problems": []}


class Fake:
    def __init__(self, codes):
        self.codes, self.calls = list(codes), []

    def __call__(self, rq, timeout):
        self.calls.append(rq)
        code = self.codes.pop(0)
        if code >= 400:
            raise urllib.error.HTTPError(rq.full_url, code, "x", {}, None)
        class R:
            status = code
            def __enter__(s): return s
            def __exit__(s, *a): return False
        return R()


class Alerts(unittest.TestCase):
    def test_first_run_learns_leads_then_alerts_new_ones(self):
        a, st = P.new_alerts(PAY, {}, NOW)
        self.assertEqual([x["kind"] for x in a], ["deadline"])  # existing leads are learned, the near deadline alerts
        self.assertEqual(a[0]["title"], "Appraisal deadline tomorrow")
        a, st = P.new_alerts(PAY, st, NOW)
        self.assertEqual(a, [])  # nothing twice
        pay2 = {**PAY, "leads": PAY["leads"] + [{"threadId": "b", "source": "Listing inquiry", "name": "Riley Demo"}]}
        a, st = P.new_alerts(pay2, st, NOW)
        self.assertEqual([(x["kind"], x["body"]) for x in a], [("lead", "Listing inquiry")])
        self.assertNotIn("Riley", json.dumps(a))  # no client names on the lock screen

    def test_failed_read_alerts_once(self):
        _, st = P.new_alerts(PAY, {}, NOW)
        bad = {**PAY, "problems": [{"name": "calendar", "state": "failed"}]}
        a, st = P.new_alerts(bad, st, NOW)
        self.assertEqual([x["kind"] for x in a], ["sync"])
        self.assertEqual(P.new_alerts(bad, st, NOW)[0], [])

    def test_subscribe_only_push_services(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "subs.json"
            self.assertEqual(P.subscribe({"endpoint": "https://web.push.apple.com/abc"}, p), 1)
            self.assertEqual(P.subscribe({"endpoint": "https://web.push.apple.com/abc"}, p), 1)
            for bad in ("http://web.push.apple.com/x", "https://evil.example/x", "https://push.apple.com.evil.example/x"):
                with self.assertRaises(ValueError):
                    P.subscribe({"endpoint": bad}, p)

    def test_run_sends_empty_signed_push_and_drops_gone_phones(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            P.subscribe({"endpoint": "https://web.push.apple.com/one"}, d / "subs.json")
            P.subscribe({"endpoint": "https://web.push.apple.com/two"}, d / "subs.json")
            f = Fake([201, 410])
            r = P.run(PAY, NOW, d, d / "subs.json", d / "keys.json", f)
            self.assertEqual((r["new"], r["sent"], r["removed"]), (1, 1, 1))
            rq = f.calls[0]
            self.assertEqual((rq.data, rq.get_method()), (b"", "POST"))
            self.assertTrue(rq.get_header("Authorization").startswith("vapid t="))
            self.assertEqual(len(json.loads((d / "subs.json").read_text())), 1)
            self.assertEqual(json.loads((d / "alerts.json").read_text())["rows"][0]["kind"], "deadline")
            self.assertEqual(P.run(PAY, NOW, d, d / "subs.json", d / "keys.json", Fake([]))["sent"], 0)  # nothing new, nothing sent


if __name__ == "__main__":
    unittest.main(verbosity=1)
