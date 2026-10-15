# Speed to lead responder

Caleb's first real estate automation tool. Replies to every Luxury Presence website inquiry within about a minute by email from aire@calebjackson.org and a text from Caleb's own number, (225) 747-0303, promising a call.

Built from Nick Saraev's `mk-speed-to-lead-email-sms` skill. Directive in `directive.md`, copy in `templates.md`, what it found in the inbox in `DRY-RUN-2026-10-15.md`.

## Files

| File | What |
|---|---|
| `responder.py` | The tool. Dry run by default. |
| `templates.md` | The only place copy lives. Two fill slots: first name and request phrase. |
| `directive.md` | The plain-English spec the script follows. |
| `tests/fixtures/` | An anonymized Luxury Presence lead email in the exact real format. |
| `processed.json`, `log.csv`, `dry-run.log`, `errors.log`, `text-queue.json` | Created at runtime. Not committed. |

## Run it on the Mac

```
cd ~/Caleb-s-Agents/aire/speed-to-lead
pip3 install google-api-python-client google-auth-oauthlib
python3 responder.py --test                 # proves parsing and templates, touches nothing
python3 responder.py --once                 # dry run against the real inbox, sends nothing
python3 responder.py --loop                 # dry run, polls every 60 seconds
DRY_RUN=false python3 responder.py --loop   # live. Only after Caleb approves the dry-run output.
```

First `--once` opens a Google sign-in. It needs `credentials.json` (an OAuth desktop client from Google Cloud, Gmail API enabled) in this folder. The token is stored in `token.json`. Neither file is committed.

Texts need the Mac signed into Messages with Text Message Forwarding on for Caleb's iPhone.

## What it does on each new lead

1. Finds unread "New Lead" emails from noreply@luxurypresence.com. Ignores the twin "Property Value Request" email.
2. Parses name, email, phone, request type.
3. Skips test addresses and anyone already replied to.
4. Fills the daytime or after-hours template. Checks the text is under 160 characters.
5. Dry run: writes what it would send to `dry-run.log`. Live: sends the email, sends the text (or queues it until 8 am Central in quiet hours), marks the email read, logs seconds-to-reply.
6. Any failure goes to `errors.log` and the loop keeps going.

## Rules it will not break

- Never sends outside the templates.
- Never replies twice to the same address.
- Never contacts the test addresses listed in `templates.md`.
- Never texts between 8 pm and 8 am Central.
- Every message carries Caleb's name and Keller Williams First Choice.
