#!/bin/sh
# Rebuilds feed.json for the Pipeline app: iMessage signals, then the CRM feed with those signals, then the
# pre-written drafts. Run by the LaunchAgent org.calebjackson.aire.feed every 15 minutes and at login
# (see scheduling/README.md for the plist template, the Linux cron line and the Windows note).
# Read only against Messages and the CRM. Writes only the gitignored feed.json, enrichment/out/ and
# $AIRE_HOME/pipeline/predrafts.json.
#
# Paths come from the environment, never from a hardcoded user:
#   AIRE_HOME        state, venv and logs. Default ~/.aire
#   AIRE_PYTHON      the Python with Full Disk Access and the Google libraries. Default $AIRE_HOME/venv/bin/python,
#                    else the first python3 on PATH.
#   AIRE_PREDRAFT    the predraft script. Default ../pipeline-app/engine/predraft.py next to this file.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
AIRE_HOME="${AIRE_HOME:-$HOME/.aire}"
export AIRE_HOME
if [ -n "${AIRE_PYTHON:-}" ]; then PY="$AIRE_PYTHON"
elif [ -x "$AIRE_HOME/venv/bin/python" ]; then PY="$AIRE_HOME/venv/bin/python"
else PY=$(command -v python3); fi
PREDRAFT="${AIRE_PREDRAFT:-$HERE/../pipeline-app/engine/predraft.py}"
LOG="$AIRE_HOME/logs/feed.log"
LOCK="$AIRE_HOME/logs/feed.lock"
mkdir -p "$AIRE_HOME/logs" "$AIRE_HOME/pipeline"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# One run at a time. The hourly ingest also calls this script, and two runs at :05 used to race each other
# (two "start" lines seconds apart in feed.log on 2026-10-29). mkdir is atomic, so it is the lock.
if ! mkdir "$LOCK" 2>/dev/null; then
  # A lock older than 20 minutes is a crashed run, not a live one.
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +20 2>/dev/null)" ]; then rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0
  else echo "$(stamp) skipped, another refresh is running" >> "$LOG"; exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT INT TERM

{
  echo "$(stamp) start (python $PY)"
  cd "$HERE/../enrichment/execution" || exit 1
  "$PY" imessage_signals.py --out ../out/imessage-signals.json || echo "$(stamp) imessage_signals failed, feed keeps the last signals file"
  cd "$HERE" || exit 1
  # Write to a temp file and move it into place so the app never reads a half-written feed.
  if "$PY" crm.py feed --signals ../enrichment/out/imessage-signals.json --out feed.json.tmp; then
    mv feed.json.tmp feed.json && echo "$(stamp) feed ok"
  else
    rm -f feed.json.tmp; echo "$(stamp) feed failed, previous feed.json kept"
  fi
  # Pre-written reply drafts for the Pipeline app (counts and refusal reasons only in this log, never names).
  if [ -f "$PREDRAFT" ]; then
    "$PY" "$PREDRAFT" && echo "$(stamp) predraft done" || echo "$(stamp) predraft failed"
  else
    echo "$(stamp) predraft skipped, $PREDRAFT not found"
  fi
} >> "$LOG" 2>&1
