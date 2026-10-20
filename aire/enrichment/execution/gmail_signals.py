#!/usr/bin/env python3
"""Gmail signals per contact email. One job: Gmail read only, emit gmail-signals.json in the same shape as iMessage.

  python3 gmail_signals.py --contacts ../out/contacts.json [--days 365] [--limit 300]

Only contacts with an email get a query (265 of 3,651 on 2026-10-19). Never sends, labels or marks read.
"""
from __future__ import annotations
import argparse
import base64
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from identity import email_key  # noqa: E402
from imessage_signals import KEYWORDS, NAME_HINT  # noqa: E402
from crm_client import TOKEN, SCOPES  # noqa: E402

ME = "aire@calebjackson.org"


def body_of(msg) -> str:
    parts = [msg["payload"]] + msg["payload"].get("parts", [])
    for p in parts:
        if p.get("mimeType", "").startswith("text/plain") and p.get("body", {}).get("data"):
            t = base64.urlsafe_b64decode(p["body"]["data"]).decode("utf-8", "ignore")
            return t.split("\nOn ")[0][:2000]  # drop quoted history
    return msg.get("snippet", "")


def signals_for(svc, email: str, days: int, now: datetime) -> dict:
    s = {"last_inbound": "", "last_outbound": "", "in_30": 0, "in_90": 0, "in_365": 0, "out_90": 0,
         "keyword_hits": {}, "recent_inbound": [], "name_hints": [], "subjects": []}
    res = svc.users().messages().list(userId="me", q=f"(from:{email} OR to:{email}) newer_than:{days}d", maxResults=50).execute()
    for m in res.get("messages", []):
        full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
        h = {x["name"].lower(): x["value"] for x in full["payload"]["headers"]}
        ts = datetime.fromtimestamp(int(full["internalDate"]) / 1000, tz=timezone.utc)
        iso, age = ts.strftime("%Y-%m-%d"), (now - ts).days
        from_me = ME in h.get("from", "").lower()
        if from_me:
            if age <= 90: s["out_90"] += 1
            s["last_outbound"] = max(s["last_outbound"], iso)
            continue
        s["last_inbound"] = max(s["last_inbound"], iso)
        if age <= 30: s["in_30"] += 1
        if age <= 90: s["in_90"] += 1
        if age <= 365: s["in_365"] += 1
        text = (h.get("subject", "") + "\n" + body_of(full)).lower()
        for kw, pat in KEYWORDS.items():
            if re.search(pat, text):
                s["keyword_hits"][kw] = s["keyword_hits"].get(kw, 0) + 1
        s["recent_inbound"].append(f"{iso}: {h.get('subject', '')[:80]} | {full.get('snippet', '')[:120]}")
        s["recent_inbound"] = s["recent_inbound"][-12:]
        if h.get("subject") and h["subject"] not in s["subjects"]:
            s["subjects"].append(h["subject"][:80])
    li, lo = s["last_inbound"], s["last_outbound"]
    s["unanswered_days"] = (now.date() - datetime.strptime(li, "%Y-%m-%d").date()).days if li and li > lo else 0
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--contacts", required=True, help="JSON list of CRM rows (run_enrichment.py --dump-contacts writes it)")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "out" / "gmail-signals.json"))
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--limit", type=int, default=400)
    a = ap.parse_args()
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    svc = build("gmail", "v1", credentials=Credentials.from_authorized_user_file(str(TOKEN), SCOPES), cache_discovery=False)
    people = json.loads(Path(a.contacts).read_text())
    emails = sorted({email_key(p.get("email")) for p in people if email_key(p.get("email"))})[:a.limit]
    now = datetime.now(timezone.utc)
    out = {}
    for i, e in enumerate(emails, 1):
        try:
            s = signals_for(svc, e, a.days, now)
            if s["in_365"] or s["out_90"]:
                out[e] = s
        except Exception as ex:
            print(f"{e}: {ex}", file=sys.stderr)
        if i % 25 == 0:
            print(f"{i}/{len(emails)}")
            time.sleep(1)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(f"{len(emails)} emails queried, {len(out)} with history -> {a.out}")


if __name__ == "__main__":
    main()
