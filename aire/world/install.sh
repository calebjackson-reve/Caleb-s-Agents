#!/bin/sh
# Installs (or removes) the two LaunchAgents that keep the AIRE World live on the Mac:
#   org.calebjackson.aire.world.sync   runs sync.py every 5 minutes (reads the CRM sheet, writes data.json)
#   org.calebjackson.aire.world.serve  serves this folder at http://localhost:4751
# Usage:  sh aire/world/install.sh          install or reinstall
#         sh aire/world/install.sh --remove
set -e
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/.aire/logs"
mkdir -p "$AGENTS" "$LOGS"
for name in sync serve; do
  LABEL="org.calebjackson.aire.world.$name"
  DEST="$AGENTS/$LABEL.plist"
  launchctl bootout "gui/$(id -u)" "$DEST" 2>/dev/null || true
  if [ "$1" = "--remove" ]; then
    rm -f "$DEST"; echo "removed $LABEL"; continue
  fi
  sed -e "s#__REPO__#$REPO#g" -e "s#__HOME__#$HOME#g" "$REPO/aire/world/launchd/$LABEL.plist" > "$DEST"
  launchctl bootstrap "gui/$(id -u)" "$DEST"
  echo "installed $LABEL"
done
[ "$1" = "--remove" ] || echo "open http://localhost:4751  (log: $LOGS/world.log, sync log: $REPO/aire/world/sync.log)"
