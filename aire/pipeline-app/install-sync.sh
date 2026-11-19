#!/bin/sh
# Command Center sync LaunchAgent: one pass every 5 minutes, logs to ~/.aire/logs/ccsync.log.
#   sh aire/pipeline-app/install-sync.sh            install or reinstall
#   sh aire/pipeline-app/install-sync.sh --remove   stop it and take it away
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
LABEL=org.calebjackson.aire.ccsync
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "$1" = "--remove" ]; then rm -f "$DEST"; echo "removed $LABEL"; exit 0; fi
mkdir -p "$HOME/.aire/logs" "$HOME/Library/LaunchAgents"
# The Python that has the Google libraries: the CRM engine's first, then the system one.
PY=""
for p in "$HOME/.aire/venv/bin/python" /usr/bin/python3; do
  if [ -x "$p" ] && "$p" -c "import googleapiclient, google.oauth2, google_auth_oauthlib" 2>/dev/null; then PY="$p"; break; fi
done
if [ -z "$PY" ]; then
  echo "No Python here has the Google libraries (googleapiclient, google-auth, google-auth-oauthlib). Nothing installed."
  exit 1
fi
sed "s#__REPO__#$REPO#g; s#__HOME__#$HOME#g; s#__PYTHON__#$PY#g" "$HERE/launchd/$LABEL.plist" > "$DEST"
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "installed $LABEL from $REPO with $PY"
echo "first pass is running now. Check it: $PY $HERE/cc_sync.py --status"
