# AIRE World

Caleb's business as a miniature Louisiana town on a table, running on the AIRE CRM sheet. Click the office, a house on the street, a lead car, the post office, the town square, the courthouse clock, the market billboard or the construction site, and a frosted card opens with the real numbers. The numbers come from `data.json`, which `sync.py` rebuilds from the sheet every 5 minutes on the Mac. The page re-reads it every minute.

Built 2026-11-04 from the nocode.joshua five-step guide, tailored to real estate. The plan is `plan.md`.

## The loop

1. `sync.py` reads the AIRE CRM Google Sheet read-only: Contacts, Deals, Tasks, and the three input tabs Caleb fills, `Command export`, `LP leads`, `Deadlines`. It matches records by property address first, then email, and writes totals to `data.json`. Names, emails, phones and addresses never reach the file. The merged table and every unmatched record go to `reports/merge-<date>.md` (git-ignored).
2. `index.html` draws the town with Three.js and fetches `data.json` every 60 seconds. A changed number animates. The LIVE dot says "updated X min ago" and turns grey after 30 minutes or when the last sync failed.

## Run it on the Mac

```
cd ~/Caleb-s-Agents
python3 aire/world/sync.py            # one sync: prints the merged table, the unmatched list and every number with its source
sh aire/world/install.sh              # sync every 5 minutes and a page server on http://localhost:4751, both start at login
open http://localhost:4751
```

The sync uses the CRM's own Google token at `~/.aire/google-token.json` (Sheets scope, the same one `aire/crm/crm.py auth` created). It needs `google-api-python-client` and `google-auth`, already installed for the CRM engine.

Stop: `sh aire/world/install.sh --remove`. Restart: run `install.sh` again. Check: the LIVE label on the page, `aire/world/sync.log` (one line per sync, `ok` or `FAILED` with the error type), and `~/.aire/logs/world.log`. A failed sync keeps the last good `data.json` and the page shows the last good time.

Fill the input tabs: paste the KW Command Contacts export, then the Opportunities export under it, into `Command export`, header rows included. Paste the Luxury Presence export into `LP leads`. Add deadlines to `Deadlines` (address, kind, date). The next sync prints which columns it recognized and which it ignored, and lists anything it could not match.

## Rebuild the page

`src/page.html` is the source. `python3 aire/world/build.py` writes `index.html` with the current `data.json` as the first frame. Republish `index.html` and `data.json` to the preview artifact after a rebuild.

## Files

| File | What it is |
|---|---|
| `sync.py` | The sync. `--loop` every 5 minutes, `--from-exports DIR` for a Claude session with connector exports, `table` to print the numbers. |
| `data.json` | Totals only, with period and source on every number, and the match counts. |
| `plan.md` | The eight objects, what each shows, how each moves. |
| `src/page.html`, `build.py`, `index.html` | The page source, the assembler, the built page. |
| `install.sh`, `launchd/` | The two LaunchAgents. |
| `reports/`, `sync.log` | On the Mac only, git-ignored. |

## Proof, 2026-11-04

Headless Chromium at 1440x900 and 400x820: zero console errors beyond the expected `file://` fetch refusal (the served page fetches normally), no horizontal overflow, the office, street and courthouse cards read back the synced numbers ($2,397,000 under contract, 4 deadlines, next close 2026-11-20). Leak check on `data.json`: 0 emails, 0 phones, 0 street strings.
