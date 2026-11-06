"""Command Center sync: Google reads into out/cc/ for Pipeline, on the Mac.

    $PY aire/pipeline-app/cc_sync.py auth     # once: browser sign-in, aire@calebjackson.org
    $PY aire/pipeline-app/cc_sync.py          # one pass: every read that is due
    $PY aire/pipeline-app/cc_sync.py --all    # every read now
    $PY aire/pipeline-app/cc_sync.py --status # what ran, what failed

$PY is a Python with the Google libraries: the CRM engine's own (the PIPELINE_PYTHON default in the README),
or /usr/bin/python3 if it has them. install-sync.sh picks it and prints it.

Reads (read only): the AIRE Deals sheet, Google Calendar (30 days), Gmail inbox (3 days), Luxury Presence lead
emails (14 days), commission and CDA mail (120 days), Chase alert emails (30 days). Writes to Google: only the
Goals and Scorecard history tabs of the AIRE Deals sheet. Nothing is sent, nothing is deleted.
A failed read keeps the last good rows and records the error, so the screen shows both.
The LaunchAgent org.calebjackson.aire.ccsync runs one pass every 5 minutes (install-sync.sh).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cc  # noqa: E402

OUT = HERE / "out" / "cc"
HOME_AIRE = Path.home() / ".aire"
TOKEN = Path(os.getenv("CC_GOOGLE_TOKEN", str(HOME_AIRE / "google-token-cc.json")))
FALLBACK_TOKEN = HOME_AIRE / "google-token-world.json"  # same three scopes, made by world/sync.py auth
CREDENTIALS = Path(os.getenv("AIRE_GOOGLE_CREDENTIALS", str(HOME_AIRE / "credentials.json")))
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar.readonly"]
TIMEOUT = 20  # seconds, every Google call
HISTORY_HOUR = 6  # the day's Scorecard history row is written after 6 AM Central

# name: (minutes between reads, what it reads)
READS = {
    "calendar": (15, "Google Calendar, primary, next 30 days"),
    "inbox": (10, "Gmail inbox, last 3 days"),
    "leads": (10, "Gmail, Luxury Presence lead emails, last 14 days"),
    "deals": (30, "AIRE Deals sheet"),
    "commission_mail": (120, "Gmail, commission and CDA mail, last 120 days"),
    "bank_mail": (60, "Gmail, Chase alerts, last 30 days, read only"),
}
Q_INBOX = "in:inbox newer_than:3d -from:me"
Q_LEADS = 'newer_than:14d from:luxurypresence.com subject:("new lead" OR "home value")'
Q_COMMISSION = 'subject:(commission OR disbursement OR CDA OR "closing statement") newer_than:120d'
Q_BANK = "from:(chase.com) newer_than:30d"


# ---------------- files ----------------

def read_doc(name: str, folder: Path = OUT) -> dict:
    try:
        return json.loads((folder / f"{name}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def write_doc(name: str, doc: dict, folder: Path = OUT) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    tmp = folder / f"{name}.json.tmp"
    tmp.write_text(json.dumps(doc, indent=1, ensure_ascii=False), encoding="utf-8")
    tmp.replace(folder / f"{name}.json")  # atomic: Pipeline never reads half a file


def config(folder: Path = OUT) -> dict:
    return (read_doc("config", folder).get("rows") or {})


# ---------------- Google, with timeouts ----------------

def services():
    import socket
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    socket.setdefaulttimeout(TIMEOUT)  # a floor for every socket, even if httplib2 below is missing
    path = TOKEN if TOKEN.exists() else FALLBACK_TOKEN
    if not path.exists():
        raise RuntimeError("no Google sign-in yet: run cc_sync.py auth")
    creds = Credentials.from_authorized_user_file(str(path), SCOPES)
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        if path == TOKEN:
            path.write_text(creds.to_json(), encoding="utf-8")
    try:
        import httplib2
        from google_auth_httplib2 import AuthorizedHttp
        mk = lambda api, v: build(api, v, http=AuthorizedHttp(creds, http=httplib2.Http(timeout=TIMEOUT)), cache_discovery=False)
    except ImportError:
        mk = lambda api, v: build(api, v, credentials=creds, cache_discovery=False)
    return {"sheets": mk("sheets", "v4"), "calendar": mk("calendar", "v3"), "gmail": mk("gmail", "v1"), "token": path.name}


def cmd_auth() -> None:
    from google_auth_oauthlib.flow import InstalledAppFlow
    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS), SCOPES)
    creds = flow.run_local_server(port=0, login_hint="aire@calebjackson.org", prompt="consent")
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(creds.to_json(), encoding="utf-8")
    os.chmod(TOKEN, 0o600)
    print(f"saved {TOKEN}: Sheets, Gmail read, Calendar read. Run cc_sync.py --all for the first pass.")


# ---------------- mappers: API answers to cached rows (pure, tested) ----------------

def calendar_rows(items: list[dict]) -> list[dict]:
    out = []
    for e in items:
        st, en = e.get("start") or {}, e.get("end") or {}
        out.append({"id": e.get("id"), "title": e.get("summary") or "(no title)",
                    "start": st.get("dateTime") or st.get("date") or "", "end": en.get("dateTime") or en.get("date") or "",
                    "allDay": "dateTime" not in st, "eventType": e.get("eventType") or "default",
                    "creator": (e.get("creator") or {}).get("email") or "", "free": e.get("transparency") == "transparent",
                    "link": e.get("htmlLink") or ""})
    return out


def headers(msg: dict) -> dict:
    return {h.get("name", "").lower(): h.get("value", "") for h in ((msg.get("payload") or {}).get("headers") or [])}


def thread_row(t: dict) -> dict:
    ms = t.get("messages") or [{}]
    m = ms[-1]
    h = headers(m)
    received = ""
    if m.get("internalDate"):
        received = datetime.fromtimestamp(int(m["internalDate"]) / 1000, cc.CENTRAL).isoformat(timespec="seconds")
    return {"threadId": t.get("id"), "sender": h.get("from", ""), "subject": h.get("subject") or "(no subject)",
            "received": received, "messages": len(ms), "snippet": m.get("snippet", "")}


def body_text(msg: dict) -> str:
    """The plain-text part of a message, or the HTML part with tags removed."""
    found = {"plain": "", "html": ""}

    def walk(p):
        mt, data = p.get("mimeType", ""), (p.get("body") or {}).get("data")
        if data and mt in ("text/plain", "text/html"):
            txt = base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", "replace")
            found["plain" if mt == "text/plain" else "html"] += txt
        for c in p.get("parts") or []:
            walk(c)
    walk(msg.get("payload") or {})
    t = found["plain"] or re.sub(r"<[^>]+>", " ", found["html"])
    return re.sub(r"[ \t\r\f\v]+", " ", t)


PHONE = re.compile(r"\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def lead_row(t: dict, body: str) -> dict:
    """A Luxury Presence lead email as a lead. Labeled fields win; otherwise the first phone and email in it."""
    r = thread_row(t)
    def field(*names):
        for n in names:
            m = re.search(rf"^\s*{n}\s*[:\-]\s*(.+)$", body, re.I | re.M)
            if m:
                return m.group(1).strip()
        return ""
    name = field("name", "full name") or re.sub(r"^.*?(new lead|home value request)\s*[:\-]?\s*", "", r["subject"], flags=re.I).strip()
    emails = [e for e in EMAIL.findall(body) if not re.search(r"luxurypresence|calebjackson\.org|noreply|no-reply", e, re.I)]
    phone = field("phone", "phone number") or next(iter(PHONE.findall(body)), "")
    return {**r, "name": name or "Website lead", "phone": phone, "email": field("email") or next(iter(emails), ""),
            "source": "Home value request" if re.search(r"home value", r["subject"] + body, re.I) else field("source", "type") or "Website lead",
            "area": field("city", "area", "location"),
            "test": bool(re.search(r"\btest\b", name + " " + r["subject"], re.I))}


MONEY = re.compile(r"\$\s?([\d,]+\.\d{2})")


def bank_row(t: dict) -> dict:
    r = thread_row(t)
    text = r["subject"] + " " + r["snippet"]
    kind = "Deposit" if re.search(r"deposit|direct dep|credit", text, re.I) else "Balance" if re.search(r"balance", text, re.I) else "Alert"
    amt = MONEY.search(text)
    return {**r, "type": kind, "amount": float(amt.group(1).replace(",", "")) if amt else None}


# ---------------- fetchers ----------------

def fetch_calendar(svc, cfg, now):
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    res = svc["calendar"].events().list(calendarId="primary", timeMin=start.isoformat(), timeMax=(start + timedelta(days=31)).isoformat(),
                                        singleEvents=True, orderBy="startTime", maxResults=250).execute()
    return calendar_rows(res.get("items") or [])


def _threads(svc, q, n, full=False):
    g = svc["gmail"].users()
    ids = [t["id"] for t in (g.threads().list(userId="me", q=q, maxResults=n).execute().get("threads") or [])]
    out = []
    for i in ids:
        if full:
            out.append(g.threads().get(userId="me", id=i, format="full").execute())
        else:
            out.append(g.threads().get(userId="me", id=i, format="metadata", metadataHeaders=["From", "Subject", "Date"]).execute())
    return out


def fetch_inbox(svc, cfg, now):
    return [thread_row(t) for t in _threads(svc, Q_INBOX, 50)]


def fetch_leads(svc, cfg, now):
    return [lead_row(t, body_text((t.get("messages") or [{}])[0])) for t in _threads(svc, Q_LEADS, 25, full=True)]


def fetch_commission(svc, cfg, now):
    return [thread_row(t) for t in _threads(svc, Q_COMMISSION, 25)]


def fetch_bank(svc, cfg, now):
    return [bank_row(t) for t in _threads(svc, Q_BANK, 25)]


def fetch_deals(svc, cfg, now):
    sid = cfg.get("deals_sheet_id")
    if not sid:
        raise RuntimeError("no deals_sheet_id in out/cc/config.json")
    return svc["sheets"].spreadsheets().values().get(spreadsheetId=sid, range="Deals!A1:L300").execute().get("values") or []


FETCH = {"calendar": fetch_calendar, "inbox": fetch_inbox, "leads": fetch_leads, "deals": fetch_deals,
         "commission_mail": fetch_commission, "bank_mail": fetch_bank}

