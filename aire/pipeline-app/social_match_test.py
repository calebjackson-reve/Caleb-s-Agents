"""Checks for social_match.py: the engagers files, the matcher, the match store, and the wiring into two_today and the
drafter's reason. Made-up people only (fixtures/social-match). Every file goes to a temp PIPELINE_SOCIAL_DIR; nothing
touches ~/.aire/social and nothing here sends, calls, or writes a CRM or Deals file.
Run: python3 aire/pipeline-app/social_match_test.py"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path

import outreach
import social_match as SM
import two_today as TT

HERE = Path(__file__).resolve().parent
FIX = HERE / "fixtures" / "social-match"
DAY = date(2026, 11, 12)


def people_ctx():
    feed = json.loads((FIX / "people.json").read_text())
    return outreach.context(feed, DAY), feed


def row(handle, display="", town="", action="like", platform="ig", day=date(2026, 11, 11), **kw):
    return {"platform": platform, "handle": handle, "display_name": display, "bio_town": town, "action": action, "day": day, "profile_url": "",
            "post_ref": "", "post_type": "", "said": "", "phone": "", "email": "", **kw}


class Matcher(unittest.TestCase):
    def setUp(self):
        self.ctx, self.feed = people_ctx()
        self.people = SM.people_from_ctx(self.ctx)

    def run_match(self, rows, handles=None, matches=None):
        return SM.match(rows, self.people, handles, matches)

    def one(self, r, **kw):
        out = self.run_match([r], **kw)
        return out

    def test_name_and_town_is_medium_with_a_plain_why(self):
        c = self.one(row("example.dana", "Dana Sample", "Central"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"], x["why"]) for x in c], [("8001", "medium", "Display name matches. Town matches.")])

    def test_unique_display_name_without_a_town_is_medium(self):
        c = self.one(row("example.riley", "Riley Sample"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"], x["why"]) for x in c], [("8006", "medium", "Display name matches.")])

    def test_name_matches_but_the_town_is_different_is_only_low(self):
        c = self.one(row("example.riley", "Riley Sample", "Baker"))["candidates"]
        self.assertEqual([x["confidence"] for x in c], ["low"])

    def test_username_with_first_and_last_name_for_one_person_is_medium(self):
        c = self.one(row("example.casey.tester", "", "Saint George"))["candidates"]   # CRM says "St. George"
        self.assertEqual([(x["contact_id"], x["confidence"], x["evidence"]) for x in c], [("8005", "medium", ["username", "town"])])
        self.assertEqual(self.one(row("caseytester88"))["candidates"][0]["confidence"], "medium")

    def test_nickname_is_low(self):
        c = self.one(row("example.mike", "Mike Fixture", "Zachary"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"]) for x in c if x["contact_id"] == "8002"], [("8002", "low")])
        self.assertEqual(self.one(row("example.liz", "Liz Demo", platform="fb"))["candidates"][0]["confidence"], "low")
        self.assertTrue(SM.first_names_agree("bill", "william") and SM.first_names_agree("kathy", "katherine") and not SM.first_names_agree("bill", "bob"))

    def test_two_people_with_the_same_name_are_low_and_never_one_pick(self):
        c = self.one(row("example.jordan", "Jordan Example"))["candidates"]
        self.assertEqual(sorted((x["contact_id"], x["confidence"]) for x in c), [("8003", "low"), ("8004", "low")])
        self.assertTrue(all("fits 2 people" in x["why"] for x in c))

    def test_first_name_only_with_no_town_is_not_suggested(self):
        for name in ("Pat", "Mike", "Dana"):
            out = self.one(row("example.first.only", name))
            self.assertEqual((out["candidates"], out["unmatched"]), ([], 1))

    def test_last_name_plus_town_is_low_and_a_town_alone_is_nothing(self):
        c = self.one(row("example.family", "Someone Fixture", "Walker"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"], x["evidence"]) for x in c], [("8007", "low", ["last_name", "town"])])
        self.assertEqual(self.one(row("example.zzz", "Someone Else", "Walker"))["candidates"], [])

    def test_why_never_carries_a_phone_email_or_the_crm_last_name(self):
        c = self.run_match([row("example.dana", "Dana Sample", "Central"), row("example.mike", "Mike Fixture", "Zachary"), row("example.phone", "Nobody Known", phone="225-555-0142")])["candidates"]
        for x in c:
            self.assertNotRegex(x["why"], r"\d{3}|@|Sample|Fixture")

    def test_handle_on_file_is_high_and_linked_not_asked_again(self):
        out = self.one(row("example.dana", "Dana Sample", "Central"), handles=[{"person_id": "8001", "platform": "instagram", "handle": "@Example.Dana"}])
        self.assertEqual(out["candidates"], [])
        self.assertEqual([(x["contact_id"], x["confidence"]) for x in out["linked"]], [("8001", "high")])

    def test_phone_or_email_equal_to_the_crm_row_is_high(self):
        c = self.one(row("example.phone", "Nobody Known", phone="(225) 555-0142"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"], x["why"]) for x in c], [("8002", "high", "Contact details match.")])
        c = self.one(row("example.mail", email="CASEY.TESTER@example.com"))["candidates"]
        self.assertEqual([(x["contact_id"], x["confidence"]) for x in c], [("8005", "high")])

    def test_confirmed_is_not_requeued_rejected_is_not_resuggested_and_the_handle_can_try_another_contact(self):
        r = row("example.jordan", "Jordan Example")
        rej = {"confirmed": [], "rejected": [{"contact_id": "8003", "platform": "ig", "handle": "example.jordan", "rejected_at": "x"}]}
        self.assertEqual([x["contact_id"] for x in self.one(r, matches=rej)["candidates"]], ["8004"])
        done = {"confirmed": [{"contact_id": "8004", "platform": "ig", "handle": "example.jordan", "confirmed_at": "x"}], "rejected": []}
        out = self.one(r, matches=done)
        self.assertEqual((out["candidates"], [x["contact_id"] for x in out["linked"]]), ([], ["8004"]))

    def test_stronger_engagement_comes_first_then_higher_confidence(self):
        rows = [row("example.riley", "Riley Sample", action="like"), row("example.dana", "Dana Sample", "Central", action="comment"), row("example.mike", "Mike Fixture", action="share")]
        self.assertEqual([x["handle"] for x in self.run_match(rows)["candidates"]], ["example.mike", "example.dana", "example.riley"])

    def test_town_short_forms_agree_without_fuzzy_typos(self):
        self.assertEqual((SM.norm_town("St. George"), SM.norm_town("Saint George, LA")), ("saint george", "saint george"))
        self.assertNotEqual(SM.norm_town("Dennham Springs"), SM.norm_town("Denham Springs"))


class Files(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name) / "social"
        self.d.mkdir()
        shutil.copy(FIX / "engagers-2026-11-11.json", self.d)

    def tearDown(self):
        self.tmp.cleanup()

    def test_the_fixture_file_loads_with_platform_and_timezone_rules(self):
        rows, n = SM.load_engagers(self.d, until=DAY)
        self.assertEqual((n["files"], n["rows"], n["skipped"]), (1, 8, 0))
        by = {r["handle"]: r for r in rows}
        self.assertEqual((by["example.riley"]["platform"], by["example.liz"]["platform"]), ("ig", "fb"))     # "instagram", "@Example.Riley" normalized
        self.assertEqual(by["example.casey.tester"]["day"], date(2026, 11, 11))                              # date-only value
        self.assertEqual(by["example.casey.tester"]["post_type"], "listing")
        self.assertEqual(by["example.riley"]["bio_town"], "")                                                # optional fields are empty, not missing
        sig = SM.to_signal_rows(rows)
        self.assertEqual({s["platform"] for s in sig}, {"instagram", "facebook"})

    def test_seen_at_is_the_chicago_calendar_date(self):
        self.assertEqual(SM.chicago_day("2026-11-11T23:30:00-06:00"), date(2026, 11, 11))
        self.assertEqual(SM.chicago_day("2026-11-12T03:30:00+00:00"), date(2026, 11, 11))   # 9:30 PM the night before in Chicago
        self.assertEqual(SM.chicago_day("2026-11-12T03:30:00Z"), date(2026, 11, 11))
        self.assertEqual(SM.chicago_day("2026-11-12"), date(2026, 11, 12))
        self.assertIsNone(SM.chicago_day("yesterday"))

    def test_bad_rows_are_skipped_and_counted_never_named(self):
        (self.d / "engagers-2026-11-12.json").write_text(json.dumps([
            {"platform": "tiktok", "handle": "example.a", "action": "like", "seen_at": "2026-11-12"},
            {"platform": "ig", "handle": "example.b", "action": "poke", "seen_at": "2026-11-12"},
            {"platform": "ig", "handle": "", "action": "like", "seen_at": "2026-11-12"},
            {"platform": "ig", "handle": "example.c", "action": "dm", "seen_at": "not a date"},
            {"platform": "facebook", "handle": "example.ok", "action": "Story Reply", "seen_at": "2026-11-12"}]))
        rows, n = SM.load_engagers(self.d, until=DAY)
        self.assertEqual((n["skipped"], [r["handle"] for r in rows if r["day"] == DAY], [r["action"] for r in rows if r["day"] == DAY]), (4, ["example.ok"], ["story_reply"]))

    def test_csv_is_read_only_when_that_days_json_is_absent_and_the_window_is_14_days(self):
        (self.d / "engagers-2026-11-10.csv").write_text("platform,handle,action,seen_at,display_name\nig,example.csvone,comment,2026-11-10T08:00:00-06:00,Csv One\n")
        (self.d / "engagers-2026-11-11.csv").write_text("platform,handle,action,seen_at\nig,example.shadow,like,2026-11-11\n")     # JSON exists for 11-11: CSV ignored
        (self.d / "engagers-2026-10-29.json").write_text(json.dumps([{"platform": "ig", "handle": "example.edge", "action": "like", "seen_at": "2026-10-29"}]))   # day 14: in
        (self.d / "engagers-2026-10-28.json").write_text(json.dumps([{"platform": "ig", "handle": "example.old", "action": "like", "seen_at": "2026-10-28"}]))    # day 15: out
        (self.d / "notes.json").write_text("[]")
        rows, n = SM.load_engagers(self.d, until=DAY)
        handles = {r["handle"] for r in rows}
        self.assertIn("example.csvone", handles)
        self.assertIn("example.edge", handles)
        self.assertNotIn("example.shadow", handles)
        self.assertNotIn("example.old", handles)
        self.assertEqual(n["files"], 3)

    def test_a_missing_folder_is_not_an_error_and_is_created_where_given(self):
        gone = Path(self.tmp.name) / "nope" / "social"
        self.assertEqual(SM.load_engagers(gone, until=DAY)[0], [])
        self.assertTrue(gone.is_dir())

    def test_folder_comes_from_the_env_and_the_default_is_under_home_aire_social(self):
        old = os.environ.get("PIPELINE_SOCIAL_DIR")
        try:
            os.environ["PIPELINE_SOCIAL_DIR"] = str(self.d)
            self.assertEqual(SM.social_dir(), self.d)
            self.assertEqual(SM.matches_path(), self.d / "matches.json")
            del os.environ["PIPELINE_SOCIAL_DIR"]
            self.assertEqual(SM.social_dir(), Path.home() / ".aire" / "social")
            self.assertEqual(SM.default_dir(), Path.home() / ".aire" / "social")
        finally:
            os.environ.pop("PIPELINE_SOCIAL_DIR", None)
            if old is not None:
                os.environ["PIPELINE_SOCIAL_DIR"] = old


def raw(handle, action="like", platform="facebook", display="", seen="2026-11-11T18:04:00-06:00"):
    return {"platform": platform, "handle": handle, "action": action, "seen_at": seen, "display_name": display}


class FbAliases(unittest.TestCase):
    def test_each_facebook_verb_is_stored_as_its_canonical_action(self):
        want = {"reaction": "like", "mention": "comment", "tag": "comment", "page_follow": "follow", "friend_request": "follow"}
        for verb, canon in want.items():
            out = SM.normalize_row(raw("example.fb.one", verb))
            self.assertIsNotNone(out, verb)
            self.assertEqual((out["action"], out["handle"], out["day"]), (canon, "example.fb.one", date(2026, 11, 11)))
        self.assertEqual(SM.norm_action("Page Follow"), "follow")

    def test_a_still_unknown_action_is_skipped(self):
        self.assertIsNone(SM.normalize_row(raw("example.fb.one", "poke")))
        self.assertEqual(SM.norm_action("poke"), "")

    def test_existing_actions_normalize_as_before(self):
        self.assertEqual(SM.normalize_row(raw("example.ig.one", "like", "instagram"))["action"], "like")
        self.assertEqual(SM.normalize_row(raw("example.ig.one", "comment", "ig"))["action"], "comment")
        self.assertEqual(SM.normalize_row(raw("example.fb.one", "Story Reply"))["action"], "story_reply")
        self.assertEqual(SM.norm_action("share"), "share")

    def test_profile_id_handle_becomes_the_numeric_id_and_the_row_loads(self):
        out = SM.normalize_row(raw("profile.php?id=12345678901234", "like"))
        self.assertIsNotNone(out)
        self.assertEqual(out["handle"], "12345678901234")

    def test_profile_id_with_a_url_prefix_extracts_the_id(self):
        out = SM.normalize_row(raw("https://www.facebook.com/profile.php?id=98765432100001", "comment"))
        self.assertEqual((out["handle"], out["action"]), ("98765432100001", "comment"))
        self.assertEqual(SM.norm_handle_row("facebook.com/profile.php?id=98765432100002"), "98765432100002")

    def test_an_ordinary_handle_is_unchanged(self):
        self.assertEqual(SM.normalize_row(raw("@Example.Mia.Denham", "like"))["handle"], "example.mia.denham")
        self.assertEqual(SM.norm_handle_row("example.mia.denham"), "example.mia.denham")

    def test_an_empty_handle_is_still_skipped_even_with_a_display_name_or_an_alias(self):
        self.assertIsNone(SM.normalize_row(raw("", "like", display="Nobody Fixture")))
        self.assertIsNone(SM.normalize_row(raw("", "reaction", display="Nobody Fixture")))
        self.assertIsNone(SM.normalize_row(raw("   ", "mention")))

    def test_a_query_string_without_profile_digits_is_still_skipped(self):
        self.assertIsNone(SM.normalize_row(raw("profile.php?id=abc", "like")))
        self.assertIsNone(SM.normalize_row(raw("profile.php?name=example", "like")))
        self.assertIsNone(SM.normalize_row(raw("https://www.facebook.com/profile.php?id=", "like")))


class Store(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_confirm_and_not_them_write_only_matches_json(self):
        crm = Path(self.tmp.name) / "fake-crm"
        crm.mkdir()
        (crm / "deals.csv").write_text("deal,price\n700 Fixture Rd,1\n")
        before = {p.name: p.read_bytes() for p in crm.iterdir()}
        at = datetime(2026, 11, 12, 10, 0, tzinfo=SM.CHICAGO)
        SM.decide(self.d, "instagram", "@Example.Dana", "8001", "confirm", at)
        SM.decide(self.d, "ig", "example.jordan", "8003", "reject", at)
        data = json.loads((self.d / "matches.json").read_text())
        self.assertEqual(data["confirmed"], [{"contact_id": "8001", "platform": "ig", "handle": "example.dana", "confirmed_at": "2026-11-12T10:00:00-06:00"}])
        self.assertEqual(data["rejected"], [{"contact_id": "8003", "platform": "ig", "handle": "example.jordan", "rejected_at": "2026-11-12T10:00:00-06:00"}])
        self.assertEqual(sorted(p.name for p in self.d.iterdir() if p.name != "fake-crm"), ["matches.json"])      # no temp file left, nothing else written
        self.assertEqual({p.name: p.read_bytes() for p in crm.iterdir()}, before)                                # the fake CRM / Deals folder is untouched
        self.assertNotRegex(json.dumps(data), r"@|said|phone|email")

    def test_the_last_answer_wins_and_a_bad_request_is_refused(self):
        SM.decide(self.d, "ig", "example.dana", "8001", "confirm")
        SM.decide(self.d, "ig", "example.dana", "8001", "reject")
        data = SM.load_matches(self.d)
        self.assertEqual((len(data["confirmed"]), len(data["rejected"])), (0, 1))
        for bad in (("tiktok", "x.y", "8001", "confirm"), ("ig", "", "8001", "confirm"), ("ig", "x y!", "8001", "confirm"), ("ig", "x.y", "", "confirm"), ("ig", "x.y", "8001", "send")):
            with self.assertRaises(ValueError):
                SM.decide(self.d, *bad)
        self.assertEqual(len(SM.load_matches(self.d)["rejected"]), 1)

    def test_an_unreadable_store_is_never_overwritten(self):
        (self.d / "matches.json").write_text("{not json")
        with self.assertRaises(ValueError):
            SM.decide(self.d, "ig", "example.dana", "8001", "confirm")
        self.assertEqual((self.d / "matches.json").read_text(), "{not json")
        self.assertEqual(SM.load_matches(self.d), {"confirmed": [], "rejected": []})


class Wiring(unittest.TestCase):
    """two_today and the drafter's reason, on a temp social folder with one confirmed match."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name) / "social"
        self.d.mkdir()
        shutil.copy(FIX / "engagers-2026-11-11.json", self.d)
        self.ctx, self.feed = people_ctx()

    def tearDown(self):
        self.tmp.cleanup()

    def signal(self):
        return SM.to_signal_rows(SM.load_engagers(self.d, until=DAY)[0])

    def test_a_confirmed_match_scores_five_match_points_and_an_unconfirmed_candidate_scores_zero(self):
        SM.decide(self.d, "ig", "example.dana", "8001", "confirm")
        hs = SM.confirmed_handle_rows(SM.load_matches(self.d))
        self.assertEqual(hs, [{"person_id": "8001", "platform": "instagram", "handle": "example.dana"}])
        r = TT.score_day(DAY, self.signal(), hs, self.ctx)
        everyone = r["picks"] + r["backups"]
        dana = next(c for c in everyone if c["person_id"] == "8001")
        self.assertEqual((dana["parts"]["match"], dana["matched"], dana["reason"]["type"], dana["reason"]["mention"]), (5, True, "social_comment", True))
        self.assertIn("Commented on your just sold post", dana["why"])
        riley = [c for c in everyone if c["handle"] == "example.riley"]       # a like candidate, never confirmed: unmatched, zero points
        self.assertTrue(all(c["parts"]["match"] == 0 and not c["person_id"] for c in riley))

    def test_the_script_uses_the_social_folder_and_prints_counts_only(self):
        SM.decide(self.d, "ig", "example.dana", "8001", "confirm")
        out = Path(self.tmp.name) / "report.md"
        env = {**os.environ, "PIPELINE_SOCIAL_DIR": str(self.d)}
        p = subprocess.run([sys.executable, str(HERE / "two_today.py"), "--feed", str(FIX / "people.json"), "--out", str(out)], capture_output=True, text=True, env=env)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        self.assertIn("from 1 social files", p.stdout)
        self.assertFalse(any(n in p.stdout for n in ("Dana", "example.")))
        self.assertIn("Dana Sample", out.read_text())
        # --example ignores the folder; so does --engagers
        q = subprocess.run([sys.executable, str(HERE / "two_today.py"), "--example", "--out", str(Path(self.tmp.name) / "ex.md")], capture_output=True, text=True, env=env)
        self.assertEqual(q.returncode, 0, q.stderr)
        self.assertNotIn("social files", q.stdout)

    def test_a_missing_or_empty_social_folder_leaves_two_today_on_its_defaults(self):
        env = {**os.environ, "PIPELINE_SOCIAL_DIR": str(Path(self.tmp.name) / "empty")}
        p = subprocess.run([sys.executable, str(HERE / "two_today.py"), "--feed", str(FIX / "people.json"), "--out", str(Path(self.tmp.name) / "r.md")], capture_output=True, text=True, env=env)
        self.assertNotIn("social files", p.stdout)     # falls back to engagers.csv (not there on a clean checkout: the old message, exit 1)
        self.assertIn(p.returncode, (0, 1))

    def test_the_drafter_reason_comes_only_from_linked_people(self):
        SM.decide(self.d, "ig", "example.dana", "8001", "confirm")
        hs = SM.confirmed_handle_rows(SM.load_matches(self.d))
        self.ctx["social"] = SM.for_ctx(self.signal(), hs, DAY)
        self.assertEqual(list(self.ctx["social"]), ["8001"])                                   # Riley's like is only a candidate: no reason
        r = outreach.reason_for("8001", self.ctx)
        self.assertEqual(r, {"type": "saw_on_ig", "line": "They commented on your just sold post.", "date": "2026-11-11", "mention": True})
        self.assertIsNone(outreach.reason_for("8006", self.ctx))
        self.assertNotRegex(r["line"], r"Sample|example|@|Example comment")

    def test_without_social_data_reason_for_is_unchanged(self):
        self.assertIsNone(outreach.reason_for("8001", self.ctx))
        self.ctx["social"] = {}
        self.assertIsNone(outreach.reason_for("8001", self.ctx))


if __name__ == "__main__":
    unittest.main()
