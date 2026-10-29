#!/bin/sh
# Renders the LaunchAgent plists from the templates for THIS user and THIS checkout, then loads them.
# Nothing in the templates names a user. Run from any clone:
#
#   sh aire/crm/scheduling/install.sh            # render + load for the current user
#   sh aire/crm/scheduling/install.sh --render   # only write the plists, print their paths, load nothing
#   sh aire/crm/scheduling/install.sh --uninstall
#
# Variables: AIRE_HOME (default ~/.aire), AIRE_LAUNCHAGENTS (where to write, default ~/Library/LaunchAgents). The one-host guard (~/aire-mini/bin/host-guard) is wrapped in
# automatically when it exists, so a copied agent on a second Mac stays quiet until cutover names that Mac.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
AIRE_HOME="${AIRE_HOME:-$HOME/.aire}"
AGENTS="${AIRE_LAUNCHAGENTS:-$HOME/Library/LaunchAgents}"   # override to render somewhere else, for example a test folder
GUARD="$HOME/aire-mini/bin/host-guard"
MODE="${1:-install}"
mkdir -p "$AGENTS" "$AIRE_HOME/logs"
# The guard line is passed without its newline (awk -v cannot carry one) and the newline is added in awk.
if [ -x "$GUARD" ]; then GUARD_XML="		<string>$GUARD</string>"; else GUARD_XML=""; fi
for label in org.calebjackson.aire.feed org.calebjackson.aire.ingest; do
  target="$AGENTS/$label.plist"
  if [ "$MODE" = "--uninstall" ]; then
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
    rm -f "$target"; echo "removed $target"; continue
  fi
  # sed on a template with a multi-line replacement is fragile, so render with awk.
  awk -v repo="$REPO" -v home="$AIRE_HOME" -v guard="$GUARD_XML" '
    { gsub(/__REPO__/, repo); gsub(/__AIRE_HOME__/, home); if (guard != "") gsub(/__HOST_GUARD__/, "\n" guard); else gsub(/__HOST_GUARD__/, ""); print }
  ' "$HERE/$label.plist.template" > "$target"
  plutil -lint "$target" >/dev/null
  echo "rendered $target"
  if [ "$MODE" = "install" ]; then
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$target"
    echo "loaded $label"
  fi
done
