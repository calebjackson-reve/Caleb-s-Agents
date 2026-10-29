# Scheduling the feed

Two jobs keep `aire/crm/feed.json` fresh for the Pipeline app. Both read `AIRE_HOME` (default `~/.aire`) and find their Python at `$AIRE_HOME/venv/bin/python`, else the first `python3` on PATH. `AIRE_PYTHON` overrides that. No script names a user or a machine.

| Job | Runs | Script |
|---|---|---|
| `org.calebjackson.aire.feed` | every 15 minutes and at login | `refresh_feed.sh`: iMessage signals, `crm.py feed --signals`, then `pipeline-app/engine/predraft.py` |
| `org.calebjackson.aire.ingest` | hourly at :05 | `ingest_hourly.sh`: `crm.py ingest --hours 3`, then `refresh_feed.sh` |

`refresh_feed.sh` takes a lock (`$AIRE_HOME/logs/feed.lock`). Before 2026-10-29 the hourly ingest and the 15 minute timer both fired at :05 and ran two refreshes a few seconds apart, which is why `feed.log` showed doubled `start` lines and doubled predraft runs. The second one now logs `skipped` and exits.

## macOS (launchd)

The plists are rendered from the `*.plist.template` files here, so nothing under `~/Library/LaunchAgents` is hand-edited or committed:

```sh
sh aire/crm/scheduling/install.sh          # render for this user and checkout, then load
sh aire/crm/scheduling/install.sh --render # just write the plists and show them
sh aire/crm/scheduling/install.sh --uninstall
```

The one-host guard (`~/aire-mini/bin/host-guard`) is wrapped in when it exists. Logs: `$AIRE_HOME/logs/feed.log`, `ingest.log`, `*.launchd.err`.

The Python the agent uses must have Full Disk Access (System Settings, Privacy and Security) to read Messages. On Caleb's Mac that is the Homebrew Python behind `~/.aire/venv`.

## Linux (cron)

Same scripts, same variables. `crontab -e`:

```cron
AIRE_HOME=/home/you/.aire
PATH=/usr/local/bin:/usr/bin:/bin
*/15 * * * * /bin/sh /path/to/Caleb-s-Agents/aire/crm/refresh_feed.sh
5 * * * *    /bin/sh /path/to/Caleb-s-Agents/aire/crm/ingest_hourly.sh
```

`imessage_signals.py` reads the Messages database, which exists only on a Mac. On Linux it fails and the script logs that and keeps the last signals file, so the feed still rebuilds from the sheet.

## Windows (Task Scheduler)

Run the same two scripts under WSL, every 15 minutes and hourly:

```
schtasks /Create /SC MINUTE /MO 15 /TN "AIRE feed" /TR "wsl.exe -e sh /home/you/Caleb-s-Agents/aire/crm/refresh_feed.sh"
schtasks /Create /SC HOURLY /ST 00:05 /TN "AIRE ingest" /TR "wsl.exe -e sh /home/you/Caleb-s-Agents/aire/crm/ingest_hourly.sh"
```

Set `AIRE_HOME` in the WSL shell profile. As on Linux, the iMessage step is skipped with a log line.

## Running the Pipeline app itself on a schedule

The app is a server, not a job. On the Mac, start it at login with a third plist if wanted (`python3 aire/pipeline-app/server.py`), or just run it from a terminal. See `aire/pipeline-app/README.md`.
