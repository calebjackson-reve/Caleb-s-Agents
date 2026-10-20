#!/bin/sh
# Rebuilds feed.json for the Pipeline app: iMessage signals, then the CRM feed with those signals.
# Run by the LaunchAgent org.calebjackson.aire.feed every 15 minutes and at login.
# The Homebrew Python already has Full Disk Access, so the Pipeline app never needs it.
# Read only against Messages and the CRM. Writes only the gitignored feed.json and enrichment/out/.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
PY="$HOME/.aire/venv/bin/python"
LOG="$HOME/.aire/logs/feed.log"
mkdir -p "$HOME/.aire/logs"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }
{
  echo "$(stamp) start"
  cd "$HERE/../enrichment/execution" || exit 1
  "$PY" imessage_signals.py --out ../out/imessage-signals.json || echo "$(stamp) imessage_signals failed, feed keeps the last signals file"
  cd "$HERE" || exit 1
  # Write to a temp file and move it into place so the app never reads a half-written feed.
  if "$PY" crm.py feed --signals ../enrichment/out/imessage-signals.json --out feed.json.tmp; then
    mv feed.json.tmp feed.json && echo "$(stamp) feed ok"
  else
    rm -f feed.json.tmp; echo "$(stamp) feed failed, previous feed.json kept"
  fi
  # Pre-written reply drafts for the Pipeline app (counts only in this log). Skipped when the app is not installed.
  PANEL="${PIPELINE_PANEL:-$HOME/Documents/Codex/2026-10-19/task-3/PipelinePanel}"
  if [ -f "$PANEL/Sources/predraft.py" ]; then
    /opt/homebrew/bin/python3 "$PANEL/Sources/predraft.py" && echo "$(stamp) predraft done" || echo "$(stamp) predraft failed"
  fi
} >> "$LOG" 2>&1
