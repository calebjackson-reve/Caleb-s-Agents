# Global CLAUDE.md

Day 1 of the skills rollout. This is the file Claude Code reads at the start of every session on Caleb's machine.

Install on the Mac (backs up any existing file first):

```
mkdir -p ~/.claude && [ -f ~/.claude/CLAUDE.md ] && cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.bak-$(date +%F); curl -fsSL https://raw.githubusercontent.com/calebjackson-reve/Caleb-s-Agents/main/global-claude-md/CLAUDE.md -o ~/.claude/CLAUDE.md && echo installed
```

Then in any Claude Code session run `/context` and confirm the file shows under CLAUDE.md. To check it took, ask "who am I and what is my brokerage" and expect Keller Williams First Choice.

Update the file here, commit, and re-run the install line. This repo is the source of truth, the Mac copy is a copy.
