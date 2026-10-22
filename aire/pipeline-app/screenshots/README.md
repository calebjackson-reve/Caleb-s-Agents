# Pipeline app screenshots

Taken on the Mac against the real feed, then blurred or cropped so no real name, phone, email or message text is visible. PNG, one per screen, named as below so the main README can link them.

| File | Screen |
|---|---|
| `01-touches-due.png` | Touches due, owes-a-reply rows at the top |
| `02-tasks.png` | Open tasks, overdue first |
| `03-deals.png` | Live deals |
| `04-new-leads.png` | New leads of the last 14 days |
| `05-compose-text.png` | Compose box with a text draft from `text-queue.json` and the person's last three texts above it |
| `06-compose-email.png` | Compose box with an email draft from `email-queue.json` |
| `07-command-login-warning.png` | The warning shown when `command-reader/out/status.json` says `login needed` |
| `08-header-not-ok.png` | What the app shows when `feed.json` has `header_ok: false` (optional, needs a doctored copy of the feed) |

Nothing here yet. Run `python3 tools/check-no-client-data.py` before committing any of them, and look at each image once more by eye: the checker reads text files only, it cannot see a name inside a PNG.
