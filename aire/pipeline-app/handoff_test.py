"""Checks for the hand-off log: a made-up chat.db and a faked Gmail. Nothing is sent and no real file is read.
Run: python3 aire/pipeline-app/handoff_test.py"""
import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

import handoff as H

CLICK = datetime(2026, 11, 9, 14, 0, 0).astimezone()
T0 = CLICK.timestamp()
DRAFT = "Hey Taylor, a couple new ones popped up near what you wanted. Want them?"


def blob(words: str) -> bytes:
    """A stand-in attributedBody, the same layout macOS writes."""
    raw = words.encode()
    size = bytes([len(raw)]) if len(raw) < 0x80 else b"\x81" + len(raw).to_bytes(2, "little")
    return b"\x04\x0bstreamtyped\x81\xe8\x03\x84\x01@\x84\x84\x84\x08NSString\x01\x94\x84\x01+" + size + raw + b"\x86\x84\x02iI"


def make_db(folder: Path, rows) -> Path:
    """rows: (handle, seconds after the click, words, is_from_me, service, words kept in attributedBody)."""
    db = folder / "chat.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT)")
    con.execute("CREATE TABLE message (ROWID INTEGER PRIMARY KEY, guid TEXT, text TEXT, attributedBody BLOB, handle_id INTEGER, date INTEGER, is_from_me INTEGER, service TEXT)")
    handles = {}
    for i, (handle, after, words, mine, service, as_blob) in enumerate(rows):
        hid = handles.setdefault(handle, len(handles) + 1)
        con.execute("INSERT OR IGNORE INTO handle VALUES (?, ?)", (hid, handle))
        con.execute("INSERT INTO message VALUES (?,?,?,?,?,?,?,?)", (i + 1, f"guid-{i}", None if as_blob else words, blob(words) if as_blob else None,
                                                                    hid, int((T0 + after - H.APPLE_EPOCH) * 1e9), mine, service))
    con.commit(); con.close()
    return db


class Call:
    def __init__(self, value): self.value = value
    def execute(self): return self.value


class FakeGmail:
    """users().messages().list/get over made-up sent mail: (id, to, seconds after the click, subject)."""
    def __init__(self, sent): self.sent, self.queries = sent, []
    def users(self): return self
    def messages(self): return self
    def list(self, userId, q, maxResults):
        self.queries.append(q)
        return Call({"messages": [{"id": m[0]} for m in reversed(self.sent) if f"to:{m[1]}" in q]})
    def get(self, userId, id, format, metadataHeaders):
        m = next(x for x in self.sent if x[0] == id)
        return Call({"id": id, "internalDate": str(int((T0 + m[2]) * 1000)), "payload": {"headers": [{"name": "Subject", "value": m[3]}]}})


class Matching(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_number_formats_all_match(self):
        db = make_db(self.dir, [("+12255550101", 40, DRAFT, 1, "iMessage", False)])
        for typed in ("+12255550101", "+1 225-555-0101", "225 555 0101", "(225) 555-0101", "1-225-555-0101"):
            hit = H.find_sent_text(typed, T0, DRAFT, db)
            self.assertIsNotNone(hit, typed)
            self.assertEqual((hit["service"], hit["sent_at"]), ("iMessage", H.iso(T0 + 40)))

    def test_handle_without_plus_one_and_sms(self):
        db = make_db(self.dir, [("2255550101", 30, DRAFT, 1, "SMS", False)])
        self.assertEqual(H.find_sent_text("+12255550101", T0, DRAFT, db)["service"], "SMS")

    def test_edited_slightly_still_matches(self):
        edited = "Hey Taylor, a couple of new ones popped up near what you wanted. Want me to send them?"
        db = make_db(self.dir, [("+12255550101", 50, edited, 1, "iMessage", False)])
        self.assertEqual(H.find_sent_text("+12255550101", T0, DRAFT, db)["sent_text"], edited)
        self.assertTrue(H.same_words("It’s  ready", "it's ready"))
        self.assertTrue(H.same_words(DRAFT, DRAFT + " Talk soon."))

    def test_words_in_attributed_body(self):
        long_words = DRAFT + " " + "And one more thing about the lot behind it. " * 4
        db = make_db(self.dir, [("+12255550101", 20, DRAFT, 1, "iMessage", True), ("+12255550102", 25, long_words, 1, "iMessage", True)])
        self.assertIsNotNone(H.find_sent_text("2255550101", T0, DRAFT, db))
        self.assertEqual(H.find_sent_text("2255550102", T0, long_words, db)["sent_text"], long_words)

    def test_what_does_not_count(self):
        db = make_db(self.dir, [("+12255550101", -300, DRAFT, 1, "iMessage", False),      # sent before the click
                                ("+12255550101", 30, DRAFT, 0, "iMessage", False),        # they sent it, not Caleb
                                ("+12255550199", 30, DRAFT, 1, "iMessage", False),        # another number
                                ("+12255550101", 60, "Running late, call you at 4", 1, "iMessage", False)])  # other words
        self.assertIsNone(H.find_sent_text("+12255550101", T0, DRAFT, db))
        self.assertIsNone(H.find_sent_text("555", T0, DRAFT, db))

    def test_empty_draft_takes_any_reply(self):
        db = make_db(self.dir, [("+12255550101", 60, "Sounds good, see you Friday", 1, "iMessage", False)])
        self.assertEqual(H.find_sent_text("+12255550101", T0, "", db)["sent_text"], "Sounds good, see you Friday")

    def test_read_only_and_no_side_files(self):
        db = make_db(self.dir, [("+12255550101", 40, DRAFT, 1, "iMessage", False)])
        os.chmod(db, 0o444)
        before = (db.stat().st_size, db.stat().st_mtime_ns)
        H.find_sent_text("+12255550101", T0, DRAFT, db); H.probe(db)
        self.assertEqual(before, (db.stat().st_size, db.stat().st_mtime_ns))
        self.assertEqual(sorted(p.name for p in self.dir.iterdir()), ["chat.db"])

    def test_unreadable_history(self):
        with self.assertRaises(H.Unreadable):
            H.find_sent_text("+12255550101", T0, DRAFT, self.dir / "missing.db")
        self.assertFalse(H.probe(self.dir / "missing.db")[0])
        self.assertTrue(H.probe(make_db(self.dir, []))[0])

    def test_email_match(self):
        g = FakeGmail([("m0", "pat@example.com", -900, "Checking in"), ("m1", "pat@example.com", 90, "Re: Checking in"), ("m2", "sam@example.com", 90, "Checking in")])
        hit = H.find_sent_email(g, "pat@example.com", T0, "Checking in")
        self.assertEqual((hit["msg_id"], hit["sent_at"], hit["service"]), ("m1", H.iso(T0 + 90), "Gmail"))
        self.assertTrue(g.queries[0].startswith("in:sent to:pat@example.com after:"))
        self.assertIsNone(H.find_sent_email(g, "pat@example.com", T0, "The Zachary numbers you asked for"))
        self.assertIsNone(H.find_sent_email(FakeGmail([]), "pat@example.com", T0, "Checking in"))


class Log(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.dir = Path(self.tmp.name)
        self.log = []
        self.e, _ = H.open_entry(self.log, CLICK.isoformat(), "text", "118", "Taylor Sample", "+12255550101", DRAFT)

    def tearDown(self):
        self.tmp.cleanup()

    def test_click_is_logged_as_opened(self):
        e = self.e
        self.assertEqual((e["status"], e["channel"], e["text"], e["to"], e["at"], e["via"]), ("opened", "iMessage/SMS", DRAFT, "+12255550101", CLICK.isoformat(), "handoff"))
        m, _ = H.open_entry(self.log, CLICK.isoformat(), "email", "", "Pat Example", "pat@example.com", "Hi Pat", "Checking in")
        self.assertEqual((m["channel"], m["subject"], m["person_id"]), ("email", "Checking in", ""))

    def test_no_double_logging(self):
        again, made = H.open_entry(self.log, (CLICK + timedelta(seconds=40)).isoformat(), "text", "118", "Taylor Sample", "+12255550101", DRAFT + " ")
        self.assertFalse(made); self.assertIs(again, self.e); self.assertEqual(len(self.log), 1)
        _, made = H.open_entry(self.log, (CLICK + timedelta(minutes=20)).isoformat(), "text", "118", "Taylor Sample", "+12255550101", DRAFT)
        self.assertTrue(made)

    def test_one_message_confirms_one_line(self):
        other, _ = H.open_entry(self.log, (CLICK + timedelta(seconds=5)).isoformat(), "text", "118", "Taylor Sample", "+12255550101", "")
        db = make_db(self.dir, [("+12255550101", 40, DRAFT, 1, "iMessage", False)])
        r = H.check(self.log, T0 + 60, db)
        self.assertEqual((r["changed"], r["messages_ok"]), (1, True))
        self.assertEqual((self.e["status"], self.e["confirmed_by"], self.e["sent_at"], self.e["service"]), ("sent", "Messages", H.iso(T0 + 40), "iMessage"))
        self.assertEqual(other["status"], "opened")
        self.assertEqual(H.check(self.log, T0 + 120, db)["changed"], 0)

    def test_no_match_after_15_minutes(self):
        empty = make_db(self.dir, [])
        for minute in range(1, 16):
            self.assertEqual(H.check(self.log, T0 + minute * 60, empty)["changed"], 0)
        os.remove(empty)
        db = make_db(self.dir, [("+12255550101", 17 * 60, DRAFT, 1, "iMessage", False)])
        r = H.check(self.log, T0 + 18 * 60, db)
        self.assertEqual((r["changed"], r["messages_ok"], self.e["status"]), (0, None, "opened"))
        self.assertEqual([p["id"] for p in H.pending(self.log, T0 + 18 * 60)], [self.e["id"]])

    def test_no_full_disk_access_is_reported(self):
        r = H.check(self.log, T0 + 60, self.dir / "missing.db")
        self.assertEqual((r["messages_ok"], r["changed"], self.e["status"]), (False, 0, "opened"))

    def test_email_confirm_and_gmail_down(self):
        m, _ = H.open_entry(self.log, CLICK.isoformat(), "email", "120", "Pat Example", "pat@example.com", "Hi Pat", "Checking in")
        class Down:
            def users(self): raise OSError("offline")
        self.assertEqual(H.check(self.log, T0 + 60, None, Down())["gmail_ok"], False)
        r = H.check(self.log, T0 + 120, None, FakeGmail([("m1", "pat@example.com", 70, "Checking in")]))
        self.assertEqual((r["changed"], m["status"], m["confirmed_by"], m["sent_at"]), (1, "sent", "Gmail", H.iso(T0 + 70)))
        self.assertEqual(self.e["status"], "opened")

    def test_did_that_send(self):
        self.assertEqual(H.pending(self.log, T0 + 60), [])
        self.assertEqual(len(H.pending(self.log, T0 + 121)), 1)
        H.answer(self.log, self.e["id"], True, (CLICK + timedelta(minutes=3)).isoformat())
        self.assertEqual((self.e["status"], self.e["confirmed_by"]), ("sent", "you"))
        self.assertIsNone(H.answer(self.log, self.e["id"], False, CLICK.isoformat()))
        n, _ = H.open_entry(self.log, (CLICK + timedelta(minutes=30)).isoformat(), "text", "118", "Taylor Sample", "+12255550101", "Other")
        H.answer(self.log, n["id"], False, CLICK.isoformat())
        self.assertEqual(len(self.log), 1)


class Touches(unittest.TestCase):
    def feed(self, built="2026-11-09T13:50:00-06:00"):
        row = lambda pid, band, owes=False, inbound="": {"person_id": pid, "band": band, "owes_reply": owes, "last_inbound": inbound}
        return {"generated_at": built, "cadence_days": {"hot": 7, "cold": 90}, "signals": {"owes_reply": 2},
                "counts": {"touches_due": 3, "by_band": {"hot": 2, "cold": 1}},
                "touches_due": [row("118", "hot", True, "2026-11-08"), row("119", "hot", True, "2026-11-09"), row("120", "cold")],
                "people": [{"person_id": "118", "last_touch": "2026-10-01"}, {"person_id": "120", "last_touch": ""}]}

    def sent(self, pid, at):
        return {"via": "handoff", "status": "sent", "person_id": pid, "sent_at": at}

    def test_confirmed_send_is_a_touch(self):
        tq = {"reply_first": [{"person_id": "118"}, {"person_id": "119"}], "drafts": [{"person_id": "120"}]}
        eq = {"drafts": [{"person_id": "120"}, {"person_id": "121"}]}
        src = self.feed()
        f, t, e, gone = H.apply_touches(src, tq, eq, [self.sent("118", "2026-11-09T14:01:00-06:00"), self.sent("120", "2026-11-09T14:02:00-06:00")], "2026-11-09")
        self.assertEqual(gone, {"118", "120"})
        self.assertEqual(([r["person_id"] for r in f["touches_due"]], f["counts"], f["signals"]["owes_reply"]), (["119"], {"touches_due": 1, "by_band": {"hot": 1, "cold": 0}}, 1))
        self.assertEqual(([p["last_touch"] for p in f["people"]], t["reply_first"], t["drafts"], e["drafts"]), (["2026-11-09", "2026-11-09"], [{"person_id": "119"}], [], [{"person_id": "121"}]))
        self.assertEqual(len(src["touches_due"]), 3)

    def test_opened_only_changes_nothing(self):
        src = self.feed()
        self.assertIs(H.apply_touches(src, {}, {}, [{"via": "handoff", "status": "opened", "person_id": "118"}], "2026-11-09")[0], src)

    def test_a_reply_after_the_send_stays(self):
        log = [self.sent("119", "2026-11-09T14:01:00-06:00")]
        self.assertEqual(H.apply_touches(self.feed(), {}, {}, log, "2026-11-09")[3], {"119"})
        self.assertEqual(H.apply_touches(self.feed(built="2026-11-09T14:30:00-06:00"), {}, {}, log, "2026-11-09")[3], set())

    def test_due_again_after_the_cadence(self):
        log = [self.sent("118", "2026-11-01T10:00:00-06:00"), self.sent("120", "2026-11-01T10:00:00-06:00")]
        f = self.feed(); f["touches_due"][0].update(owes_reply=False)
        self.assertEqual(H.apply_touches(f, {}, {}, log, "2026-11-09")[3], {"120"})


if __name__ == "__main__":
    unittest.main()
