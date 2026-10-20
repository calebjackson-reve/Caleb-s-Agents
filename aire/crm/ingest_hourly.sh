#!/bin/sh
# Hourly Gmail ingest into the AIRE CRM, then a fresh feed for the Pipeline app.
# Run by the LaunchAgent org.calebjackson.aire.ingest. Gmail stays read only.
# The 3-hour window overlaps on purpose. Ingest skips notes and deal events it already wrote, so overlap never doubles a write.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
PY="$HOME/.aire/venv/bin/python"
LOG="$HOME/.aire/logs/ingest.log"
mkdir -p "$HOME/.aire/logs"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }
cd "$HERE" || exit 1
{
  echo "$(stamp) ingest start"
  # Summary line only. Event lines can carry client names, and this log stays on the Mac.
  OUT=$(mktemp)
  if "$PY" crm.py ingest --hours 3 > "$OUT" 2>&1; then
    tail -1 "$OUT"; echo "$(stamp) ingest ok"
  else
    tail -1 "$OUT"; echo "$(stamp) ingest FAILED, see the audit file before re-running by hand"
  fi
  rm -f "$OUT"
} >> "$LOG" 2>&1
"$HERE/refresh_feed.sh"
