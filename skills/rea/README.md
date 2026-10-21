# REA (Reverse Engineer Anything)

Source: https://github.com/morluto/rea (MIT, see LICENSE). Copied at commit 1629266, npm package rea-agents 6.7.0.

What it does: lets the agent look at a shipped app or a live website and explain how a feature works, with evidence. For websites it reads page structure, scripts, network calls and screenshots through a Chrome browser.

- Skill: `reverse-engineer-anything/` (linked into `.claude/skills/`)
- MCP server: registered in the root `.mcp.json` as `rea`. Claude Code asks you to approve it the first time.
- Terminal: `npx -y rea-agents@6.7.0 --help`

Use it on public sites for learning and inspiration. Don't copy someone's branding, copy or listing photos.
