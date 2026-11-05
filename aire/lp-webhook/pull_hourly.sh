#!/bin/sh
# Hourly: Luxury Presence leads from the Cloudflare buffer into the Website leads sheet, then,
# only when a new lead row landed, crm.py website-leads turns it into a note + call task.
# Run by the LaunchAgent org.calebjackson.aire.lp-pull. Plain Python, no model calls, no tokens.
# The log holds counts only, never names, phones or emails.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
PY="$HOME/.aire/venv/bin/python"
LOG="$HOME/.aire/logs/lp-pull.log"
mkdir -p "$HOME/.aire/logs"
stamp() { date "+%Y-%m-%d %H:%M:%S"; }
{
  if OUT=$("$PY" "$HERE/pull.py" --write 2>&1); then
    echo "$(stamp) pull ok $OUT"
    case "$OUT" in
      *'"leads": 0'*) ;;
      *) cd "$HERE/../crm" && "$PY" crm.py website-leads | tail -1 && echo "$(stamp) website-leads imported" ;;
    esac
  else
    echo "$(stamp) pull FAILED: $(echo "$OUT" | tail -1)"
  fi
} >> "$LOG" 2>&1
