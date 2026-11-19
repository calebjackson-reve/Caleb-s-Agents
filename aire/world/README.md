# AIRE World

Caleb's business as a miniature Louisiana town, with a dashboard rail beside it: brief, up next, today's calendar, to-dos, inbox, and four charts (pipeline by stage, the sphere by band, new leads over 14 days, spending by category). Click the office, a house on the street, a lead car, the post office, the town square, the courthouse clock, the market billboard or the construction site, and its card docks at the top of the rail. It is a page inside Pipeline (`0` key, or World in the nav) and runs on the AIRE CRM sheet.

The numbers come from `data.json`, which `sync.py` rebuilds from the sheet every 5 minutes on the Mac. The rail's calendar, inbox, to-dos and next actions come from `brief.json`, written by the same sync on the Mac only (it holds names, so it never leaves the Mac). `history.json` keeps one row of totals per day for the sparklines. The page re-reads all three every minute.

Built 2026-11-04 from the nocode.joshua five-step guide, tailored to real estate. The plan is `plan.md`.

## The loop

1. `sync.py` reads the AIRE CRM Google Sheet read-only: Contacts, Deals, Tasks, and the three input tabs Caleb fills, `Command export`, `LP leads`, `Deadlines`. It matches records by property address first, then email, and writes totals to `data.json`. Names, emails, phones and addresses never reach the file. The merged table and every unmatched record go to `reports/merge-<date>.md` (git-ignored).
2. `index.html` draws the town with Three.js and fetches `data.json` every 60 seconds. A changed number animates. The LIVE dot says "updated X min ago" and turns grey after 30 minutes or when the last sync failed.

## Run it on the Mac

```
cd ~/Caleb-s-Agents
/usr/bin/python3 aire/world/sync.py auth   # once: the World's own Google token with Calendar read added (Sheets, Gmail read, Calendar read)
/usr/bin/python3 aire/world/sync.py        # one sync: prints the merged table, the unmatched list and every number with its source
sh aire/world/install.sh                   # sync every 5 minutes and a page server on http://localhost:4751, both start at login
```

Then open Pipeline and press `0` (or click World in the nav). Pipeline serves the page at `http://127.0.0.1:4747/world/` from this folder, read only. The standalone server on 4751 still works too.

The `auth` step writes `~/.aire/google-token-world.json` and never touches the CRM's own token. Without it the sync still runs on the CRM token and the rail says the calendar needs that one step.

The sync uses the CRM's own Google token at `~/.aire/google-token.json` (Sheets scope, the same one `aire/crm/crm.py auth` created). Use `/usr/bin/python3`, the system Python that has `google-api-python-client` and `google-auth` installed for the CRM engine; the LaunchAgents use it too. A Homebrew `python3` on PATH does not have them and fails at once.

If the sheet cannot be read at all (no network, token expired), the sync logs `FAILED`, keeps the last good `data.json`, and the page shows the last good time with a grey dot. It never writes zeros and calls it ok. A single input tab that fails (one you have not created yet) is a warning in `sync.log` and in `data.json` under `sync.warnings`; the rest syncs.

Stop: `sh aire/world/install.sh --remove`. Restart: run `install.sh` again. Check: the LIVE label on the page, `aire/world/sync.log` (one line per sync, `ok` or `FAILED` with the error type), and `~/.aire/logs/world.log`. A failed sync keeps the last good `data.json` and the page shows the last good time.

Fill the input tabs: paste the KW Command Contacts export, then the Opportunities export under it, into `Command export`, header rows included. Paste the Luxury Presence export into `LP leads`. Add deadlines to `Deadlines` (address, kind, date). Log expenses in `Spending` (date, vendor, amount, category: software, marketing, dues, mileage, client, office, other). The next sync prints which columns it recognized and which it ignored, and lists anything it could not match.

## Rebuild the page

`src/page.html` is the source. `python3 aire/world/build.py` writes `index.html` with the current `data.json` as the first frame (or `data.sample.json` when no live file exists). Republish `index.html` and the data file to the preview artifact after a rebuild.

`data.json` is the live file the Mac rewrites every 5 minutes, so it is git-ignored. `data.sample.json` is a committed snapshot (totals only) for builds and the preview.

## Files

| File | What it is |
|---|---|
| `sync.py` | The sync. `--loop` every 5 minutes, `--from-exports DIR` for a Claude session with connector exports, `table` to print the numbers. |
| `data.json` | The live file, totals only, with period and source on every number, spending totals, and the match counts. Git-ignored. |
| `brief.json` | Mac only, git-ignored. Today's calendar, inbox threads, open tasks and next actions, with names, for the rail. |
| `history.json` | Mac only, git-ignored. One row of key totals per day, 90 days, for the sparklines. |
| `data.sample.json` | Committed snapshot of the same shape, for build.py and the preview. |
| `plan.md` | The eight objects, what each shows, how each moves. |
| `src/page.html`, `build.py`, `index.html` | The page source, the assembler, the built page. |
| `install.sh`, `launchd/` | The two LaunchAgents. |
| `reports/`, `sync.log` | On the Mac only, git-ignored. |

## Charts

Four inline SVG charts, no library: pipeline by stage (count and dollar volume, horizontal bars), the sphere by band (one segmented bar, one hue from hot to cold), new leads over the last 14 days (a sparkline from `history.json`, which starts the day the loop first runs), and spending by category over 30 days. The categorical palette was run through the dataviz validator against the page surface on 2026-11-04 and passes every check; because three of its hues sit under 3:1 contrast on the paper, every bar carries its value as a direct label and every mark has a hover tooltip.

## Proof, 2026-11-04

Headless Chromium at 1440x900 and 400x820: zero console errors beyond the expected `file://` fetch refusal (the served page fetches normally), no horizontal overflow, the office, street and courthouse cards read back the synced numbers ($2,397,000 under contract, 4 deadlines, next close 2026-11-20). Leak check on `data.json`: 0 emails, 0 phones, 0 street strings.
