"""Checks for the Claude draft writer, with Claude faked. Made-up people only, nothing is sent and no key is used.
Run: python3 aire/pipeline-app/drafter_test.py"""
import json
import tempfile
import types
import unittest
from datetime import datetime, timedelta
from pathlib import Path

import cc
import drafter as D

NOW = datetime(2026, 11, 9, 15, 30, tzinfo=cc.CENTRAL)
SIGN = "\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303"
TEXT_Q = {"drafts": [
    {"person_id": "247", "name": "Taylor Sample", "phone": "+12255550142", "pool": "active-buyer", "template": 2, "days_quiet": 9,
     "text": "Hey Taylor, a couple new ones popped up near what you wanted. Want them?"},
    {"person_id": "85", "name": "Jordan Sample", "phone": "+12255550185", "pool": "seller-candidate", "template": 1, "days_quiet": 40,
     "text": "Hey Jordan, want me to run what your place would bring right now? Ten minutes, no strings."}]}
EMAIL_Q = {"drafts": [
    {"person_id": "312", "name": "Morgan Demo", "email": "morgan.demo@example.com", "pool": "past-client", "template": 0, "days_quiet": 95,
     "subject": "Checking in", "body": "Hi Morgan, checking in on the house. Anything you need?" + SIGN},
    {"person_id": "401", "name": "Casey Night", "email": "casey.night@example.com", "pool": "past-client", "subject": "Hi", "body": "Hi Casey, no sign-off on this one."}]}


class FakeClaude:
    """client.beta.messages.create(...) that answers every item with its own wording and records what it was sent."""
    def __init__(self, reply=None, stop="end_turn", usage=(3000, 900)):
        self.calls, self.reply, self.stop, self.usage = [], reply, stop, usage
        self.beta = types.SimpleNamespace(messages=types.SimpleNamespace(create=self.create))

    def create(self, **kw):
        self.calls.append(kw)
        ask = json.loads(kw["messages"][0]["content"])
        drafts = self.reply(ask) if self.reply else [{"key": r["key"], "text": f"{r['first_name']}, Caleb here. Quick one for you."} for r in ask["items"]]
        return types.SimpleNamespace(model=D.MODEL, stop_reason=self.stop, content=[types.SimpleNamespace(type="text", text=json.dumps({"drafts": drafts}))],
                                     usage=types.SimpleNamespace(input_tokens=self.usage[0], output_tokens=self.usage[1], cache_creation_input_tokens=0, cache_read_input_tokens=0))


class Writer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.dir = Path(self.tmp.name)
        self.folder, self.log = self.dir / "handoff", self.dir / "draft-usage.json"

    def tearDown(self):
        self.tmp.cleanup()

    def run_pass(self, client, tq=TEXT_Q, eq=EMAIL_Q, now=NOW, cap=D.CAP):
        return D.run(client, tq, eq, self.folder, self.log, now, SIGN, cap)

    def shown(self, tq=TEXT_Q, eq=EMAIL_Q):
        return D.apply(tq, eq, D.read_json(self.folder / "claude-drafts.json", {}), SIGN)

    def test_each_draft_is_written_once_and_kept(self):
        c = FakeClaude()
        self.assertEqual(self.run_pass(c), {"written": 3, "note": ""})
        self.assertEqual(len(c.calls), 2)  # one request for texts, one for emails
        self.assertEqual(self.run_pass(c, now=NOW + timedelta(minutes=15)), {"written": 0, "note": ""})
        self.assertEqual(len(c.calls), 2)
        tq, eq, n = self.shown()
        self.assertEqual((n, tq["drafts"][0]["text"], tq["drafts"][0]["by"], tq["drafts"][0]["template_text"]),
                         (3, "Taylor, Caleb here. Quick one for you.", "claude", TEXT_Q["drafts"][0]["text"]))
        self.assertEqual(TEXT_Q["drafts"][0].get("by"), None)

    def test_email_keeps_its_sign_off_and_one_without_is_left_alone(self):
        self.run_pass(FakeClaude())
        _, eq, _ = self.shown()
        self.assertEqual(eq["drafts"][0]["body"], "Morgan, Caleb here. Quick one for you." + SIGN)
        self.assertEqual(eq["drafts"][1], EMAIL_Q["drafts"][1])

    def test_only_first_names_and_draft_text_go_to_claude(self):
        c = FakeClaude()
        self.run_pass(c)
        sent = json.dumps([k["messages"] for k in c.calls])
        for private in ("5550142", "5550185", "example.com", "Sample", "Demo", "747-0303", "person_id"):
            self.assertNotIn(private, sent)
        self.assertIn("Taylor", sent)
        kw = c.calls[0]
        self.assertEqual((kw["model"], kw["output_config"]["effort"], kw["output_config"]["format"]["type"], kw["system"][0]["cache_control"]),
                         ("claude-sonnet-5-5", "low", "json_schema", {"type": "ephemeral"}))

    def test_a_changed_template_is_written_again(self):
        c = FakeClaude()
        self.run_pass(c)
        tq = {"drafts": [{**TEXT_Q["drafts"][0], "text": "Hey Taylor, new template words."}, TEXT_Q["drafts"][1]]}
        self.assertEqual(self.shown(tq)[0]["drafts"][0]["text"], "Hey Taylor, new template words.")
        self.assertEqual(self.run_pass(c, tq)["written"], 1)
        self.assertEqual(len(json.loads(c.calls[-1]["messages"][0]["content"])["items"]), 1)

    def test_cost_is_logged_and_the_cap_stops_it(self):
        self.run_pass(FakeClaude(usage=(100000, 20000)))  # 2 requests x ($0.20 in + $0.20 out)
        rows = json.loads(self.log.read_text())
        self.assertEqual(([r["kind"] for r in rows], round(sum(r["cost"] for r in rows), 2)), (["text", "email"], 0.80))
        c = FakeClaude()
        tq = {"drafts": [{**TEXT_Q["drafts"][0], "text": "Hey Taylor, another template."}]}
        r = self.run_pass(c, tq, {"drafts": []})
        self.assertEqual((r["written"], c.calls, "limit" in r["note"]), (0, [], True))
        self.assertEqual(self.run_pass(c, tq, {"drafts": []}, now=NOW + timedelta(days=1))["written"], 1)

    def test_bad_answers_keep_the_template(self):
        bad = lambda ask: [{"key": ask["items"][0]["key"], "text": "Hey there — great news; call me"},   # em dash, semicolon, wrong name
                           {"key": "text:999", "text": "Taylor, hi"}]                                        # a key that was never asked
        self.assertEqual(self.run_pass(FakeClaude(reply=bad))["written"], 0)
        self.assertEqual(self.run_pass(FakeClaude(stop="refusal"))["written"], 0)
        self.assertEqual(self.shown()[2], 0)
        long_one = lambda ask: [{"key": r["key"], "text": r["first_name"] + " " + "word " * 200} for r in ask["items"]]
        self.assertEqual(self.run_pass(FakeClaude(reply=long_one))["written"], 0)

    def test_calebs_rewrites_go_in_as_the_style_guide(self):
        self.folder.mkdir()
        rows = [{"sent_at": f"2026-11-0{i}", "kind": "text", "pool": "active-buyer", "wording": "real", "draft": f"template {i}", "sent": f"how Caleb said it {i}"} for i in range(1, 4)]
        rows.append({"sent_at": "2026-11-08", "kind": "email", "pool": "past-client", "wording": "as opened", "draft": "email template", "sent": "email his way"})
        (self.folder / "style-examples.jsonl").write_text("\n".join(json.dumps(r) for r in rows))
        c = FakeClaude()
        self.run_pass(c)
        text_ask, email_ask = (json.loads(k["messages"][0]["content"]) for k in c.calls)
        self.assertEqual([e["caleb_sent"] for e in text_ask["calebs_own_rewrites"]], ["how Caleb said it 1", "how Caleb said it 2", "how Caleb said it 3"])
        self.assertEqual(email_ask["calebs_own_rewrites"], [{"pool": "past-client", "draft": "email template", "caleb_sent": "email his way"}])


class InPipeline(unittest.TestCase):
    """Through app.State in demo mode: the snapshot shows Claude's wording, and nothing runs without a client."""
    def test_snapshot_shows_claudes_draft_and_demo_never_calls_out(self):
        import app
        with tempfile.TemporaryDirectory() as t:
            s = app.State(demo=True, send_log=Path(t) / "send-log.json")
            self.assertEqual(s.draft_pass()["written"], 0)
            before = s.snapshot()
            self.assertEqual((before["drafts_by"]["written"], before["drafts_by"]["on"]), (0, False))
            c = FakeClaude()
            n = s.draft_pass(client=c)["written"]
            snap = s.snapshot()
            d = snap["text_queue"]["drafts"][0]
            self.assertTrue(n >= 1 and d["by"] == "claude" and d["template_text"] == before["text_queue"]["drafts"][0]["text"])
            self.assertEqual((snap["drafts_by"]["written"], snap["drafts_by"]["on"], snap["drafts_by"]["model"]), (n, True, "claude-sonnet-5-5"))
            self.assertGreater(snap["drafts_by"]["spent"], 0)


if __name__ == "__main__":
    unittest.main()
