#!/usr/bin/env python3
"""
Speed to lead responder for Luxury Presence website inquiries.

Watches aire@calebjackson.org for "New Lead" emails from noreply@luxurypresence.com,
fills Caleb's templates, and (when DRY_RUN is off) sends an email from aire@ and a
text from Caleb's own number through the Messages app on his Mac.

Safe by default:
  - DRY_RUN=true unless the environment says otherwise. Dry runs write to dry-run.log and send nothing.
  - One reply per email address, ever (processed.json).
  - Quiet hours (8 pm to 8 am Central): morning email variant, text held until 8 am.
  - Test addresses in templates.md are never contacted.

Usage:
  python3 responder.py --once            # process new leads once (dry run unless DRY_RUN=false)
  python3 responder.py --loop            # poll every 60 seconds
  python3 responder.py --replay FILE     # parse a saved email body and show what would be sent
  python3 responder.py --test            # run the built-in checks against tests/fixtures

Gmail: first run opens a Google sign-in in the browser and stores token.json next to this file.
Needs credentials.json (OAuth desktop client) from Google Cloud. Scopes: gmail.modify, gmail.send.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates.md"
PROCESSED = HERE / "processed.json"
LOG = HERE / "log.csv"
DRY_LOG = HERE / "dry-run.log"
ERRORS = HERE / "errors.log"
QUEUE = HERE / "text-queue.json"
TOKEN = HERE / "token.json"
CREDS = HERE / "credentials.json"

CENTRAL = ZoneInfo("America/Chicago")
FROM_ADDRESS = "aire@calebjackson.org"
LEAD_SENDER = "noreply@luxurypresence.com"
LEAD_SUBJECT_PREFIX = "New Lead"
QUIET_START, QUIET_END = 20, 8  # 8 pm to 8 am Central
SMS_MAX = 160

DRY_RUN = os.getenv("DRY_RUN", "true").strip().lower() not in ("false", "0", "no")


# ---------------------------------------------------------------- templates


def load_templates() -> dict:
    """Read templates.md. Sections are '## ' headings. Returns dict of name -> body."""
    text = TEMPLATES.read_text(encoding="utf-8")
    sections: dict[str, str] = {}
    current = None
    buf: list[str] = []
    for line in text.splitlines():
        if line.startswith("## "):
            if current:
                sections[current] = "\n".join(buf).strip()
            current = line[3:].strip()
            buf = []
        elif current:
            buf.append(line)
    if current:
        sections[current] = "\n".join(buf).strip()

    def pick(prefix: str) -> str:
        for k, v in sections.items():
            if k.lower().startswith(prefix.lower()):
                return v
        raise KeyError(f"templates.md has no section starting with '{prefix}'")

    tests = [l.strip().lower() for l in pick("Test addresses").splitlines() if "@" in l]
    return {
        "email_day": pick("Email, daytime"),
        "email_night": pick("Email, after hours"),
        "sms": pick("Text"),
        "test_addresses": tests,
    }


def split_subject(body: str) -> tuple[str, str]:
    """Templates start with 'Subject: ...' then a blank line then the body."""
    lines = body.splitlines()
    if lines and lines[0].lower().startswith("subject:"):
        return lines[0].split(":", 1)[1].strip(), "\n".join(lines[1:]).strip()
    return "", body.strip()


def request_phrase(lead_type: str, address: str | None) -> str:
    t = (lead_type or "").lower()
    if "valuation" in t or "value" in t:
        return "home value request"
    if address:
        return f"question about {address}"
    return "note"


def fill(template: str, lead: dict) -> str:
    out = template.replace("{{firstName}}", lead["first_name"])
    out = out.replace("{{requestPhrase}}", request_phrase(lead.get("type", ""), lead.get("address")))
    return out


# ------------------------------------------------------------------ parsing

PHONE_RE = re.compile(r"\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def parse_lead(subject: str, body: str, received_at: datetime) -> dict | None:
    """Parse a Luxury Presence 'New Lead' email body (plain text) into a lead dict.

    Format observed Oct 2026:
      You've received a new lead
      calebjackson.org ( tracking link )
      FL                       <- initials
      Frances LeBlanc          <- full name
      leblancf449@gmail.com    <- email
      Overview / Type / Home Valuation / Source / ... / Message / ... / Time Frame / ...
      Contact Information / Email address / ... / Phone number / (225) 287-2822 ( tel:... )
    """
    if not subject.lstrip("⭐️ ").startswith(LEAD_SUBJECT_PREFIX):
        return None
    name = subject.split("-", 1)[1].strip() if "-" in subject else ""

    # drop the Luxury Presence footer so its street address is never mistaken for the lead's
    body = body.split("Luxury Presence, Inc.", 1)[0]
    lines = [l.strip() for l in body.splitlines()]
    text = "\n".join(lines)

    # type: the line after "Type"
    lead_type = ""
    for i, l in enumerate(lines):
        if l == "Type" and i + 1 < len(lines):
            lead_type = lines[i + 1]
            break

    # email: first address that is not ours and not a tracking host
    email = ""
    for m in EMAIL_RE.finditer(text):
        cand = m.group(0).lower()
        if cand != FROM_ADDRESS and "luxurypresence" not in cand:
            email = cand
            break

    # phone: first phone-shaped token after "Phone number"
    phone = ""
    idx = text.find("Phone number")
    if idx >= 0:
        m = PHONE_RE.search(text, idx)
        if m:
            phone = re.sub(r"\D", "", m.group(0))

    # message and address (both usually empty on LP forms)
    message = ""
    for i, l in enumerate(lines):
        if l == "Message" and i + 1 < len(lines) and lines[i + 1] not in ("", "Time Frame"):
            message = lines[i + 1]
            break
    address = None
    m = re.search(r"\d{3,6} [A-Z][A-Za-z0-9 .]+(?:St|Ave|Rd|Dr|Ln|Ct|Blvd|Hwy|Way|Cir|Pl)\b", text)
    if m:
        address = m.group(0).strip()

    if not name or not email:
        return None
    first = name.split()[0].strip().title()
    return {
        "name": name,
        "first_name": first,
        "email": email,
        "phone": phone,
        "type": lead_type,
        "message": message,
        "address": address,
        "received_at": received_at.astimezone(timezone.utc).isoformat(),
    }


# ------------------------------------------------------------------- state


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2))


def is_quiet(now_central: datetime) -> bool:
    h = now_central.hour
    return h >= QUIET_START or h < QUIET_END


def build_messages(lead: dict, templates: dict, now_central: datetime) -> dict:
    quiet = is_quiet(now_central)
    subject, body = split_subject(fill(templates["email_night" if quiet else "email_day"], lead))
    sms = fill(templates["sms"], lead).strip()
    if len(sms) > SMS_MAX:
        raise ValueError(f"SMS is {len(sms)} characters, over {SMS_MAX}")
    return {
        "quiet_hours": quiet,
        "email_subject": subject,
        "email_body": body,
        "sms": sms,
        "sms_when": "queued for 8:00 am Central" if quiet else "now",
    }


# ------------------------------------------------------------------- gmail


def gmail_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    scopes = ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"]
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), scopes)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS.exists():
                sys.exit(f"Missing {CREDS}. Create an OAuth desktop client in Google Cloud and save it there.")
            creds = InstalledAppFlow.from_client_secrets_file(str(CREDS), scopes).run_local_server(port=0)
        TOKEN.write_text(creds.to_json())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def fetch_new_leads(svc) -> list[dict]:
    q = f'from:{LEAD_SENDER} subject:"{LEAD_SUBJECT_PREFIX}" is:unread newer_than:2d'
    res = svc.users().messages().list(userId="me", q=q, maxResults=20).execute()
    out = []
    for m in res.get("messages", []):
        full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
        headers = {h["name"].lower(): h["value"] for h in full["payload"].get("headers", [])}
        subject = headers.get("subject", "")
        received = datetime.fromtimestamp(int(full["internalDate"]) / 1000, tz=timezone.utc)
        body = _plain_body(full["payload"])
        lead = parse_lead(subject, body, received)
        if lead:
            lead["gmail_id"] = m["id"]
            out.append(lead)
    return out


def _plain_body(payload) -> str:
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", "ignore")
    for part in payload.get("parts", []) or []:
        t = _plain_body(part)
        if t:
            return t
    if payload.get("mimeType") == "text/html" and payload.get("body", {}).get("data"):
        html = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", "ignore")
        return re.sub(r"<[^>]+>", "\n", html)
    return ""


def send_email(svc, to: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["to"] = to
    msg["from"] = FROM_ADDRESS
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    svc.users().messages().send(userId="me", body={"raw": raw}).execute()


def mark_read(svc, gmail_id: str) -> None:
    svc.users().messages().modify(userId="me", id=gmail_id, body={"removeLabelIds": ["UNREAD"]}).execute()


# ---------------------------------------------------------------- messages


def send_text(phone: str, text: str) -> None:
    """Send through the Messages app on the Mac from Caleb's own number."""
    if sys.platform != "darwin":
        raise RuntimeError("Texting runs only on the Mac with Messages signed in")
    script = f'''
    tell application "Messages"
        set targetService to 1st account whose service type = SMS
        try
            set targetService to 1st account whose service type = iMessage
        end try
        set targetBuddy to participant "{phone}" of targetService
        send "{text.replace('"', '\\"')}" to targetBuddy
    end tell
    '''
    subprocess.run(["osascript", "-e", script], check=True, capture_output=True, text=True)


# ------------------------------------------------------------------- core


def process(leads: list[dict], templates: dict, svc=None) -> list[dict]:
    processed = load_json(PROCESSED, {})
    queue = load_json(QUEUE, [])
    results = []
    now_c = datetime.now(CENTRAL)
    for lead in leads:
        key = lead["email"].lower()
        if key in templates["test_addresses"]:
            results.append({"lead": lead, "skipped": "test address"})
            continue
        if key in processed:
            results.append({"lead": lead, "skipped": "already handled"})
            if svc and lead.get("gmail_id"):
                mark_read(svc, lead["gmail_id"])
            continue
        try:
            msgs = build_messages(lead, templates, now_c)
        except Exception as e:  # template problem, never send a broken message
            ERRORS.open("a").write(f"{now_c.isoformat()} {key} build failed: {e}\n")
            results.append({"lead": lead, "error": str(e)})
            continue

        sent_at = datetime.now(timezone.utc)
        seconds = (sent_at - datetime.fromisoformat(lead["received_at"])).total_seconds()
        record = {"lead": lead, "messages": msgs, "dry_run": DRY_RUN, "seconds_to_reply": round(seconds)}

        if DRY_RUN:
            DRY_LOG.open("a").write(json.dumps(record, indent=2) + "\n")
        else:
            try:
                send_email(svc, lead["email"], msgs["email_subject"], msgs["email_body"])
                if lead["phone"] and not msgs["quiet_hours"]:
                    send_text(lead["phone"], msgs["sms"])
                elif lead["phone"]:
                    queue.append({"phone": lead["phone"], "sms": msgs["sms"], "after": "08:00"})
                if lead.get("gmail_id"):
                    mark_read(svc, lead["gmail_id"])
            except Exception as e:
                ERRORS.open("a").write(f"{sent_at.isoformat()} {key} send failed: {e}\n")
                record["error"] = str(e)
                results.append(record)
                continue
            processed[key] = {"name": lead["name"], "sent_at": sent_at.isoformat()}
            save_json(PROCESSED, processed)
            save_json(QUEUE, queue)
            new = not LOG.exists()
            with LOG.open("a", newline="") as f:
                w = csv.writer(f)
                if new:
                    w.writerow(["email", "name", "received_at", "sent_at", "seconds_to_reply", "channels"])
                w.writerow([key, lead["name"], lead["received_at"], sent_at.isoformat(), round(seconds),
                            "email+sms" if lead["phone"] else "email"])
        results.append(record)
    return results


def flush_text_queue() -> int:
    """Send queued texts once it is 8 am Central or later. Live mode only."""
    if DRY_RUN:
        return 0
    now_c = datetime.now(CENTRAL)
    if is_quiet(now_c):
        return 0
    queue = load_json(QUEUE, [])
    sent = 0
    for item in list(queue):
        try:
            send_text(item["phone"], item["sms"])
            queue.remove(item)
            sent += 1
        except Exception as e:
            ERRORS.open("a").write(f"{now_c.isoformat()} queued text failed: {e}\n")
    save_json(QUEUE, queue)
    return sent


def show(results: list[dict]) -> None:
    for r in results:
        lead = r["lead"]
        print(f"\n=== {lead['name']} <{lead['email']}> {lead.get('phone', '')}  type: {lead.get('type', '')}")
        if "skipped" in r:
            print(f"skipped: {r['skipped']}")
            continue
        if "error" in r:
            print(f"ERROR: {r['error']}")
            continue
        m = r["messages"]
        print(f"[{'DRY RUN' if r['dry_run'] else 'SENT'}] {r['seconds_to_reply']} s after inquiry"
              f"{' (quiet hours)' if m['quiet_hours'] else ''}")
        print(f"\nEMAIL  subject: {m['email_subject']}\n{m['email_body']}")
        print(f"\nTEXT ({len(m['sms'])} chars, {m['sms_when']}):\n{m['sms']}")


# ------------------------------------------------------------------- tests


def run_tests() -> int:
    templates = load_templates()
    fixtures = sorted((HERE / "tests" / "fixtures").glob("*.txt"))
    assert fixtures, "no fixtures in tests/fixtures"
    failures = 0
    for fx in fixtures:
        raw = fx.read_text(encoding="utf-8")
        subject, _, body = raw.partition("\n")
        subject = subject.replace("Subject:", "").strip()
        lead = parse_lead(subject, body, datetime(2026, 10, 12, 20, 58, 30, tzinfo=timezone.utc))
        ok = bool(lead and lead["email"] and lead["first_name"] and lead["phone"] and lead["type"])
        print(f"{'PASS' if ok else 'FAIL'} parse {fx.name}: {lead}")
        failures += 0 if ok else 1
        if lead:
            for hour in (14, 23):
                now_c = datetime(2026, 10, 12, hour, 0, tzinfo=CENTRAL)
                m = build_messages(lead, templates, now_c)
                checks = [
                    "{{" not in m["email_body"] and "{{" not in m["sms"],
                    "Keller Williams First Choice" in m["email_body"],
                    "KW First Choice" in m["sms"],
                    len(m["sms"]) <= SMS_MAX,
                    ("first thing in the morning" in m["email_body"]) == m["quiet_hours"],
                    "—" not in m["email_body"] and ";" not in m["email_body"],
                ]
                ok = all(checks)
                print(f"{'PASS' if ok else 'FAIL'} messages at {hour}:00 Central: {checks}")
                failures += 0 if ok else 1
    # test addresses are never contacted
    fake = {"name": "Caleb Test", "first_name": "Caleb", "email": templates["test_addresses"][0],
            "phone": "2255550100", "type": "Home Valuation", "received_at": datetime.now(timezone.utc).isoformat()}
    res = process([fake], templates)
    ok = res and res[0].get("skipped") == "test address"
    print(f"{'PASS' if ok else 'FAIL'} test address skipped")
    failures += 0 if ok else 1
    print(f"\n{'ALL PASS' if failures == 0 else str(failures) + ' FAILURES'}  (DRY_RUN={DRY_RUN})")
    return failures


# -------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="process new leads once")
    ap.add_argument("--loop", action="store_true", help="poll every 60 seconds")
    ap.add_argument("--replay", metavar="FILE", help="parse a saved email (Subject: line first) and show messages")
    ap.add_argument("--test", action="store_true", help="run built-in checks")
    args = ap.parse_args()

    templates = load_templates()
    print(f"DRY_RUN={'on' if DRY_RUN else 'OFF, sending for real'}")

    if args.test:
        sys.exit(run_tests())
    if args.replay:
        raw = Path(args.replay).read_text(encoding="utf-8")
        subject, _, body = raw.partition("\n")
        lead = parse_lead(subject.replace("Subject:", "").strip(), body, datetime.now(timezone.utc))
        if not lead:
            sys.exit("could not parse that file as a New Lead email")
        show(process([lead], templates))
        return
    if not (args.once or args.loop):
        ap.print_help()
        return

    svc = gmail_service()
    while True:
        try:
            leads = fetch_new_leads(svc)
            if leads:
                show(process(leads, templates, svc))
            n = flush_text_queue()
            if n:
                print(f"sent {n} queued text(s)")
        except Exception as e:
            ERRORS.open("a").write(f"{datetime.now(timezone.utc).isoformat()} loop error: {e}\n")
            print(f"error: {e}")
        if not args.loop:
            break
        time.sleep(60)


if __name__ == "__main__":
    main()
