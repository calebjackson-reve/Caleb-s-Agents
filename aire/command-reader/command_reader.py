#!/usr/bin/env python3
"""KW Command reader. Keeps a dedicated Chrome profile logged in and reads Command every hour, read only.

  python3 command_reader.py --heartbeat          # open Command, confirm signed in, re-login if needed, record status
  python3 command_reader.py --capture            # save text snapshots of Opportunities, Tasks, Contacts to out/ (for building selectors)
  python3 command_reader.py --read               # parse the pages and write changes through crm.py --client command
  python3 command_reader.py --test               # offline checks

Status is written to out/status.json ({"at", "state": "ok" | "login needed" | "layout changed", "detail"}) and the
feed refresh copies it into feed.json as "command" so Pipeline can show one line.

SELECTORS below are filled in by the Mac session from a --capture run. Until they are, --read refuses and says so.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
STATUS = OUT / "status.json"
PROFILE = Path(os.getenv("AIRE_CHROME_PROFILE", str(Path.home() / ".aire" / "chrome-aire")))
CRM_PY = HERE.parent / "crm" / "crm.py"
TOKEN = Path(os.getenv("AIRE_GOOGLE_TOKEN", str(Path.home() / ".aire" / "google-token.json")))
CENTRAL = ZoneInfo("America/Chicago")
COMMAND_URL = "https://console.command.kw.com/"
KEYCHAIN_ITEM = "aire-command"
AUTH_SUBJECT = "KW Authentication Code Verification"

# Filled in from --capture by the Mac session. Empty means "not yet known", and --read refuses.
SELECTORS = {
    "signed_in": "",        # something only present when logged in, e.g. the profile avatar
    "login_form": "",       # the username field on the login page
    "username": "",
    "password": "",
    "submit": "",
    "code_input": "",       # the emailed verification code field
    "opportunities_url": "",
    "tasks_url": "",
    "contacts_url": "",
}


def now() -> str:
    return datetime.now(CENTRAL).replace(microsecond=0).isoformat()


def write_status(state: str, detail: str = "") -> None:
    OUT.mkdir(exist_ok=True)
    STATUS.write_text(json.dumps({"at": now(), "state": state, "detail": detail}, indent=1))
    print(f"{state}: {detail}" if detail else state)


def keychain_password() -> str:
    """The Command password lives in the login Keychain as a generic password named aire-command. Never in a file."""
    out = subprocess.run(["security", "find-generic-password", "-s", KEYCHAIN_ITEM, "-w"], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"no Keychain item {KEYCHAIN_ITEM}. Add it: security add-generic-password -s {KEYCHAIN_ITEM} -a caleb -w")
    return out.stdout.strip()


def extract_code(text: str) -> str:
    """The six digit code from a KW verification email body."""
    m = re.search(r"\b(\d{6})\b", text or "")
    return m.group(1) if m else ""


def latest_auth_code(after: datetime, wait_seconds: int = 120) -> str:
    """Poll Gmail (read only) for the verification email that arrives after `after`. Returns the code or ''."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    creds = Credentials.from_authorized_user_file(str(TOKEN), ["https://www.googleapis.com/auth/gmail.readonly"])
    svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
    deadline = time.time() + wait_seconds
    while time.time() < deadline:
        res = svc.users().messages().list(userId="me", q=f'subject:"{AUTH_SUBJECT}" newer_than:1d', maxResults=3).execute()
        for m in res.get("messages", []):
            full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute()
            when = datetime.fromtimestamp(int(full["internalDate"]) / 1000, tz=timezone.utc)
            if when >= after:
                code = extract_code(full.get("snippet", ""))
                if code:
                    return code
        time.sleep(10)
    return ""


def launch(headless: bool = True):
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    ctx = pw.chromium.launch_persistent_context(str(PROFILE), headless=headless, channel="chrome",
                                                viewport={"width": 1280, "height": 900})
    return pw, ctx


def signed_in(page) -> bool:
    if SELECTORS["signed_in"]:
        return page.locator(SELECTORS["signed_in"]).count() > 0
    # Before selectors exist: the login page carries "login" or "sign in" in its URL.
    return "login" not in page.url.lower() and "signin" not in page.url.lower()


def relogin(page) -> bool:
    if not all(SELECTORS[k] for k in ("username", "password", "submit")):
        return False
    started = datetime.now(timezone.utc)
    page.fill(SELECTORS["username"], os.getenv("AIRE_COMMAND_USER", "aire@calebjackson.org"))
    page.fill(SELECTORS["password"], keychain_password())
    page.click(SELECTORS["submit"])
    page.wait_for_timeout(4000)
    if SELECTORS["code_input"] and page.locator(SELECTORS["code_input"]).count():
        code = latest_auth_code(started)
        if not code:
            return False
        page.fill(SELECTORS["code_input"], code)
        page.keyboard.press("Enter")
        page.wait_for_timeout(4000)
    return signed_in(page)


def heartbeat() -> None:
    pw, ctx = launch()
    try:
        page = ctx.new_page()
        page.goto(COMMAND_URL, wait_until="networkidle", timeout=60000)
        if signed_in(page):
            write_status("ok", "signed in, session refreshed")
            return
        for attempt in (1, 2):
            if relogin(page):
                write_status("ok", f"re-login succeeded on attempt {attempt}")
                return
        write_status("login needed", "open the AIRE Chrome profile and sign in to Command once")
    except Exception as e:
        write_status("layout changed", str(e)[:200])
    finally:
        ctx.close(); pw.stop()


def capture() -> None:
    """Text snapshots the Mac session reads to pick selectors. Git-ignored, hold client names."""
    pw, ctx = launch(headless=False)
    try:
        page = ctx.new_page()
        for name, url in (("home", COMMAND_URL), ("opportunities", SELECTORS["opportunities_url"]),
                          ("tasks", SELECTORS["tasks_url"]), ("contacts", SELECTORS["contacts_url"])):
            if not url:
                continue
            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(2000)
            OUT.mkdir(exist_ok=True)
            (OUT / f"{name}.txt").write_text(page.inner_text("body"))
            (OUT / f"{name}.html").write_text(page.content())
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
            print(f"captured {name}")
    finally:
        ctx.close(); pw.stop()


def read() -> None:
    if not all(SELECTORS.values()):
        write_status("layout changed", "selectors not filled in yet, run --capture and fill SELECTORS")
        sys.exit(2)
    raise SystemExit("read: parsing is filled in by the Mac session from the captured pages")


def run_tests() -> int:
    fails = []
    def check(name, ok):
        print(("PASS " if ok else "FAIL ") + name)
        if not ok: fails.append(name)
    check("code extracted from a KW email", extract_code("Your verification code is 482913. It expires in 10 minutes.") == "482913")
    check("no code when none present", extract_code("Hello Caleb, this is a login alert.") == "")
    check("five digits are not a code", extract_code("code 12345 only") == "")
    class P:  # fake page
        url = "https://console.command.kw.com/login?return=/"
    check("login url means not signed in", not signed_in(P()))
    P.url = "https://console.command.kw.com/home"
    check("home url means signed in (before selectors exist)", signed_in(P()))
    write_status("ok", "test"); s = json.loads(STATUS.read_text())
    check("status file written", s["state"] == "ok" and s["at"])
    STATUS.unlink()
    print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--heartbeat", action="store_true")
    ap.add_argument("--capture", action="store_true")
    ap.add_argument("--read", action="store_true")
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args()
    if a.test: sys.exit(run_tests())
    elif a.heartbeat: heartbeat()
    elif a.capture: capture()
    elif a.read: read()
    else: ap.print_help()
