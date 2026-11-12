"""Checks for outreach.py: every hold rule, the reason row, the register, the openers, calls counted as reached, and
the hold rules where the queue is built (followups.build_feed_queue) and where Pipeline loads it (app.State).
Made-up people only. Nothing is sent and no key is used. Run: python3 aire/pipeline-app/outreach_test.py"""
import json
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

import outreach as O

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "follow-up"))

T = date(2026, 11, 12)
ago = lambda n: (T - timedelta(days=n)).isoformat()


def person(pid, name="Taylor Sample", **kw):
    """A made-up person who is due and has nothing in the way: warm, 20 days quiet, last text out 20 days ago."""
    return {"person_id": pid, "display": name, "band": "warm", "phone": "+12255550100", "email": "", "days_quiet": 20, "owes_reply": False,
            "last_inbound": ago(25), "last_outbound": ago(20), "last_messages": [], "type": "client", "stage": "nurture", **kw}


def ctx_for(*rows, **kw):
    feed = {"touches_due": [r for r in rows if not r.get("_partner")], "partners": [r for r in rows if r.get("_partner")],
            "deals": kw.pop("deals", []), "no_text_consent": kw.pop("no_text", []), "label_review": kw.pop("review", []),
            "heat": kw.pop("heat", {})}
    return O.context(feed, T, **kw)


def sent(pid, days, text="Hey Taylor, how y'all been?", **kw):
    return {"at": ago(days) + "T10:00:00-06:00", "kind": "text", "person_id": pid, "status": "sent", "text": text, **kw}


class HoldRules(unittest.TestCase):
    def rule(self, row, **kw):
        h = O.hold_for(row["person_id"], ctx_for(row, **kw), kw.pop("kind", "text") if "kind" in kw else "text")
        return h["rule"] if h else None

    def test_nothing_in_the_way_means_no_hold(self):
        self.assertIsNone(O.hold_for("1", ctx_for(person("1"))))

    def test_mid_deal_a_linked_live_deal_gets_no_template(self):
        p = person("1")
        h = O.hold_for("1", ctx_for(p, deals=[{"person_id": "1", "address": "12 Example Oak St", "stage": "under_contract"}]))
        self.assertEqual((h["rule"], "12 Example Oak St" in h["why"]), ("mid_deal", True))
        self.assertIsNone(O.hold_for("1", ctx_for(p, deals=[{"person_id": "1", "address": "12 Example Oak St", "stage": "closed"}])))
        ties = [{"key": "9 fig", "deal": "9 Example Fig Way", "stage": "contract", "expired_offer": False, "people": [{"person_id": "1"}]}]
        self.assertEqual(O.hold_for("1", ctx_for(p, ties=ties))["rule"], "mid_deal")  # the Deals sheet row tied to them, the stage a deal sets
        ties[0].update(stage="offer", expired_offer=True)
        self.assertIsNone(O.hold_for("1", ctx_for(p, ties=ties)))                      # an offer past its deadline is not a live deal
        self.assertEqual(self.rule(person("1", stage="under contract")), "mid_deal")

    def test_deal_words_with_no_deal_linked_are_a_possible_live_deal(self):
        self.assertEqual(self.rule(person("1", last_messages=[ago(20) + ": did the inspection report come back"])), "possible_deal")
        self.assertIsNone(self.rule(person("1", last_messages=[ago(45) + ": did the inspection report come back"])))  # older than 30 days
        self.assertEqual(self.rule(person("1", reasons=["Deal talk in their texts this month"])), "possible_deal")
        agent = person("1", type="agent", _partner=True, last_messages=[ago(3) + ": appraisal is in"], days_quiet=70, last_outbound=ago(70))
        self.assertIsNone(self.rule(agent))  # a partner talks about deals all day: that is not their own deal

    def test_awaiting_a_reply_gets_an_answer_not_a_check_in(self):
        self.assertEqual(self.rule(person("1", owes_reply=True)), "reply_owed")

    def test_a_soft_no_holds_for_90_days_with_the_line_and_date(self):
        for words in ("not right now", "we're staying put for now, thanks", "we already have an agent", "we went with someone else", "Not interested", "gonna hold off"):
            h = O.hold_for("1", ctx_for(person("1", last_messages=[ago(20) + ": " + words])))
            self.assertEqual((h["rule"], h["until"], words in h["why"], ago(20) in h["why"]), ("soft_no", ago(20 - 90), True, True), words)
        self.assertIsNone(self.rule(person("1", days_quiet=95, last_inbound=ago(95), last_outbound=ago(96), last_messages=[ago(95) + ": not right now"])))
        self.assertIsNone(self.rule(person("1", last_messages=[ago(20) + ": we might sell next year"])))
        self.assertEqual(self.rule(person("1", last_messages=["no date on this one: not right now"])), "soft_no")  # no date: held, not guessed

    def test_two_unanswered_in_a_row_hold_until_they_write_or_90_days(self):
        p = person("1", last_inbound=ago(60), last_outbound=ago(15), days_quiet=15)
        h = O.hold_for("1", ctx_for(p, send_log=[sent("1", 30), sent("1", 15)]))
        self.assertEqual((h["rule"], h["why"].startswith("No answer to your last 2"), h["until"]), ("no_answer", True, ago(15 - 90)))
        wrote = {**p, "last_inbound": ago(10), "days_quiet": 10}
        self.assertIsNone(O.hold_for("1", ctx_for(wrote, send_log=[sent("1", 30), sent("1", 15)])))    # they wrote: the hold is over
        old = {**p, "last_outbound": ago(100), "days_quiet": 100, "last_inbound": ago(200)}
        self.assertIsNone(O.hold_for("1", ctx_for(old, send_log=[sent("1", 130), sent("1", 100)])))    # 90 days passed
        self.assertEqual(self.rule(person("1", reasons=["No answer to your last 4 texts in 90 days"])), "no_answer")
        self.assertIsNone(O.hold_for("1", ctx_for(p, send_log=[{**sent("1", 30), "status": "dry-run"}, {**sent("1", 15), "status": "dry-run"}])))

    def test_one_unanswered_waits_the_full_cadence(self):
        p = person("1", band="lukewarm", last_inbound=ago(60), last_outbound=ago(20), days_quiet=20)
        h = O.hold_for("1", ctx_for(p, send_log=[sent("1", 20)]))
        self.assertEqual((h["rule"], h["until"]), ("no_answer_1", ago(20 - 30)))
        self.assertIsNone(O.hold_for("1", ctx_for({**p, "last_outbound": ago(31), "days_quiet": 31}, send_log=[sent("1", 31)])))

    def test_nothing_within_7_days_of_his_last_outbound_unless_they_wrote_back(self):
        h = O.hold_for("1", ctx_for(person("1", last_outbound=ago(3), days_quiet=3)))
        self.assertEqual((h["rule"], h["until"]), ("too_soon", ago(3 - 7)))
        self.assertIsNone(self.rule(person("1", last_outbound=ago(3), last_inbound=ago(2), days_quiet=2)))   # they wrote back
        self.assertEqual(self.rule(person("1", last_outbound=ago(40), last_inbound=ago(50), days_quiet=4)), "too_soon")  # a logged touch 4 days ago
        self.assertIsNone(self.rule(person("1", last_outbound=ago(7), days_quiet=7)))
        self.assertIsNone(self.rule(person("1", last_outbound="", last_inbound="", days_quiet=None)))        # never touched is not too soon
        self.assertEqual(self.rule(person("1", last_outbound="sometime in the fall")), "unreadable")         # a date that cannot be read fails closed
        call = {"at": ago(2) + "T11:00:00-06:00", "job_type": "call", "status": "posted", "person_id": "1", "result": {"status": "completed"}}
        self.assertEqual(O.hold_for("1", ctx_for(person("1"), bridge_log=[call]))["rule"], "too_soon")       # a call is an outbound too

    def test_just_closed_gets_no_nurture_text(self):
        ties = [{"key": "5 ash", "deal": "5 Example Ash Ct", "stage": "closed", "act": ago(20), "side": "Buyer", "people": [{"person_id": "1"}]}]
        h = O.hold_for("1", ctx_for(person("1", stage="past client"), ties=ties))
        self.assertEqual((h["rule"], h["until"], "check-ins list" in h["why"]), ("just_closed", ago(20 - 45), True))
        ties[0]["act"] = ago(60)
        self.assertIsNone(O.hold_for("1", ctx_for(person("1", stage="past client"), ties=ties)))

    def test_the_gates(self):
        self.assertEqual(self.rule(person("1", last_messages=[ago(5) + ": please take me off your list"])), "opt_out")
        self.assertEqual(self.rule(person("1", last_messages=[ago(5) + ": STOP"])), "opt_out")
        self.assertIsNone(self.rule(person("1", last_messages=[ago(30) + ": we can stop by saturday"], last_inbound=ago(30))))
        self.assertEqual(O.hold_for("1", ctx_for(person("1"), no_text=["1"]), "text")["rule"], "no_text_consent")
        self.assertIsNone(O.hold_for("1", ctx_for(person("1"), no_text=["1"]), "email"))
        self.assertEqual(self.rule(person("1"), review=[{"person_id": "1", "rule": "pro_as_client"}]), "pro_as_client")
        self.assertEqual(O.hold_for("77", ctx_for(person("1")))["rule"], "unknown")  # not in the feed at all: nothing is drafted

    def test_a_call_today_counts_as_reached_and_a_dry_run_does_not(self):
        day = T.isoformat()
        calls = [{"at": day + "T09:00:00-06:00", "job_type": "call", "status": "posted", "person_id": "1", "result": {"status": "completed"}},
                 {"at": day + "T09:05:00-06:00", "job_type": "call", "status": "dry-run", "person_id": "2", "result": None},
                 {"at": day + "T09:10:00-06:00", "job_type": "call", "status": "posted", "person_id": "3", "result": None},           # posted, no call yet
                 {"at": day + "T09:15:00-06:00", "job_type": "hard_draft", "status": "posted", "person_id": "4", "result": {"status": "completed"}},
                 {"at": ago(1) + "T09:00:00-06:00", "job_type": "call", "status": "posted", "person_id": "5", "result": {"status": "completed"}}]
        log = [sent("6", 0), {**sent("7", 0), "status": "dry-run"}]
        self.assertEqual(O.reached_today(log, calls, day), {"1", "6"})
        self.assertEqual(O.hold_for("1", ctx_for(person("1"), bridge_log=calls))["rule"], "reached_today")

    def test_a_fresh_reason_pulls_cold_people_ahead_once_in_30_days(self):
        cold = person("1", band="cold", days_quiet=40, last_outbound=ago(40))
        self.assertTrue(O.pull_ahead_ok("1", ctx_for(cold)))
        self.assertFalse(O.pull_ahead_ok("1", ctx_for({**cold, "days_quiet": 12, "last_outbound": ago(12)})))
        self.assertTrue(O.pull_ahead_ok("1", ctx_for(person("1", band="warm", days_quiet=9, last_outbound=ago(9)))))


class Reasons(unittest.TestCase):
    def test_their_own_words_are_a_reason_with_a_date_and_no_message_text(self):
        p = person("1", name="Mia Example", last_messages=[ago(45) + ": Example text: we might sell next year, call 225-555-0101"])
        ctx = ctx_for(p, heat={"warm": [{"person_id": "1", "reasons": ["Talked about selling 45 days ago", "You marked them warm"]}]})
        r = O.reason_for("1", ctx)
        self.assertEqual(r, {"type": "own_words", "line": "They brought up selling in a text to you.", "date": ago(45), "mention": True})
        self.assertNotIn("next year", json.dumps(r))

    def test_no_reason_on_file_is_none_and_scores_are_never_a_reason(self):
        ctx = ctx_for(person("1"), heat={"hot": [{"person_id": "1", "reasons": ["You marked them hot", "Texting both ways, 9 from them in 30 days", "Talked about moving 3 days ago",
                                                                               "Talked about selling 120 days ago"]}]})
        self.assertIsNone(O.reason_for("1", ctx))
        self.assertIsNone(O.annotate({"person_id": "1", "name": "Taylor Sample", "text": "Hey Taylor, how y'all been?"}, ctx)["reason"])

    def test_a_home_anniversary_is_a_reason(self):
        ctx = O.context({"touches_due": [person("1")]}, T, checkins=[{"person_id": "1", "kind": "home anniversary, 2 years", "due": ago(-8), "days": 8},
                                                                    {"person_id": "1", "kind": "6 months after closing", "due": ago(-2), "days": 2}])
        self.assertEqual(O.reason_for("1", ctx), {"type": "home_anniversary", "line": f"Their home anniversary, 2 years, is on {ago(-8)}.", "date": ago(-8), "mention": True})

    def test_register_is_friendly_until_his_own_texts_show_familiar(self):
        p = person("1", name="Reginald Example", last_outbound=ago(10), days_quiet=10)
        self.assertEqual(O.register_for("1", ctx_for(p), "Reginald"), ("friendly", ""))
        template = [sent("1", 60, "Hey Reginald, how y'all been?"), sent("1", 40, "Hey Reginald, how y'all been?")]  # templates sent as they were prove nothing
        self.assertEqual(O.register_for("1", ctx_for(p, send_log=template), "Reginald"), ("friendly", ""))
        mine = [sent("1", 60, "x", sent_text="Reggie!! How yall been"), sent("1", 40, "x", sent_text="Reggie my man, yall around saturday? haha")]
        self.assertEqual(O.register_for("1", ctx_for(p, send_log=mine), "Reginald"), ("familiar", "Reggie"))
        once = [sent("1", 60, "x", sent_text="Reggie!! How yall been")]
        self.assertEqual(O.register_for("1", ctx_for(p, send_log=once), "Reginald"), ("friendly", ""))               # once is not a habit, and a nickname is never guessed

    def test_openers_are_four_words_without_the_name(self):
        self.assertEqual(O.opener("Hey Taylor, a couple new ones popped up", "Taylor"), "hey a couple new")
        self.assertEqual(O.opener("Hey Jordan, a couple new ones popped up", "Jordan"), O.opener("Hey Taylor, a couple new ones popped up", "Taylor"))
        ctx = ctx_for(person("1"), send_log=[sent("1", 200, "Oldest one here friend"), sent("1", 90, "Hey Taylor, how y'all been?"), sent("1", 60, "Taylor! Thought of you today."),
                                             sent("1", 30, "Hey Taylor, 2 new ones popped up")])
        self.assertEqual(O.recent_openers("1", ctx, "Taylor"), ["hey how y'all been", "thought of you today"])       # the last three, nothing with a digit


class Screen(unittest.TestCase):
    def test_held_people_leave_both_queues_and_one_card_per_person(self):
        a, b, c, d = person("1", name="Avery Example"), person("2", name="Blake Example", stage="under contract"), person("3", name="Casey Example", owes_reply=True), person("4", name="Drew Example")
        tq = {"reply_first": [], "drafts": [{"person_id": p["person_id"], "name": p["display"], "phone": p["phone"], "pool": "sphere", "text": f"Hey {p['display'].split()[0]}, how y'all been?"} for p in (a, b, c, d)]}
        eq = {"drafts": [{"person_id": "4", "name": "Drew Example", "email": "drew.example@example.com", "pool": "sphere", "subject": "Hi", "body": "Hi Drew, checking in."}]}
        t2, e2, held = O.screen(tq, eq, ctx_for(a, b, c, d))
        self.assertEqual([x["person_id"] for x in t2["drafts"]], ["1", "4"])
        self.assertEqual(e2["drafts"], [])                                                     # one card per person per day, across text and email
        self.assertEqual({h["person_id"]: h["rule"] for h in held}, {"2": "mid_deal", "3": "reply_owed", "4": "one_card"})
        self.assertEqual([r["person_id"] for r in t2["reply_first"]], ["3"])                   # they wrote: an answer, never a check-in
        self.assertEqual((t2["drafts"][0]["reason"], t2["drafts"][0]["register"], t2["drafts"][0]["avoid_openers"]), (None, "friendly", []))
        self.assertEqual(len(tq["drafts"]), 4)                                                 # the queue file's own rows are not changed

    def test_the_queue_builder_gives_held_people_no_template_and_no_cap_slot(self):
        import followups
        t = followups.load_templates()
        rows = [person("1", name="Avery Example"), person("2", name="Blake Example", last_messages=[ago(20) + ": we're staying put for now"]),
                person("3", name="Casey Example", stage="under contract"), person("4", name="Drew Example", last_outbound=ago(3), days_quiet=3),
                person("5", name="Emery Example", owes_reply=True, last_messages=[ago(1) + ": are yall free saturday"]), person("6", name="Finley Example")]
        r = followups.build_feed_queue({"touches_due": rows, "deals": [{"person_id": "6", "address": "40 Example Pine Rd", "stage": "active"}]}, t, T, max_texts=1)
        self.assertEqual([q["name"] for q in r["texts"]], ["Avery Example"])
        self.assertEqual({h["name"]: h["rule"] for h in r["held"]}, {"Blake Example": "soft_no", "Casey Example": "mid_deal", "Drew Example": "too_soon", "Finley Example": "mid_deal"})
        self.assertEqual(([x["name"] for x in r["reply_first"]], r["deferred"]), (["Emery Example"], 0))
        self.assertFalse(any("under-contract" == q["stage"] for q in r["texts"] + r["queue"]))  # the mid-deal template pool is never drawn from
        two = followups.build_feed_queue({"touches_due": rows[:1]}, t, T, send_log=[sent("1", 23), sent("1", 21)])  # both after their last text
        self.assertEqual((two["texts"], two["held"][0]["rule"]), ([], "no_answer"))


class InPipeline(unittest.TestCase):
    """Through app.State with made-up queue files: a stale queue cannot show a canned check-in, and a call counts."""
    def setUp(self):
        import app
        self.app, self.tmp = app, tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        day = app.today()
        back = lambda n: (day - timedelta(days=n)).isoformat()
        people = [person("1", name="Avery Example", last_inbound=back(25), last_outbound=back(20)),
                  person("2", name="Blake Example", last_inbound=back(25), last_outbound=back(20)),
                  person("3", name="Casey Example", last_inbound=back(20), last_outbound=back(22), last_messages=[back(20) + ": not right now, maybe later"])]
        feed = {"generated_at": day.isoformat() + "T08:00:00-06:00", "as_of": day.isoformat(), "header_ok": True, "touches_due": people, "people": people,
                "deals": [{"person_id": "2", "address": "40 Example Pine Rd", "stage": "under_contract", "side": "buyer"}], "new_leads": [], "partners": []}
        tq = {"as_of": day.isoformat(), "reply_first": [], "drafts": [{"person_id": p["person_id"], "name": p["display"], "phone": p["phone"], "pool": "sphere", "template": 1,
                                                                      "text": f"Hey {p['display'].split()[0]}, how y'all been?", "days_quiet": 20} for p in people]}
        for name, data in (("feed", feed), ("text_queue", tq), ("email_queue", {"drafts": []})):
            (d / f"{name}.json").write_text(json.dumps(data))
        paths = {**app.DEMO_PATHS, "feed": d / "feed.json", "text_queue": d / "text_queue.json", "email_queue": d / "email_queue.json"}
        self.state, self.dir, self.day = app.State(demo=True, paths=paths, send_log=d / "send-log.json"), d, day

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_stale_queue_file_shows_no_draft_for_held_people(self):
        snap = self.state.snapshot()
        self.assertEqual([x["name"] for x in snap["text_queue"]["drafts"]], ["Avery Example"])
        held = {h["name"]: h["rule"] for h in snap["text_queue"]["held"]}
        self.assertEqual(held, {"Blake Example": "mid_deal", "Casey Example": "soft_no"})
        self.assertEqual((snap["text_queue"]["drafts"][0]["register"], snap["text_queue"]["drafts"][0]["reason"]), ("friendly", None))

    def test_held_people_are_never_sent_to_the_drafter(self):
        import drafter_test
        c = drafter_test.FakeClaude()
        self.assertEqual(self.state.draft_pass(client=c)["written"], 1)
        asked = json.loads(c.calls[0]["messages"][0]["content"])["items"]
        self.assertEqual([i["first_name"] for i in asked], ["Avery"])
        self.assertEqual({"reason", "register", "avoid_openers"} <= set(asked[0]), True)

    def test_a_call_today_counts_as_already_reached(self):
        before = self.state.insight()["call10"]["left_out"].get("already reached today", 0)
        call = {"at": self.day.isoformat() + "T09:00:00-06:00", "job_id": "j1", "job_type": "call", "status": "posted", "person_id": "1", "display": "Avery Example",
                "result": {"status": "completed", "outcome": "talked", "summary": ""}, "touched": True}
        dry = {**call, "job_id": "j2", "status": "dry-run", "person_id": "3", "result": None}
        (self.dir / "bridge-log.json").write_text(json.dumps([call, dry]))
        after = self.state.insight()["call10"]
        self.assertEqual(after["left_out"].get("already reached today", 0), before + 1)
        self.assertNotIn("1", [r["person_id"] for r in after["rows"]])
        self.assertEqual({h["name"]: h["rule"] for h in self.state.snapshot()["text_queue"]["held"]}["Avery Example"], "reached_today")


if __name__ == "__main__":
    unittest.main()
