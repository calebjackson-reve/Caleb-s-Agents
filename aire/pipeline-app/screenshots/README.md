# Pipeline screenshots

Taken from `python3 app.py --demo` with the made-up people in `../fixtures/`, headless Chromium at 1440 by 900, on 2026-10-22. No real name, phone, email or message text is in any of them because none was on the screen. If a screenshot is ever taken from the real feed, blur or crop every name, number, email and message before it comes anywhere near git, and look at it again by eye: `tools/check-no-client-data.py` reads text files only.

| File | Screen |
|---|---|
| `00-command-center.png` | The home screen: overview, core, live feed, deals, timeline, quick commands, gauges, bands, sources |
| `01-touches-due.png` | Touches due, owes-a-reply rows at the top with their last text |
| `02-tasks.png` | Open tasks, overdue first, Next_Action rows marked |
| `03-deals.png` | Live deals |
| `04-new-leads.png` | New leads of the last 14 days |
| `05-compose-text.png` | Compose drawer on a reply-first person: their last three texts above an empty draft |
| `06-compose-email.png` | Compose drawer with an email draft from `email-queue.json` |
| `07-command-login-warning.png` | The attention list when `command-reader/out/status.json` says `login needed` |
| `08-header-not-ok.png` | The stop screen when `feed.json` has `header_ok: false` |
| `09-compose-queue.png` | The Drafts view, the queue in send order |
| `10-deal-edit.png` | The deal editor |
| `11-morning-brief.png` | The morning brief |
| `12-voice-brief.png` | The command center after "hey pipeline, give me the brief" was typed: the core lit up, the transcript and telemetry lines in the core panel |

To retake them: start three demo servers and run a Playwright script against them.

```
python3 app.py --demo --no-open --port 4747
python3 app.py --demo --no-open --port 4748 --demo-status fixtures/demo-status-login-needed.json
python3 app.py --demo --no-open --port 4749 --demo-feed <a copy of fixtures/demo-feed.json with header_ok false>
```
