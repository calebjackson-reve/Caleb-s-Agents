#!/usr/bin/env python3
"""
Daily follow-up cadence for Caleb Jackson's contacts.

Reads a KW Command export (contacts.csv), finds everyone who went quiet exactly
1, 2, 3, 7, 14, 21, 28, 56 or 84 days ago (90, 180, 365 for past clients), picks
the next unused soft check-in from the pool for their stage, and writes a morning
queue file for Caleb to approve. Sends only on --approve with DRY_RUN=false.

Usage:
  python3 followups.py --queue [--as-of YYYY-MM-DD] [--contacts FILE]   # write queue-<date>.md
  python3 followups.py --approve queue-<date>.md                          # send what is left in the file
  python3 followups.py --test                                             # built-in checks on tests/fixtures

Gmail (optional): if token.json from the speed-to-lead responder exists next to this
file or in ../speed-to-lead, replies and opt-outs are checked against real history.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates.md"
SENT_LOG = HERE / "sent-log.json"
LOG = HERE / "log.csv"
FLAGS = HERE / "flags.md"
ERRORS = HERE / "errors.log"
TOKEN_CANDIDATES = [HERE / "token.json", HERE.parent / "speed-to-lead" / "token.json"]

CENTRAL = ZoneInfo("America/Chicago")
FROM_ADDRESS = "aire@calebjackson.org"
SIGNOFF = "\n\nThanks,\nCaleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303"
THRESHOLDS = {
    "new-lead": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "seller-presentation": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "under-contract": [1, 2, 3, 7, 14, 21, 28, 56, 84],
    "past-client": [90, 180, 365],
}
SKIP_STAGES = {"closed", "opt-out"}
DRY_RUN = os.getenv("DRY_RUN", "true").strip().lower() not in ("false", "0", "no")


# ---------------------------------------------------------------- templates


def load_templates() -> dict:
    text = TEMPLATES.read_text(encoding="utf-8")
    sections: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None and line.strip():
            sections[current].append(line.rstrip())

    pools: dict[str, list[str]] = {}
    for name, lines in sections.items():
        if name.startswith("Pool: "):
            pool = name[6:].strip()
            pools[pool] = [re.sub(r"^\d+\.\s*", "", l) for l in lines if re.match(r"^\d+\.", l)]

    def phrases(key: str) -> list[str]:
        for name, lines in sections.items():
            if name.lower().startswith(key):
                return [p.strip().lower() for p in " ".join(lines).split("|") if p.strip()]
        return []

    subjects = phrases("subjects")
    optout = phrases("opt-out")
    handoff = phrases("hand-to-caleb")
    tests = []
    for name, lines in sections.items():
        if name.lower().startswith("test addresses"):
            tests = [l.strip().lower() for l in lines if "@" in l]
    return {"pools": pools, "subjects": subjects, "optout": optout, "handoff": handoff, "tests": tests}


# ----------------------------------------------------------------- contacts


def load_contacts(path: Path) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            r = {k.strip().lower(): (v or "").strip() for k, v in r.items() if k}
            if not r.get("email"):
                continue
            r["email"] = r["email"].lower()
            r["stage"] = r.get("stage", "").lower()
            r["first_name"] = (r.get("name", "").split() or [""])[0].title()
            rows.append(r)
    return rows


def days_since(last_touch: str, as_of: date) -> int | None:
    try:
        return (as_of - date.fromisoformat(last_touch[:10])).days
    except Exception:
        return None


# -------------------------------------------------------------------- gmail


def gmail_service_or_none():
    token = next((p for p in TOKEN_CANDIDATES if p.exists()), None)
    if not token:
        return None
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        scopes = ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"]
        creds = Credentials.from_authorized_user_file(str(token), scopes)
        return build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception as e:
        ERRORS.open("a").write(f"{datetime.now(timezone.utc).isoformat()} gmail unavailable: {e}\n")
        return None


def history_check(svc, email: str, last_touch: str) -> dict:
    """Return {'replied': bool, 'quotes': [text snippets from them since last_touch]}."""
    out = {"replied": False, "quotes": []}
    if not svc:
        return out
    try:
        q = f"from:{email} after:{last_touch.replace('-', '/')}"
        res = svc.users().messages().list(userId="me", q=q, maxResults=10).execute()
        for m in res.get("messages", []):
            full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
            out["replied"] = True
            out["quotes"].append(full.get("snippet", ""))
    except Exception as e:
        ERRORS.open("a").write(f"{datetime.now(timezone.utc).isoformat()} history check failed for {email}: {e}\n")
    return out


def send_email(svc, to: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["to"], msg["from"], msg["subject"] = to, FROM_ADDRESS, subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    svc.users().messages().send(userId="me", body={"raw": raw}).execute()


# ------------------------------------------------------------------- engine


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def pick_template(pool: list[str], used: list[int]) -> int | None:
    """Next template index not yet used on this contact, in order. None when exhausted."""
    for i in range(len(pool)):
        if i not in used:
            return i
    return None


def fill(template: str, c: dict) -> str:
    out = template.replace("{{firstName}}", c["first_name"])
    out = out.replace("{{address}}", c.get("address") or "your place")
    return out


def build_queue(contacts: list[dict], t: dict, as_of: date, svc=None) -> dict:
    sent_log = load_json(SENT_LOG, {})
    queue, skipped, flagged = [], [], []
    for c in contacts:
        email = c["email"]
        stage = c["stage"]
        if email in t["tests"]:
            skipped.append((c, "test address"))
            continue
        if stage in SKIP_STAGES or stage not in THRESHOLDS:
            skipped.append((c, f"stage {stage or 'blank'}"))
            continue
        d = days_since(c.get("last_touch", ""), as_of)
        if d is None:
            skipped.append((c, "bad last_touch date"))
            continue
        if d not in THRESHOLDS[stage]:
            skipped.append((c, f"day {d}, not a threshold"))
            continue
        hist = history_check(svc, email, c.get("last_touch", ""))
        joined = " ".join(hist["quotes"]).lower()
        if any(p in joined for p in t["optout"]):
            flagged.append((c, "OPT-OUT", joined[:200]))
            continue
        if any(p in joined for p in t["handoff"]):
            flagged.append((c, "HAND TO CALEB", joined[:200]))
            continue
        if hist["replied"]:
            skipped.append((c, "they replied since last touch"))
            continue
        used = [e["template"] for e in sent_log.get(email, [])]
        idx = pick_template(t["pools"][stage], used)
        if idx is None:
            flagged.append((c, "POOL EXHAUSTED", f"{len(used)} sent"))
            continue
        subject = t["subjects"][len(used) % len(t["subjects"])].replace("{{firstname}}", c["first_name"])
        body = fill(t["pools"][stage][idx], c) + SIGNOFF
        queue.append({"email": email, "name": c["name"], "stage": stage, "day": d, "template": idx,
                      "subject": subject, "body": body})
    return {"queue": queue, "skipped": skipped, "flagged": flagged, "gmail": svc is not None}


def write_queue_file(result: dict, as_of: date) -> Path:
    path = HERE / f"queue-{as_of.isoformat()}.md"
    lines = [f"# Follow-up queue for {as_of.isoformat()}", "",
             f"Gmail history check: {'on' if result['gmail'] else 'OFF, sent-log.json only'}. "
             "Delete any block you do not want sent, then run --approve on this file.", ""]
    for i, q in enumerate(result["queue"], 1):
        lines += [f"## {i}. {q['name']} <{q['email']}>  stage {q['stage']}, day {q['day']}, template {q['template'] + 1}",
                  f"Subject: {q['subject']}", "", q["body"], "", "---", ""]
    if result["flagged"]:
        lines += ["## Flagged for Caleb (nothing sent)", ""]
        for c, why, quote in result["flagged"]:
            lines.append(f"- {c['name']} <{c['email']}>: {why}. {quote}")
        lines.append("")
    lines += ["## Skipped", ""] + [f"- {c['name']}: {why}" for c, why in result["skipped"]]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    if result["flagged"]:
        with FLAGS.open("a") as f:
            for c, why, quote in result["flagged"]:
                f.write(f"{as_of.isoformat()} {c['name']} <{c['email']}> {why}: {quote}\n")
    return path


def parse_queue_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    items = []
    for block in re.split(r"\n---\n", text):
        m = re.search(r"## \d+\. (.+?) <([^>]+)>\s+stage (\S+), day (\d+), template (\d+)\nSubject: ([^\n]*)\n\n(.*)",
                      block.strip(), re.S)
        if m:
            name, email, stage, day, tpl, subject, body = m.groups()
            body = body.split("\n## ")[0].rstrip()
            items.append({"name": name, "email": email.lower(), "stage": stage, "day": int(day),
                          "template": int(tpl) - 1, "subject": subject.strip(), "body": body})
    return items


def approve(path: Path, t: dict) -> None:
    items = parse_queue_file(path)
    if not items:
        print("nothing left in the queue file")
        return
    now_c = datetime.now(CENTRAL)
    if now_c.hour >= 20 or now_c.hour < 8:
        sys.exit("quiet hours (8 pm to 8 am Central). Run again in the morning.")
    svc = None if DRY_RUN else gmail_service_or_none()
    if not DRY_RUN and not svc:
        sys.exit("DRY_RUN is off but Gmail is not connected. Run the speed-to-lead responder once to sign in.")
    sent_log = load_json(SENT_LOG, {})
    new = not LOG.exists()
    sent = 0
    for q in items:
        if q["email"] in t["tests"]:
            continue
        ts = datetime.now(timezone.utc).isoformat()
        if DRY_RUN:
            print(f"[DRY RUN] would send to {q['email']}: {q['subject']}")
        else:
            try:
                send_email(svc, q["email"], q["subject"], q["body"])
            except Exception as e:
                ERRORS.open("a").write(f"{ts} send failed {q['email']}: {e}\n")
                print(f"error sending to {q['email']}: {e}")
                continue
            sent_log.setdefault(q["email"], []).append({"template": q["template"], "stage": q["stage"], "at": ts})
            with LOG.open("a", newline="") as f:
                w = csv.writer(f)
                if new:
                    w.writerow(["email", "name", "stage", "day", "template", "sent_at"])
                    new = False
                w.writerow([q["email"], q["name"], q["stage"], q["day"], q["template"] + 1, ts])
            sent += 1
    if not DRY_RUN:
        SENT_LOG.write_text(json.dumps(sent_log, indent=2))
    print(f"{'dry run complete' if DRY_RUN else f'sent {sent}'}, {len(items)} in file")


# -------------------------------------------------------------------- tests


def run_tests() -> int:
    t = load_templates()
    fails = 0

    def check(ok: bool, label: str) -> None:
        nonlocal fails
        print(f"{'PASS' if ok else 'FAIL'} {label}")
        fails += 0 if ok else 1

    check(set(t["pools"]) == {"new-lead", "seller-presentation", "under-contract", "past-client"}, "four pools loaded")
    check(all(len(v) >= 4 for v in t["pools"].values()), "every pool has templates")
    check(all("—" not in x and ";" not in x for v in t["pools"].values() for x in v), "no em dashes or semicolons")
    check(len(t["subjects"]) == 6 and "stop emailing" in t["optout"] and "price" in t["handoff"], "subjects and phrase lists")

    contacts = load_contacts(HERE / "tests" / "fixtures" / "contacts.csv")
    as_of = date(2026, 10, 16)
    r = build_queue(contacts, t, as_of)
    names = {q["name"]: q for q in r["queue"]}
    check("Jordan Example" in names and names["Jordan Example"]["day"] == 1, "new lead at day 1 queued")
    check("Taylor Sample" in names and names["Taylor Sample"]["day"] == 7, "seller at day 7 queued")
    check("Morgan Demo" in names and names["Morgan Demo"]["day"] == 3, "under contract at day 3 queued")
    check("Casey Past" in names and names["Casey Past"]["day"] == 90, "past client at day 90 queued")
    check("Riley Closed" not in names, "closed stage skipped")
    check("Caleb Test" not in names, "test address skipped")
    check("Avery Quiet" not in names, "day 5 not a threshold, skipped")
    check("412 Royal St" in fill(t["pools"]["seller-presentation"][1], contacts[1]), "address slot filled")
    check(all("{{" not in q["body"] and "Keller Williams First Choice" in q["body"] for q in r["queue"]),
          "slots filled and brokerage on every message")

    # no-repeat rule: simulate two prior sends to Jordan
    SENT_LOG.write_text(json.dumps({"jordan.example@gmail.com": [{"template": 0}, {"template": 1}]}))
    r2 = build_queue(contacts, t, as_of)
    j = next(q for q in r2["queue"] if q["name"] == "Jordan Example")
    check(j["template"] == 2, "picks first unused template (third) after two sends")
    SENT_LOG.unlink()

    path = write_queue_file(r, as_of)
    parsed = parse_queue_file(path)
    check(len(parsed) == len(r["queue"]) and parsed[0]["body"] == r["queue"][0]["body"], "queue file round-trips")
    path.unlink()
    if FLAGS.exists():
        FLAGS.unlink()
    print(f"\n{'ALL PASS' if fails == 0 else str(fails) + ' FAILURES'}  (DRY_RUN={DRY_RUN})")
    return fails


# --------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue", action="store_true")
    ap.add_argument("--approve", metavar="QUEUE_FILE")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--contacts", default=str(HERE / "contacts.csv"))
    ap.add_argument("--as-of", default=None)
    args = ap.parse_args()
    t = load_templates()
    print(f"DRY_RUN={'on' if DRY_RUN else 'OFF, sending for real'}")
    if args.test:
        sys.exit(run_tests())
    if args.queue:
        as_of = date.fromisoformat(args.as_of) if args.as_of else datetime.now(CENTRAL).date()
        contacts = load_contacts(Path(args.contacts))
        r = build_queue(contacts, t, as_of, gmail_service_or_none())
        path = write_queue_file(r, as_of)
        print(f"queued {len(r['queue'])}, flagged {len(r['flagged'])}, skipped {len(r['skipped'])}")
        print(f"review: {path}")
        return
    if args.approve:
        approve(Path(args.approve), t)
        return
    ap.print_help()


if __name__ == "__main__":
    main()
