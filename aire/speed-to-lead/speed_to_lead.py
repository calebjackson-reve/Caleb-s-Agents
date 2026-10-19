#!/usr/bin/env python3
"""Speed to lead runner for Caleb's Mac. See directive.md and templates.md.

Reads aire@calebjackson.org over IMAP, replies over SMTP, texts through the Messages app.
DRY_RUN is the default and sends nothing. The installer sets LIVE=1 only after Caleb types LIVE.
Secrets come from .env in this folder: GMAIL_USER, GMAIL_APP_PASSWORD. Never printed.
"""
import csv, email, email.utils, imaplib, json, os, re, smtplib, subprocess, sys, time
from datetime import datetime, timezone, timedelta
from email.header import decode_header
from email.mime.text import MIMEText
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV = HERE / ".env"
if ENV.exists():
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

LIVE = os.environ.get("LIVE") == "1" and os.environ.get("DRY_RUN", "0") != "1"
GMAIL_USER = os.environ.get("GMAIL_USER", "aire@calebjackson.org")
SENDER_NAME = "Caleb Jackson"
LEAD_FROM = "noreply@luxurypresence.com"
SUBJECT_PREFIX = "New Lead"
CENTRAL_OFFSET = -5  # CDT. Becomes -6 on Nov 1 2026. Close enough for quiet hours.
QUIET_START, QUIET_END = 20, 8  # 8 pm to 8 am Central
POLL_SECONDS = 60
TEST_ADDRESSES = {"cjjfrancis96@gmail.com", "aire@calebjackson.org"}

PROCESSED = HERE / "processed.json"
LOG = HERE / "log.csv"
ERRORS = HERE / "errors.log"
DRY_LOG = HERE / "dry-run.log"

# Templates. Slots: {{firstName}} {{requestPhrase}} {{when}}. Kept in sync with templates.md.
EMAIL_CALL = (
    "Hey {{firstName}}, just saw your {{requestPhrase}} come through on my site. Happy to pull real comps for you, "
    "not the automated number. I'll give you a call {{when}} to grab the address and a couple of details.\n\n"
    "Caleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303\n\n"
    "If you'd rather not hear from me, reply \"stop\" and I won't write again."
)
EMAIL_SIGNON = (
    "Hey {{firstName}}, saw you signed in on my site. If you're looking around St. Francisville or Baton Rouge, "
    "I'm happy to send you what's new before it shows up on the big portals. Anything in particular you're after?\n\n"
    "Caleb Jackson\nREALTOR, Keller Williams First Choice\n(225) 747-0303\n\n"
    "If you'd rather not hear from me, reply \"stop\" and I won't write again."
)
TEXT_CALL = "Hi {{firstName}}, Caleb Jackson with KW First Choice. Got your {{requestPhrase}}. Calling you in a few min to grab the address. Reply STOP to opt out."

TYPE_MAP = {
    "home valuation": ("home value request", "call"),
    "property value": ("home value request", "call"),
    "contact": ("note", "call"),
    "showing": ("showing request", "call"),
    "google sign on": ("sign in", "signon"),
    "sign on": ("sign in", "signon"),
}


def now_central():
    return datetime.now(timezone.utc) + timedelta(hours=CENTRAL_OFFSET)


def quiet_hours(dt=None):
    h = (dt or now_central()).hour
    return h >= QUIET_START or h < QUIET_END


def parse_lead(body, subject=""):
    """Pull name, email, phone, type out of a Luxury Presence lead email body (plain text)."""
    text = re.sub(r"\(\s*https?://\S+\s*\)", "", body)
    text = re.sub(r"\(\s*tel:[^)]*\)", "", text)
    lines = [l.strip() for l in text.splitlines()]
    lines = [l for l in lines if l]
    name = ""
    m = re.search(r"New Lead\s*-\s*(.+)$", subject)
    if m:
        name = m.group(1).strip()
    emails = re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    emails = [e for e in emails if "luxurypresence" not in e.lower()]
    addr = emails[0].lower() if emails else ""
    if not name and addr:
        i = next((k for k, l in enumerate(lines) if l.lower() == addr), None)
        if i and i >= 1:
            name = lines[i - 1]
    ltype = ""
    for i, l in enumerate(lines):
        if l.lower() == "type" and i + 1 < len(lines):
            ltype = lines[i + 1]
            break
    phone = ""
    for i, l in enumerate(lines):
        if l.lower().startswith("phone number"):
            cand = " ".join(lines[i : i + 2])
            d = re.sub(r"\D", "", cand)
            if len(d) >= 10:
                phone = d[-10:]
            break
    first = name.split()[0].title() if name else ""
    return {"name": name, "first": first, "email": addr, "phone": phone, "type": ltype}


def route(ltype):
    t = (ltype or "").lower()
    for k, v in TYPE_MAP.items():
        if k in t:
            return v
    return ("note", "call")


def fill(tpl, **slots):
    for k, v in slots.items():
        tpl = tpl.replace("{{" + k + "}}", v)
    return tpl


def build_messages(lead, received_central):
    phrase, kind = route(lead["type"])
    quiet = quiet_hours(received_central)
    if kind == "signon":
        em = fill(EMAIL_SIGNON, firstName=lead["first"])
        return {"subject": "re: your sign in on calebjackson.org", "email": em, "text": None}
    when = "first thing in the morning" if quiet else "in the next few minutes"
    em = fill(EMAIL_CALL, firstName=lead["first"], requestPhrase=phrase, when=when)
    tx = None
    if lead["phone"] and not quiet:
        tx = fill(TEXT_CALL, firstName=lead["first"], requestPhrase=phrase)
        assert len(tx) <= 160, "text over 160 chars"
    return {"subject": f"re: {lead['first']}, your {phrase}", "email": em, "text": tx}


def load_processed():
    try:
        return set(json.loads(PROCESSED.read_text()))
    except Exception:
        return set()


def save_processed(s):
    PROCESSED.write_text(json.dumps(sorted(s), indent=1))


def log_row(row):
    new = not LOG.exists()
    with LOG.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["email", "name", "type", "received_at", "sent_at", "seconds_to_reply", "channel", "mode"])
        if new:
            w.writeheader()
        w.writerow(row)


def err(msg):
    with ERRORS.open("a") as f:
        f.write(f"{datetime.now(timezone.utc).isoformat()} {msg}\n")


def send_email(to, subject, body):
    msg = MIMEText(body)
    msg["From"] = f"{SENDER_NAME} <{GMAIL_USER}>"
    msg["To"] = to
    msg["Subject"] = subject
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(GMAIL_USER, os.environ["GMAIL_APP_PASSWORD"])
        s.send_message(msg)


def send_text(phone, body):
    """Messages app on this Mac, signed in with Caleb's iPhone number. iMessage first, SMS if not."""
    safe = body.replace("\\", "\\\\").replace('"', '\\"')
    script = f'''
    tell application "Messages"
      try
        set svc to 1st account whose service type = iMessage
        send "{safe}" to participant "+1{phone}" of svc
      on error
        set svc to 1st account whose service type = SMS
        send "{safe}" to participant "+1{phone}" of svc
      end try
    end tell'''
    subprocess.run(["osascript", "-e", script], check=True, capture_output=True, timeout=30)


def decode(s):
    out = ""
    for part, enc in decode_header(s or ""):
        out += part.decode(enc or "utf-8", "replace") if isinstance(part, bytes) else part
    return out


def plain_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "replace")
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                html = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", "replace")
                return re.sub(r"<[^>]+>", "\n", html)
        return ""
    return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", "replace")


def handle(uid, msg, processed, imap):
    subject = decode(msg.get("Subject"))
    if SUBJECT_PREFIX not in subject:
        return  # the Property Value Request twin and anything else from LP stays unread for Caleb
    lead = parse_lead(plain_body(msg), subject)
    if not lead["email"] or lead["email"] in TEST_ADDRESSES or lead["email"] in processed:
        imap.store(uid, "+FLAGS", "\\Seen")
        return
    received = email.utils.parsedate_to_datetime(msg.get("Date")).astimezone(timezone.utc)
    received_c = received + timedelta(hours=CENTRAL_OFFSET)
    m = build_messages(lead, received_c)
    mode = "LIVE" if LIVE else "DRY_RUN"
    sent_at = datetime.now(timezone.utc)
    channels = []
    try:
        if LIVE:
            send_email(lead["email"], m["subject"], m["email"])
        channels.append("email")
        if m["text"]:
            if LIVE:
                send_text(lead["phone"], m["text"])
            channels.append("text")
    except Exception as e:
        err(f"{lead['email']}: {e}")
        time.sleep(30)
        try:
            if LIVE and "email" not in channels:
                send_email(lead["email"], m["subject"], m["email"])
                channels.append("email")
        except Exception as e2:
            err(f"{lead['email']} retry failed: {e2}")
            return
    if not LIVE:
        with DRY_LOG.open("a") as f:
            f.write(f"\n--- {sent_at.isoformat()} would send to {lead['email']} ({lead['type']})\nSubject: {m['subject']}\n{m['email']}\n")
            if m["text"]:
                f.write(f"TEXT to {lead['phone']}: {m['text']}\n")
        print(f"[DRY_RUN] {lead['name']} <{lead['email']}> type={lead['type']} channels={'+'.join(channels)}")
    processed.add(lead["email"])
    save_processed(processed)
    imap.store(uid, "+FLAGS", "\\Seen")
    log_row({"email": lead["email"], "name": lead["name"], "type": lead["type"], "received_at": received.isoformat(),
             "sent_at": sent_at.isoformat(), "seconds_to_reply": int((sent_at - received).total_seconds()),
             "channel": "+".join(channels), "mode": mode})


def poll_once():
    processed = load_processed()
    imap = imaplib.IMAP4_SSL("imap.gmail.com")
    imap.login(GMAIL_USER, os.environ["GMAIL_APP_PASSWORD"])
    imap.select("INBOX")
    typ, data = imap.search(None, "UNSEEN", "FROM", f'"{LEAD_FROM}"')
    for uid in (data[0].split() if data and data[0] else []):
        typ, raw = imap.fetch(uid, "(RFC822)")
        msg = email.message_from_bytes(raw[0][1])
        handle(uid, msg, processed, imap)
    imap.logout()


def main():
    print(f"speed to lead {'LIVE' if LIVE else 'DRY_RUN'} as {GMAIL_USER}, polling every {POLL_SECONDS}s")
    if "GMAIL_APP_PASSWORD" not in os.environ:
        sys.exit("GMAIL_APP_PASSWORD missing. Put it in aire/speed-to-lead/.env (see install.sh).")
    while True:
        try:
            poll_once()
        except Exception as e:
            err(f"poll: {e}")
        if os.environ.get("ONCE") == "1":
            break
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
