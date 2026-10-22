#!/bin/sh
# Installs Pipeline on the Mac: the server runs at login (LaunchAgent) and a Dock app opens it as its own window.
#   sh aire/pipeline-app/install.sh            install or update
#   sh aire/pipeline-app/install.sh --remove   stop and remove
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
LABEL=org.calebjackson.aire.pipeline
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
APP="$HOME/Applications/Pipeline.app"
PY="$HOME/.aire/venv/bin/python"

if [ "${1:-}" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"; rm -rf "$APP"
  echo "Pipeline removed. The source and out/ stay in the repo folder."
  exit 0
fi

[ -x "$PY" ] || { echo "No Python at $PY. The CRM venv is needed first (see aire/crm/README.md)."; exit 1; }
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/.aire/logs" "$HOME/Applications"

# 1. The server, at login and kept alive.
sed -e "s|__HOME__|$HOME|g" -e "s|__REPO__|$REPO|g" "$HERE/launchd/$LABEL.plist" > "$PLIST"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "server: launchctl loaded $LABEL (log: ~/.aire/logs/pipeline.log)"
[ -f "$HOME/.aire/pipeline.env" ] && echo "keys: ~/.aire/pipeline.env found (Claude Q&A and ElevenLabs turn on if their keys are in it)" || echo "keys: no ~/.aire/pipeline.env, Claude Q&A and ElevenLabs stay off (see README)"

# 2. A Dock app that opens the screen as its own window (Chrome app mode, Safari otherwise).
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cat > "$APP/Contents/MacOS/Pipeline" <<'EOF'
#!/bin/sh
URL="http://127.0.0.1:${PIPELINE_PORT:-4747}/"
if [ -d "/Applications/Google Chrome.app" ]; then
  exec open -na "Google Chrome" --args --app="$URL" --window-size=1440,900
else
  exec open "$URL"
fi
EOF
chmod +x "$APP/Contents/MacOS/Pipeline"
cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Pipeline</string>
  <key>CFBundleDisplayName</key><string>Pipeline</string>
  <key>CFBundleIdentifier</key><string>org.calebjackson.aire.pipeline.app</string>
  <key>CFBundleVersion</key><string>2.0</string>
  <key>CFBundleExecutable</key><string>Pipeline</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><false/>
</dict></plist>
EOF
echo "app: $APP (drag it to the Dock)"
sleep 1
curl -s -o /dev/null -w "server answers: HTTP %{http_code}\n" "http://127.0.0.1:4747/api/state" || echo "server not answering yet, check ~/.aire/logs/pipeline.log"
echo "open it: open \"$APP\"   or   http://127.0.0.1:4747/"
