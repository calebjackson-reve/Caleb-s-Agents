#!/usr/bin/env python3
"""Offline checks for the Pipeline server. Made-up people only (tests/fixtures). No network, no CRM, no Messages.

    python3 -m unittest discover -s aire/pipeline-app/tests -p 'test_*.py'
"""
from __future__ import annotations

import json
import os
import pathlib
import shutil
import sys
import tempfile
import unittest
import urllib.request
import threading
from http.server import ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
APP = HERE.parent
FIX = HERE / "fixtures"
TMP = pathlib.Path(tempfile.mkdtemp(prefix="pipeline-test-"))
os.environ.update(AIRE_HOME=str(TMP / "home"), AIRE_FEED=str(TMP / "feed.json"), AIRE_QUEUES=str(FIX / "queues"),
                  AIRE_PREDRAFTS=str(TMP / "predrafts.json"), AIRE_PIPELINE_STATE=str(TMP / "state.json"),
                  AIRE_CRM_ENGINE=str(TMP / "missing-crm.py"))
sys.path.insert(0, str(APP))
import server  # noqa: E402
sys.path.insert(0, str(APP / "engine"))
import conversation  # noqa: E402


def fresh_feed(**over):
    f = json.loads((FIX / "feed.sample.json").read_text())
    f["generated_at"] = server.now_utc().isoformat()
    f.update(over)
    (TMP / "feed.json").write_text(json.dumps(f))
    return f


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.SETTINGS.update(token="", live_send=False, fake_engine=True)
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        fresh_feed()
        p = json.loads((FIX / "predrafts.sample.json").read_text())
        p["generatedAt"] = server.now_utc().isoformat()
        (TMP / "predrafts.json").write_text(json.dumps(p))
        if (TMP / "state.json").exists():
            (TMP / "state.json").unlink()
        server.SETTINGS.update(token="", live_send=False, fake_engine=True)

    def get(self, path, headers=None):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", headers=headers or {})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read(), dict(r.headers)
        except urllib.error.HTTPError as e:
            return e.code, e.read(), dict(e.headers)

    def post(self, path, body, headers=None):
        data = json.dumps(body).encode()
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method="POST",
                                     headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    # ---- feed assembly
    def test_feed_owes_reply_first_newest_inbound_first(self):
        d = json.loads(self.get("/api/feed")[1])
        self.assertTrue(d["ok"])
        ids = [t["person_id"] for t in d["touches"]]
        self.assertEqual(ids[:2], ["101", "102"], "owes_reply people lead, newest text first")
        self.assertEqual(len(d["touches"][0]["last_messages"]), 3, "last three texts ride along")

    def test_header_ok_false_shows_only_the_error(self):
        fresh_feed(header_ok=False, missing_columns=["Do_Not_Contact"])
        d = json.loads(self.get("/api/feed")[1])
        self.assertFalse(d["ok"])
        self.assertIn("Do_Not_Contact", d["error"])
        self.assertNotIn("touches", d)

    def test_missing_feed_is_an_error_not_a_crash(self):
        (TMP / "feed.json").unlink()
        d = json.loads(self.get("/api/feed")[1])
        self.assertFalse(d["ok"])
        self.assertIn("No feed yet", d["error"])

    def test_stale_feed_is_flagged(self):
        fresh_feed(generated_at="2026-10-01T08:00:00-05:00")
        d = json.loads(self.get("/api/feed")[1])
        self.assertTrue(d["ok"] and d["feed"]["stale"])

    def test_drafts_model_first_then_queue_lines_never_template_for_owes_reply(self):
        d = json.loads(self.get("/api/feed")[1])
        by = {t["person_id"]: t for t in d["touches"]}
        self.assertEqual(by["101"]["draft"]["source"], "model")
        self.assertIsNone(by["102"]["draft"], "they texted last and no model draft: no template")
        self.assertEqual(by["103"]["draft"]["source"], "template")
        self.assertEqual(by["103"]["draft"]["channel"], "Text")
        self.assertEqual(by["104"]["draft"]["channel"], "Email")
        self.assertIn("Keller Williams First Choice", by["104"]["draft"]["body"])
        self.assertIsNone(by["105"]["draft"])

    def test_greeting_names_the_first_person_waiting(self):
        d = json.loads(self.get("/api/feed")[1])
        self.assertIn("2 people are waiting", d["greeting"]["line"])
        self.assertIn("Taylor Sample", d["greeting"]["line"])

    def test_deals_overdue_first_with_close_lines(self):
        d = json.loads(self.get("/api/feed")[1])
        self.assertEqual(d["deals"][0]["address"], "9241 Pecan Tree Dr")
        self.assertEqual(d["deals"][0]["close_state"], "overdue")
        self.assertTrue(d["deals"][1]["close_line"].startswith("Closes in"))
        self.assertEqual(d["deals"][2]["close_line"], "Close date not set")
        self.assertTrue(any(x["moved_today"] for x in d["deals"]))

    def test_tasks_overdue_first(self):
        d = json.loads(self.get("/api/feed")[1])
        self.assertTrue(d["tasks"][0]["overdue"])

    # ---- actions
    def test_touch_goes_through_engine_and_counts_done_today(self):
        code, r = self.post("/api/touch", {"person_id": "103", "what": "Called from Pipeline", "kind": "called"})
        self.assertEqual(code, 200, r)
        self.assertEqual(r["result"]["args"], ["touch", "103", "Called from Pipeline"])
        d = json.loads(self.get("/api/feed")[1])
        self.assertEqual(d["counts"]["done_today"], 1)
        self.assertTrue({t["person_id"]: t for t in d["touches"]}["103"]["local"]["done_today"])
        self.assertEqual(d["touches"][-1]["person_id"], "103", "done people drop to the back")

    def test_touch_refuses_non_numeric_ids(self):
        code, r = self.post("/api/touch", {"person_id": "draft:abc", "what": "x"})
        self.assertEqual(code, 422)
        self.assertIn("person_id", r["error"])

    def test_done_needs_task_id(self):
        code, r = self.post("/api/done", {"task_id": "", "person_id": "102"})
        self.assertEqual(code, 422)
        self.assertIn("sync-tasks", r["error"])
        code, r = self.post("/api/done", {"task_id": "a1b2c3d4", "person_id": "101", "task": "Sign BBA"})
        self.assertEqual(code, 200)
        d = json.loads(self.get("/api/feed")[1])
        self.assertNotIn("a1b2c3d4", [t["task_id"] for t in d["tasks"]])

    def test_engine_refusal_is_surfaced_not_hidden(self):
        server.SETTINGS["fake_engine"] = False  # crm.py path does not exist in the test env
        code, r = self.post("/api/touch", {"person_id": "103", "what": "x"})
        self.assertEqual(code, 422)
        self.assertIn("crm.py not found", r["error"])
        d = json.loads(self.get("/api/feed")[1])
        self.assertEqual(d["counts"]["done_today"], 0, "a refused write records no local outcome")

    def test_snooze_skip_undo(self):
        code, r = self.post("/api/outcome", {"kind": "snooze", "person_id": "104"})
        self.assertEqual(code, 200)
        d = json.loads(self.get("/api/feed")[1])
        self.assertTrue({t["person_id"]: t for t in d["touches"]}["104"]["local"]["snoozed_until"])
        code, r2 = self.post("/api/outcome", {"kind": "undo", "outcome_id": r["outcome"]["id"]})
        self.assertEqual(code, 200)
        d = json.loads(self.get("/api/feed")[1])
        self.assertFalse({t["person_id"]: t for t in d["touches"]}["104"]["local"]["snoozed_until"])
        code, _ = self.post("/api/outcome", {"kind": "skip", "person_id": "105"})
        self.assertEqual(code, 200)

    def test_send_is_dry_run_by_default_even_when_approved(self):
        code, r = self.post("/api/send", {"person_id": "101", "channel": "Text", "to": "+12255550142", "body": "Yes, Saturday works.", "approve": True})
        self.assertEqual(code, 200, r)
        self.assertTrue(r["dry_run"])
        self.assertEqual(r["send"]["status"], "dry_run")
        d = json.loads(self.get("/api/feed")[1])
        self.assertEqual(d["counts"]["done_today"], 0, "a dry run is not a touch")
        self.assertEqual(d["send_log"][0]["status"], "dry_run")

    def test_live_send_needs_both_flag_and_approve(self):
        server.SETTINGS["live_send"] = True
        code, r = self.post("/api/send", {"person_id": "101", "channel": "Text", "to": "+12255550142", "body": "Yes, Saturday works.", "approve": False})
        self.assertTrue(r["dry_run"], "no approve, no send")
        sent = []
        server.live_send = lambda ch, to, s, t: (sent.append((ch, to)), {"ok": True, "detail": "fake"})[1]
        code, r = self.post("/api/send", {"person_id": "101", "channel": "Text", "to": "+12255550142", "body": "See you Saturday.", "approve": True})
        self.assertEqual(code, 200, r)
        self.assertEqual(sent, [("Text", "+12255550142")])
        self.assertEqual(r["touch"]["result"]["args"][:2], ["touch", "101"], "a confirmed send logs the touch")
        code, r = self.post("/api/send", {"person_id": "101", "channel": "Text", "to": "+12255550142", "body": "See you Saturday.", "approve": True})
        self.assertEqual(code, 422)
        self.assertIn("already sent", r["error"], "same exact message never goes twice")

    def test_send_validates_recipients(self):
        code, r = self.post("/api/send", {"person_id": "101", "channel": "Text", "to": "not a phone", "body": "hi", "approve": True})
        self.assertEqual(code, 422)
        code, r = self.post("/api/send", {"person_id": "104", "channel": "Email", "to": "nope", "body": "hi", "subject": "s", "approve": True})
        self.assertEqual(code, 422)

    def test_mark_sent_logs_touch_and_uses_template_once(self):
        code, r = self.post("/api/mark-sent", {"person_id": "103", "channel": "Text", "to": "+12255550133", "body": "Hi Morgan, quick check-in.", "template_id": "seller-candidate:Text:1"})
        self.assertEqual(code, 200, r)
        d = json.loads(self.get("/api/feed")[1])
        self.assertIsNone({t["person_id"]: t for t in d["touches"]}["103"]["draft"], "used line is not offered again")

    # ---- security
    def test_token_required_when_set(self):
        server.SETTINGS["token"] = "s3cret"
        self.assertEqual(self.get("/api/feed")[0], 401)
        self.assertEqual(self.get("/")[0], 401)
        code, body, headers = self.get("/api/feed?token=s3cret")
        self.assertEqual(code, 200)
        self.assertIn("pipeline_token=s3cret", headers.get("Set-Cookie", ""))
        self.assertEqual(self.get("/api/feed", {"Cookie": "pipeline_token=s3cret"})[0], 200)
        self.assertEqual(self.post("/api/outcome", {"kind": "skip", "person_id": "105"})[0], 401)

    def test_cross_origin_post_refused(self):
        code, r = self.post("/api/outcome", {"kind": "skip", "person_id": "105"}, {"Origin": "https://evil.example"})
        self.assertEqual(code, 403)

    def test_static_cannot_escape(self):
        self.assertEqual(self.get("/../server.py")[0], 404)
        self.assertEqual(self.get("/static/../../server.py")[0], 404)
        code, body, h = self.get("/")
        self.assertEqual(code, 200)
        self.assertIn(b"Keller Williams First Choice", body)
        self.assertNotIn(b"R\xc3\xaave", body)
        self.assertEqual(self.get("/manifest.webmanifest")[0], 200)
        self.assertEqual(self.get("/sw.js")[0], 200)

    def test_host_other_than_localhost_requires_token(self):
        with self.assertRaises(SystemExit):
            server.main(["--host", "0.0.0.0"])

    # ---- predraft validator (the 2026-10-29 fix)
    def test_validator_accepts_sentence_start_capitals_and_refuses_commitments(self):
        ctx = {"contactName": "Taylor Sample", "contextHash": "h", "available": True, "turns": [
            {"id": "m1", "direction": "in", "body": "are yall still doing open houses this weekend", "at": "2026-10-28T19:10:00+00:00"}]}
        ok = conversation.validate_draft({"body": "Sure thing. Open house both days this weekend, want to come by?", "evidenceIDs": ["m1"]}, ctx, "Text")
        self.assertIn("Open house", ok["body"])
        with self.assertRaises(ValueError) as e:
            conversation.validate_draft({"body": "Yes! I'll text you the times.", "evidenceIDs": ["m1"]}, ctx, "Text")
        self.assertIn("commitment", str(e.exception))
        with self.assertRaises(ValueError) as e:
            conversation.validate_draft({"body": "Yes, ask Danielle about Saturday.", "evidenceIDs": ["m1"]}, ctx, "Text")
        self.assertIn("another name", str(e.exception))
        with self.assertRaises(ValueError) as e:
            conversation.validate_draft({"body": "Yes, at 2 pm.", "evidenceIDs": ["m1"]}, ctx, "Text")
        self.assertIn("number", str(e.exception))
        trimmed = conversation.validate_draft({"body": "Yes, both days. Want to come by?\n- Caleb", "evidenceIDs": ["m1"]}, ctx, "Text")
        self.assertFalse(trimmed["body"].endswith("Caleb"), "a stray sign-off is trimmed, not fatal")

    def test_draft_prompt_states_the_banned_forms(self):
        seen = {}
        def fake(rules, data):
            seen["rules"] = rules
            return json.dumps({"body": "Yes, both days this weekend. Want to swing by?", "subject": "", "evidenceIDs": ["m1"]})
        ctx = {"contactName": "Taylor Sample", "contextHash": "h", "available": True, "needsReply": True, "recent": True, "reason": "", "turns": [
            {"id": "m1", "direction": "in", "body": "are yall still doing open houses this weekend", "at": "2026-10-28T19:10:00+00:00"}]}
        out = conversation.draft(ctx, "Text", complete=fake, rejected="The suggestion adds an unapproved commitment.")
        self.assertEqual(out["method"], "local-model")
        for banned in ("I'm", "I'll", "sign-off", "number"):
            self.assertIn(banned, seen["rules"])
        self.assertIn("refused because", seen["rules"])


if __name__ == "__main__":
    unittest.main(verbosity=1)
