#!/usr/bin/env bash
# One-time setup: Claude Code on this computer with Chrome and Remote Control every session.
# Safe to run more than once.
set -e

# 1. Install Claude Code if missing
command -v claude >/dev/null 2>&1 || curl -fsSL https://claude.ai/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"

# 2. Get the repo
REPO="$HOME/Caleb-s-Agents"
[ -d "$REPO/.git" ] || git clone https://github.com/calebjackson-reve/Caleb-s-Agents.git "$REPO"

# 3. Allow Chrome browser tools without prompts (merges into existing settings)
mkdir -p "$HOME/.claude"
SETTINGS="$HOME/.claude/settings.json"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
cp "$SETTINGS" "$SETTINGS.bak"
python3 - "$SETTINGS" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
allow = d.setdefault("permissions", {}).setdefault("allow", [])
if "mcp__claude-in-chrome__*" not in allow:
    allow.append("mcp__claude-in-chrome__*")
json.dump(d, open(p, "w"), indent=2)
PY

# 4. Permanent shortcut: type "aire" to start Claude in the repo with Chrome and Remote Control
for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
  touch "$RC"
  grep -q "alias aire=" "$RC" || echo "alias aire='cd \"$REPO\" && git pull -q; claude --chrome --remote-control'" >> "$RC"
done

echo "Done. Open a new terminal window and type: aire"
