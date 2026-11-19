#!/bin/sh
# Installs the Market Monitor LaunchAgent (8:00 and 15:00). sh install.sh --remove takes it away.
set -eu
REPO=$(cd "$(dirname "$0")/../.." && pwd)
DEST="$HOME/Library/LaunchAgents/org.calebjackson.aire.market.plist"
launchctl bootout "gui/$(id -u)" "$DEST" 2>/dev/null || true
if [ "${1:-}" = "--remove" ]; then rm -f "$DEST"; echo "removed"; exit 0; fi
sed -e "s|__HOME__|$HOME|g" -e "s|__REPO__|$REPO|g" "$(dirname "$0")/launchd/org.calebjackson.aire.market.plist" > "$DEST"
plutil -lint "$DEST" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "installed: market refresh at 8:00 and 15:00, log in ~/.aire/logs/market.log"
