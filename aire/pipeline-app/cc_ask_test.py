"""Ask Claude checks, with Claude faked. Run: python3 aire/pipeline-app/cc_ask_test.py"""
import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace as NS

import cc
import cc_ask as A

NOW = datetime(2026, 11, 5, 9, 0, tzinfo=cc.CENTRAL)
PAY = {"today": "2026-11-05", "fresh": {"leads": {"source": "Gmail", "at": "2026-11-05T08:50", "state": "ok"}},
       "leads": [{"name": "Pat Example", "phone": "(225) 555-0100", "email": "pat@example.com", "source": "Home value request", "threadId": "x"}],
       "scorecard": {"gci": {"value": 31545.0, "with_pending": 41085.0}, "pending": {"value": 9540.0, "deals": 2}}}


class FakeClient:
    def __init__(self):
        self.calls = []
        self.beta = NS(messages=NS(create=self.create))
        self.messages = NS(create=self.create)

    def create(self, **kw):
        self.calls.append(kw)
        return NS(model="claude-sonnet-5-5", stop_reason="end_turn", content=[NS(type="text", text="You have one new lead.")],
                  usage=NS(input_tokens=4000, output_tokens=300, cache_creation_input_tokens=0, cache_read_input_tokens=0))


class Ask(unittest.TestCase):
    def test_context_never_carries_phones_or_emails(self):
        c = A.page_context(PAY, "ccleads", private=False)
        self.assertNotIn("555-0100", c); self.assertNotIn("pat@example.com", c); self.assertIn("Pat Example", c)
        c = A.page_context(PAY, "ccleads", private=True)
        self.assertNotIn("Pat Example", c)

    def test_private_hides_money(self):
        c = A.page_context(PAY, "scorecard", private=True)
        self.assertNotIn("31545", c); self.assertIn('"value":"hidden"', c)
        self.assertIn("31545", A.page_context(PAY, "scorecard", private=False))

    def test_answer_cost_and_cap(self):
        with tempfile.TemporaryDirectory() as d:
            log, f = Path(d) / "u.json", FakeClient()
            r = A.ask(f, PAY, "ccleads", "Any new leads?", False, log, NOW, cap=0.02)
            self.assertEqual(r["answer"], "You have one new lead.")
            self.assertAlmostEqual(r["cost"], 4000 * 2 / 1e6 + 300 * 10 / 1e6, places=6)  # Sonnet 5.5: $2 in, $10 out per million
            kw = f.calls[0]
            self.assertEqual((kw["model"], kw["output_config"]), ("claude-sonnet-5-5", {"effort": "low"}))
            self.assertEqual(kw["system"][0]["cache_control"], {"type": "ephemeral"})
            A.ask(f, PAY, "ccleads", "Again?", False, log, NOW, cap=0.02)
            with self.assertRaises(ValueError) as e:
                A.ask(f, PAY, "ccleads", "Third?", False, log, NOW, cap=0.02)
            self.assertIn("limit", str(e.exception))
            self.assertEqual(len(f.calls), 2)  # the refused question never reached Claude
            self.assertEqual(A.spent_today(log, NOW.replace(day=6)), 0.0)  # a new day starts at zero

    def test_empty_question(self):
        with self.assertRaises(ValueError):
            A.ask(FakeClient(), PAY, "dash", "  ", False, Path(tempfile.mkdtemp()) / "u.json", NOW)


if __name__ == "__main__":
    unittest.main(verbosity=1)
