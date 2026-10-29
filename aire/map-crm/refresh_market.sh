#!/bin/sh
# Market Monitor refresh: EBR permits and Flexmls alert mail into cache/signals.json, then the feed rebuild so
# Pipeline shows them. Run by the LaunchAgent org.calebjackson.aire.market at 8:00 and 15:00 (Caleb, 2026-10-29).
# Read only against the city data and Gmail. Writes only the git-ignored cache/ and the feed.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
PY="$HOME/.aire/venv/bin/python"
LOG="$HOME/.aire/logs/market.log"
mkdir -p "$HOME/.aire/logs"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }
{
  echo "$(stamp) start"
  cd "$HERE" || exit 1
  OUT=$("$PY" monitor.py pull --write 2>&1); RC=$?
  printf '%s\n' "$OUT" | grep -v -i warning | head -3
  if [ $RC -eq 0 ]; then echo "$(stamp) market pulled"; else echo "$(stamp) market pull failed (exit $RC), previous cache kept"; fi
  sh "$HERE/../crm/refresh_feed.sh" && echo "$(stamp) feed rebuilt"
} >> "$LOG" 2>&1
