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

