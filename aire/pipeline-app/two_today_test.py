"""Checks for two_today.py, the "two today" practice run, on the made-up example in fixtures/two-today-example.
Every person, handle and text in it is an example. Nothing is sent, drafted or written to the CRM.
Run: python3 aire/pipeline-app/two_today_test.py"""
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

import outreach
import two_today as TT

EX = TT.EXAMPLE
DAY = date(2026, 11, 12)


def load():
    feed = TT.read_json(EX / "people.json", {})
    engagers = TT.social.with_post_types(TT.read_csv(EX / "engagers.csv"), TT.read_csv(EX / "posts.csv"))
    return engagers, TT.read_csv(EX / "handles.csv"), outreach.context(feed, DAY)


class PracticeRun(unittest.TestCase):
    def setUp(self):
        self.engagers, self.handles, self.ctx = load()
        self.r = TT.score_day(DAY, self.engagers, self.handles, self.ctx)

    def test_the_two_picks_and_their_points_match_the_plans_worked_example(self):
        got = [(c["who"], c["total"], c["parts"]) for c in self.r["picks"]]
        self.assertEqual(got, [("Mia Example", 21, {"engagement": 6, "reason": 7, "match": 5, "timing": 3}),
                               ("Jo Example", 17, {"engagement": 4, "reason": 5, "match": 5, "timing": 3})])
        self.assertIn("Commented on your just sold post", self.r["picks"][0]["why"])

    def test_the_backups_and_an_unmatched_handle_never_gets_a_text(self):
        got = [(c["who"], c["total"], c["matched"]) for c in self.r["backups"]]
        self.assertEqual(got, [("Alex Example", 16, True), ("@example.handle.one", 10, False)])
        self.assertIn("Not in your CRM yet. Never a text", self.r["backups"][1]["note"])
        self.assertEqual(self.r["backups"][0]["parts"]["timing"], 0)  # inside cadence: a fresh reason pulled them ahead

    def test_everyone_else_is_held_or_left_out_with_the_reason(self):
        out = {o["who"]: o["rule"] for o in self.r["out"]}
        self.assertEqual(out, {"Reggie Example": "too_soon", "Sam Example": "no_reason", "Tyler Example": "soft_no", "Dana Example": "possible_deal",
                               "@example.handle.two": "reply"})

    def test_a_question_goes_on_the_reply_list_and_takes_no_pick_slot(self):
        self.assertEqual([(q["handle"], q["action"]) for q in self.r["replies"]], [("example.handle.two", "comment")])
        self.assertNotIn("@example.handle.two", [c["who"] for c in self.r["picks"] + self.r["backups"]])

    def test_likes_are_a_reason_that_is_never_mentioned(self):
        mia, jo = (c["reason"] for c in self.r["picks"])
        self.assertEqual((mia["type"], mia["mention"], jo["type"], jo["mention"]), ("social_comment", True, "likes", False))

    def test_only_one_qualifies_shows_one_and_an_unmatched_handle_fills_a_slot_only_then(self):
        alone = TT.score_day(date(2026, 11, 6), self.engagers, self.handles, self.ctx)
        self.assertEqual(([c["who"] for c in alone["picks"]], alone["backups"]), (["Alex Example"], []))
        rest = {k: date(2026, 11, 1) for k in ("9001", "9002", "9003")}  # all three were picks 11 days ago
        short = TT.score_day(DAY, self.engagers, self.handles, self.ctx, rest)
        self.assertEqual([(c["who"], c["matched"]) for c in short["picks"]], [("@example.handle.one", False)])
        self.assertEqual({o["rule"] for o in short["out"] if o["who"] in ("Mia Example", "Jo Example", "Alex Example")}, {"repeat"})

    def test_older_engagement_counts_half_and_engagement_is_capped(self):
        rows = [{"handle": "example.mia.denham", "platform": "instagram", "action": "share", "date": "2026-11-02", "post_type": "listing", "said": ""}]
        r = TT.score_day(DAY, rows, self.handles, self.ctx)
        self.assertEqual(r["picks"][0]["parts"]["engagement"], 2)        # a share is 4, ten days old counts half
        many = [{**rows[0], "action": "dm", "date": "2026-11-11"}] * 5
        self.assertEqual(TT.score_day(DAY, many + rows, self.handles, self.ctx)["picks"][0]["parts"]["engagement"], 12)
        self.assertEqual(TT.score_day(DAY, [{**rows[0], "date": "2026-10-20"}], self.handles, self.ctx)["picks"], [])  # older than 14 days

    def test_a_week_never_repeats_a_pick_and_the_report_names_only_the_example(self):
        week = TT.run_week(DAY, 7, self.engagers, self.handles, self.ctx)
        keys = [c["key"] for r in week for c in r["picks"]]
        self.assertEqual((len(week), len(keys), len(set(keys)), all(len(r["picks"]) <= 2 and len(r["backups"]) <= 3 for r in week)), (7, len(set(keys)), len(keys), True))
        text = TT.report(week, example=True)
        self.assertIn("EXAMPLE, made-up people", text)
        self.assertIn("Nothing was sent, drafted or written to the CRM", text)
        self.assertEqual(text.count("\n## "), 7)

    def test_the_script_runs_on_the_example_and_prints_counts_only(self):
        with tempfile.TemporaryDirectory() as t:
            out = Path(t) / "practice.md"
            p = subprocess.run([sys.executable, str(Path(TT.__file__)), "--example", "--out", str(out)], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertTrue(out.exists() and "Mia Example" in out.read_text())
            self.assertFalse(any(n in p.stdout for n in ("Mia", "Jo Example", "example.handle")))

    def test_the_social_folder_replaces_the_hand_filled_list_and_a_confirmed_match_is_linked(self):
        import json, os
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            (d / "engagers-2026-11-11.json").write_text(json.dumps([
                {"platform": "ig", "handle": "example.new.one", "action": "comment", "seen_at": "2026-11-11T10:00:00-06:00", "post_type": "just_sold", "post_ref": "https://www.instagram.com/p/EXAMPLE-SOLD-1"}]))
            out = Path(t) / "r.md"
            env = {**os.environ, "PIPELINE_SOCIAL_DIR": str(d)}
            run = lambda: subprocess.run([sys.executable, str(Path(TT.__file__)), "--feed", str(EX / "people.json"), "--handles", str(EX / "handles.csv"), "--out", str(out)],
                                         capture_output=True, text=True, env=env)
            p = run()
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("1 rows read from 1 social files", p.stdout)
            self.assertIn("@example.new.one", out.read_text())              # not confirmed: unmatched, shown as not in the CRM, never a text
            self.assertIn("Not in your CRM yet", out.read_text())
            (d / "matches.json").write_text(json.dumps({"confirmed": [{"contact_id": "9005", "platform": "ig", "handle": "example.new.one", "confirmed_at": "2026-11-12T10:00:00-06:00"}], "rejected": []}))
            self.assertEqual(run().returncode, 0)
            text = out.read_text()
            self.assertIn("Sam Example", text)
            self.assertNotIn("Not in your CRM yet", text)
            self.assertFalse(any(n in p.stdout for n in ("Sam", "example.")))

    def test_the_old_five_column_engagers_file_still_loads(self):
        old = [{"handle": "@Example.Mia.Denham", "platform": "Instagram", "action": "Comment", "date": "2026-11-10", "post": "https://www.instagram.com/p/EXAMPLE-SOLD-1/"}]
        rows = TT.social.with_post_types(old, TT.read_csv(EX / "posts.csv"))
        self.assertEqual((rows[0]["post_type"], rows[0]["action"], rows[0]["said"]), ("just_sold", "comment", ""))
        self.assertEqual(TT.social.with_post_types(old)[0]["post_type"], "")           # no type and no posts table: never counted as real estate
        built = TT.social.build(old, self.handles, DAY)
        self.assertEqual(built["9001"]["social_weight_90d"], 3)                        # the per-person counts are unchanged


if __name__ == "__main__":
    unittest.main()
