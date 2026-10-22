#!/usr/bin/env python3
"""Pipeline's predraft step. Run by aire/crm/refresh_feed.sh after every feed rebuild (every 15 minutes on the Mac).

Reads ../crm/feed.json and writes the two draft files the compose box shows:
  ../follow-up/out/text-queue.json   reply-first people (their last three texts, no template) and text drafts
  ../follow-up/out/email-queue.json  email drafts

The pools, templates and daily ordering live in ../follow-up (pools.py, templates.md, followups.build_feed_queue).
This file only wires them to the feed so there is one drafting library and one sender. Nothing here sends.
Both files are git-ignored. Prints counts only, never a name.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
AIRE = HERE.parent
FEED = AIRE / "crm" / "feed.json"
sys.path.insert(0, str(AIRE / "follow-up"))


def main(argv=None) -> int:
    import argparse
    import followups  # noqa: E402  (the follow-up library, imported from its folder)

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--feed", default=str(FEED), help="another feed, for example fixtures/demo-feed.json")
    a = ap.parse_args(argv)
    feed_path = Path(a.feed)
    if not feed_path.exists():
        print("predraft: no feed.json yet, nothing to draft")
        return 0
    feed = json.loads(feed_path.read_text(encoding="utf-8"))
    if feed.get("header_ok") is False:
        print("predraft: feed says header_ok false, no drafts written")
        return 1
    as_of = date.fromisoformat(feed.get("as_of") or date.today().isoformat())
    result = followups.build_feed_queue(feed, followups.load_templates(), as_of)
    followups.write_text_queue(result, as_of)
    print(f"predraft: {len(result['reply_first'])} reply first, {len(result['texts'])} texts, {len(result['queue'])} emails, "
          f"{result['deferred']} deferred")
    return 0


if __name__ == "__main__":
    sys.exit(main())
