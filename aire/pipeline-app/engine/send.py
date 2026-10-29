#!/usr/bin/env python3
"""The one place a message can leave the Mac from Pipeline. Called by server.py only after Caleb pressed
Approve in the final review AND the server was started with --live-send.

    send.py text  --to +12255550142 --body "..."            # dry run: prints the plan, sends nothing
    send.py email --to jane@example.com --subject "..." --body "..."  # dry run
    ... --live                                              # actually send

Text: Messages on macOS through osascript. The phone number and the body are passed as separate
arguments to a fixed script, never spliced into it, so message text is never evaluated.
Email: the follow-up tool's Gmail sign-in (aire@calebjackson.org). Nothing is sent when that token is absent.
Prints one JSON object: {ok, detail}. Never prints the message body.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

CENTRAL = ZoneInfo("America/Chicago")
FOLLOWUP = pathlib.Path(os.environ.get("AIRE_FOLLOWUP") or pathlib.Path(__file__).resolve().parents[2] / "follow-up")
FROM_ADDRESS = "aire@calebjackson.org"

APPLESCRIPT = '''on run argv
  set theNumber to item 1 of argv
  set theBody to item 2 of argv
  tell application "Messages"
    set targetAccount to first account whose service type is iMessage
    set targetPerson to participant theNumber of targetAccount
    send theBody to targetPerson
  end tell
  return "sent"
end run'''


def out(ok: bool, detail: str) -> int:
    print(json.dumps({"ok": ok, "detail": detail}))
    return 0 if ok else 1


def quiet_hours() -> bool:
    h = dt.datetime.now(CENTRAL).hour
    return h >= 20 or h < 8


def send_text(to: str, body: str, live: bool) -> int:
    digits = re.sub(r"\D", "", to)
    if len(digits) == 10:
        digits = "1" + digits
    if len(digits) != 11 or not digits.startswith("1"):
        return out(False, "Not a US phone number. Nothing sent.")
    number = "+" + digits
    if not live:
        return out(True, f"Dry run. Would hand a {len(body)} character text to Messages. Nothing sent.")
    if sys.platform != "darwin":
        return out(False, "Texts can only be sent from the Mac that has Messages. Use the phone's own app here.")
    try:
        proc = subprocess.run(["/usr/bin/osascript", "-e", APPLESCRIPT, number, body], capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        return out(False, "Messages did not answer in time. Check Messages before trying again.")
    if proc.returncode != 0 or "sent" not in proc.stdout:
        err = (proc.stderr or "").strip().splitlines()[-1:] or ["no detail"]
        return out(False, "Messages refused the text: " + err[0][:160])
    return out(True, "Handed to Messages. Messages accepting a text is not proof of delivery.")


def send_email(to: str, subject: str, body: str, live: bool) -> int:
    if not re.fullmatch(r"[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+", to):
        return out(False, "Not an email address. Nothing sent.")
    if not subject:
        return out(False, "An email needs a subject. Nothing sent.")
    if not live:
        return out(True, f"Dry run. Would send a {len(body)} character email from {FROM_ADDRESS}. Nothing sent.")
    if quiet_hours():
        return out(False, "Quiet hours (8 pm to 8 am Central). Nothing sent.")
    sys.path.insert(0, str(FOLLOWUP))
    try:
        import followups  # the follow-up tool owns the Gmail sign-in and the send helper
    except Exception as e:
        return out(False, f"Follow-up tool not importable from {FOLLOWUP}: {type(e).__name__}. Nothing sent.")
    svc = followups.gmail_service_or_none()
    if not svc:
        return out(False, "Gmail is not connected (no token.json). Nothing sent.")
    try:
        followups.send_email(svc, to, subject, body)
    except Exception as e:
        return out(False, f"Gmail refused the send: {type(e).__name__}. Check Sent mail before trying again.")
    return out(True, "Gmail accepted the email.")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("channel", choices=["text", "email"])
    ap.add_argument("--to", required=True)
    ap.add_argument("--body", required=True)
    ap.add_argument("--subject", default="")
    ap.add_argument("--live", action="store_true")
    a = ap.parse_args(argv)
    if not a.body.strip():
        return out(False, "Empty message. Nothing sent.")
    if a.channel == "text":
        return send_text(a.to, a.body, a.live)
    return send_email(a.to, a.subject, a.body, a.live)


if __name__ == "__main__":
    sys.exit(main())
