# Pipeline app (native Mac)

Caleb's one daily tool (`aire/STACK.md`, Daily view). It draws what the CRM engine in `aire/crm/` already computes and sends Caleb's actions back through `crm.py`. Nothing else is to be built beside it: improve Pipeline, never a parallel dashboard (Caleb, 2026-10-19).

## Where the source is right now

**Not in this folder yet.** The app was built by Codex on 2026-10-19 and its source is on the Mac at `~/Documents/Codex/2026-10-19/task-3/PipelinePanel` (the path `aire/crm/refresh_feed.sh` used until 2026-10-22). Codex was cancelled on 2026-10-19, so Claude Code on the Mac maintains it from here on. A `pipeline-airdrop.zip` (230 MB, uploaded 2026-10-22) sits in Caleb's Drive, which is probably the same folder with build output in it.

Cloud sessions cannot reach the Mac or unpack that zip, so the copy has to happen in a session running on the Mac. The steps are in **Bringing the source into this folder** below. `refresh_feed.sh` already looks here first and falls back to the Codex folder until the copy lands.

## What the app reads

All paths relative to `aire/`. Every one of these files is git-ignored and stays on the Mac: they hold client names, phones and message text.

| File | Written by | What the app shows from it |
|---|---|---|
| `crm/feed.json` | `crm/refresh_feed.sh` (LaunchAgent `org.calebjackson.aire.feed`, every 15 minutes and at login), which runs `crm.py feed --signals ../enrichment/out/imessage-signals.json` | Touches due (owes-a-reply first, then hot, then signal score, then longest silence), open tasks, live deals, new leads of the last 14 days, counts, `header_ok`. Spec: `crm/FEED.md`. |
| `follow-up/out/text-queue.json` | `follow-up/followups.py --queue`, and the app's own `Sources/predraft.py` (which imports `follow-up/pools.py`) | Pre-written text drafts in the compose box, one per phone-only person who is due. `reply_first` entries carry the person's last three texts instead of a template. |
| `follow-up/out/email-queue.json` | same | Pre-written email drafts in the compose box for people with an email. |
| `command-reader/out/status.json` | `command-reader/command_reader.py` (LaunchAgent `org.calebjackson.aire.command`, every 30 minutes) | `{"at", "state", "detail"}`. `state` is `ok`, `login needed` or `layout changed`. On `login needed` the app shows the Command login warning. |

When `feed.json` says `header_ok: false`, the app is meant to show that and nothing else, because the Contacts header lost a column the engine needs (`crm/FEED.md`).

## What the app sends back

Every action is a shell call to `aire/crm/crm.py` with `--json --client pipeline`. The engine prints exactly one JSON object (`{"ok": true, "result": ...}` or `{"ok": false, "error": ...}`), applies the write gates (person_id must exist, Do_Not_Contact only ever to YES, Command_ID never written) and logs the write to `audit.jsonl` and the Connector Log tab with `pipeline` in the Client column.

| In the app | Command |
|---|---|
| "Touched" on a person, and after every send from the compose box | `python3 crm.py --json --client pipeline touch <person_id> "<what happened>"` |
| "Done" on a task that has a `task_id` | `python3 crm.py --json --client pipeline done <task_id>` |
| "Done" on a Next_Action item (no `task_id`) | `python3 crm.py sync-tasks` first, then `done` on the new id |
| New task | `python3 crm.py --json --client pipeline task <person_id> "<task>" --due YYYY-MM-DD` |
| Edit a deal (stage, price, close date, next step, event) | `python3 crm.py --json --client pipeline deal "<street address>" --stage ... --price ... --close ... --next-step ... --event ... [--expect <stage>] [--create --side buyer|seller]` |
| Refresh | `python3 crm.py ingest && python3 crm.py feed` (or `sh refresh_feed.sh`, which also rebuilds the iMessage signals and the predrafts) |

`crm.py` also accepts `stage`, `note` and `dnc` with the same `--json` contract, so the app can use them without any engine change.

The app is the one sender (Caleb, 2026-10-20). `aire/follow-up/README.md` expects it to keep the send log, the Do Not Contact check on every send and the daily cap of 25 texts and 25 emails. Whether the app does all three today is not verified from the cloud; the Mac session checks it against the source. `followups.py --approve` is a dry run unless `FOLLOWUP_SENDER=followups` is set on purpose.

## Build and run

To be filled in by the Mac session once the source is here (project type, Xcode or `swift build` command, how it is launched at login). Until then, the app is launched the way Codex left it on the Mac.

Environment the scripts expect, from `crm/refresh_feed.sh`:

- `~/.aire/venv/bin/python` for `crm.py` and `imessage_signals.py` (this Python has Full Disk Access for Messages, so the app never needs it).
- `/opt/homebrew/bin/python3` for `Sources/predraft.py`.
- `PIPELINE_PANEL` to point `refresh_feed.sh` at a different checkout of the app. Default is this folder.

## Bringing the source into this folder

Run in Claude Code on the Mac, from `~/Caleb-s-Agents`:

1. Open `~/Documents/Codex/2026-10-19/task-3/PipelinePanel` (or `$PIPELINE_PANEL`). Record what it is (Swift package, Xcode project, Electron, Python panel) and the exact build and run command. Put that in **Build and run** above.
2. Copy the source here. Leave out anything that holds client data or build output: `feed.json`, `text-queue.json`, `email-queue.json`, `status.json`, any `out/`, `logs/`, `cache/`, `.build/`, `DerivedData/`, `*.audit.jsonl`, `*.log`, send logs, and screenshots with real names. The folder's `.gitignore` already lists these.
3. Build and run it against the real feed. Screenshot every screen: touches due, tasks, deals, new leads, compose box with a text draft and an email draft, the Command "login needed" warning, and the `header_ok: false` state if it can be triggered on a copy of the feed. Blur or crop real names, phones, emails and message text before saving. Save as PNG under `screenshots/` with the names listed in `screenshots/README.md`.
4. `python3 tools/check-no-client-data.py`, then commit on a `claude/` branch and push.
5. Add what the app does today, what is stubbed and what broke to the top of `aire/STATUS.md`.

## Screenshots

See `screenshots/README.md`. None yet; they are produced on the Mac in step 3 above.
