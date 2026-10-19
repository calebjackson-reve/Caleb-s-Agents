# Global CLAUDE.md

Day 1 of the skills rollout. This is the file Claude Code reads at the start of every session on Caleb's machine.

Install on the Mac (backs up any existing file first):

```
mkdir -p ~/.claude && [ -f ~/.claude/CLAUDE.md ] && cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak-$(date +%F); curl -fsSL https://raw.githubusercontent.com/calebjackson-reve/Caleb-s-Agents/main/global-claude-md/CLAUDE.md -o ~/.claude/CLAUDE.md && echo installed
```

Then in any Claude Code session run `/context` and confirm the file shows under CLAUDE.md. To check it took, ask "who am I and what is my brokerage" and expect Keller Williams First Choice.

Update the file here, commit, and re-run the install line. This repo is the source of truth, the Mac copy is a copy.

## Done chime and needs-you ping (Nick's hooks lesson)

`settings.json` here plays Glass when Claude finishes a task and Ping when it needs your input or a permission. Install on the Mac, merging with any hooks already there:

```
mkdir -p ~/.claude && [ -f ~/.claude/settings.json ] && cp ~/.claude/settings.json ~/.claude/settings.json.bak-$(date +%F); curl -fsSL https://raw.githubusercontent.com/calebjackson-reve/Caleb-s-Agents/main/global-claude-md/settings.json -o ~/.claude/settings.json && echo installed
```

If you already have a settings.json with permissions in it, open both and paste the `hooks` block in instead of overwriting. Restart Claude Code after.
