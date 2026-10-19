#!/usr/bin/env bash
# Speed to lead on this Mac. Run once: bash aire/speed-to-lead/install.sh
# Needs: a Google app password for aire@calebjackson.org
#        (Google Account, Security, 2-Step Verification, App passwords)
#        Messages on this Mac signed in with Caleb's iPhone number, Text Message Forwarding on.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$HERE/.env" ]; then
  read -r -p "Google app password for aire@calebjackson.org (16 characters, not shown): " -s PW; echo
  printf 'GMAIL_USER=aire@calebjackson.org\nGMAIL_APP_PASSWORD=%s\n' "$PW" > "$HERE/.env"
  chmod 600 "$HERE/.env"
fi
echo "Dry run first (one pass, sends nothing):"
cd "$HERE" && ONCE=1 DRY_RUN=1 python3 speed_to_lead.py
[ -f "$HERE/dry-run.log" ] && { echo; echo "What it would have sent:"; tail -n 30 "$HERE/dry-run.log"; }
echo
read -r -p "Go live now? Type LIVE to keep it running in the background: " GO
[ "$GO" = "LIVE" ] || { echo "Staying in dry run. Re-run this script when ready."; exit 0; }
PLIST="$HOME/Library/LaunchAgents/com.aire.speedtolead.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<P
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.aire.speedtolead</string>
  <key>ProgramArguments</key><array><string>/usr/bin/python3</string><string>$HERE/speed_to_lead.py</string></array>
  <key>EnvironmentVariables</key><dict><key>LIVE</key><string>1</string></dict>
  <key>WorkingDirectory</key><string>$HERE</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HERE/stdout.log</string>
  <key>StandardErrorPath</key><string>$HERE/stderr.log</string>
</dict></plist>
P
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "LIVE. Background job installed. Logs: $HERE/log.csv, errors.log, stdout.log"
echo "To stop: launchctl unload $PLIST"
