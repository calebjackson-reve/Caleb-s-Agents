---
name: cca-model-diversification
description: Protects Caleb's workflow from Claude outages and performance degradations using Nick Saraev's "don't run a monoculture" plan: keep roughly 70% on Claude Code and 30% elsewhere, use Conductor to run Claude and Codex agents side by side, install a Codex MCP server inside Claude Code, keep the Codex desktop app ready, and mirror CLAUDE.md into AGENTS.md and GEMINI.md so the workspace works with any agent. Use when Caleb says "Claude is down", "Claude seems dumber today", "set up a backup for Claude Code", "make my workspace work with Codex", "sync CLAUDE.md to AGENTS.md", or "should I use Codex or Gemini for this".
---

# Model Diversification: Don't Farm a Monoculture

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 25 and 26 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=7671s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=7974s)

## What Nick teaches

**The analogy.** Monoculture farming: one crop yields best, so everyone plants only it, yields climb for years, then a blight hits that crop and everything fails at once (Interstellar's corn). Farmers now rotate and diversify. Claude Code is the best harness, Nick says, and may stay that way, so people naturally go all in. Then an outage or degradation hits.

**Real examples he cites.** An Opus 4.6 outage the day before recording lasted about an hour and productivity "plummeted" for people whose files, skills and prompts lived only in Claude's format. A degradation of Opus 4.5 in Claude Code from December 17, 2025 for a period, attributed to a memory or garbage collection issue, where the model got worse daily. Multiple other outages. Recorded as he said them.

**The portfolio rule.** Use the best model most of the time, because at this level of intelligence a 1% edge matters a lot. But not all of your eggs. His split: about 70% Claude Code, 30% across Codex and a couple of open-source models, using agnostic harnesses like Pi and tools like Conductor. Like an index fund: individual stocks swing, the blend is stable.

**His tier list at recording:** Claude Code first, Codex second (some swear it is better at deep back-end contemplation, he does not fully agree and notes it changes within weeks), Antigravity's Gemini agent chat third (in his tests, not as good at anything except front-end design). Opinions as of his recording.

**Three concrete methods:**

1. **Conductor.** A desktop platform that runs many parallel Claude Code and Codex agents in isolated workspaces on your machine, one interface. If the Claude agents stall and the Codex ones work, you just shift attention. Documentation is clear, just download and set up.
2. **Codex MCP server inside Claude Code.** Good when Claude Code is up but a Claude model is degraded. Install the Codex CLI (`npm i -g @openai/codex`), supply an OpenAI API key, add the MCP server to Claude Code, then "ask Codex" from inside your normal Claude workflow. His install prompt: "Install this. Keys in .env, don't share, this is a demo. Let me know when done so I can restart." Then: "Ask Codex how it's going." Codex replied it was running GPT-5 in his local workspace. Caveat: this lives inside Claude Code, so it does not help if Claude Code itself is down.
3. **A separate agent platform.** Download the Codex desktop app, have or know how to get a subscription, and be familiar with it before you need it.

**Make the workspace portable.** His prompt: "Claude Code is down, so duplicate this whole business workspace, change anything Claude-specific like the .claude folder and CLAUDE.md to the usual agent specification (see agents.md), and make sure all of this works for Codex." Alternatives: keep `AGENTS.md` and `GEMINI.md` alongside `CLAUDE.md` in the same workspace, and add a CLAUDE.md line: "when you update CLAUDE.md, also update AGENTS.md (and GEMINI.md)." He used to run that sync line, then dropped it because he had not been hit by outages, but recommends it.

## Step by step

1. Install the Codex CLI and desktop app now, while Claude is healthy. Confirm you can log in.
2. Add the Codex MCP server to Claude Code. Keys go in `.env` only.
3. Install Conductor if you run parallel builds often.
4. In each workspace, create `AGENTS.md` (and `GEMINI.md` if you use Antigravity) as copies of `CLAUDE.md`, with Claude-specific paths adjusted.
5. Add the sync rule to CLAUDE.md.
6. Write a short runbook in the workspace: if Claude model degraded, route via Codex MCP. If Claude Code down, open Codex app on the same folder. If both down, Antigravity.
7. Once a month, do one real task in Codex so the muscle memory exists.

## Templates / prompts

Codex MCP install (Nick's wording):

```
Install the Codex MCP server from {REPO_URL}. Keys in .env, don't share, this is a demo. Let me know when done so I can restart.
```

Then:

```
Ask Codex how it's going.
```

Sync rule for CLAUDE.md:

```markdown
## Portability
When you update CLAUDE.md, also update AGENTS.md and GEMINI.md with the same content, adjusting only Claude-specific paths (.claude/skills, .claude/agents). The whole purpose of this workspace is to work with any agent.
```

Workspace duplication prompt (when Claude Code is down and you are in another agent):

```
Claude Code is down. Duplicate this whole business workspace into {DEST}. Change anything Claude-specific (the .claude folder, CLAUDE.md) to the standard agent specification per agents.md. Make sure skills, env handling and the folder layout work here. List anything that could not be translated.
```

Runbook (`active/runbooks/outage.md`):

```markdown
# Outage runbook
1. Claude model slow or dumb, Claude Code fine -> use Codex MCP: "ask Codex to ..."
2. Claude Code down -> open Codex desktop app on this folder. AGENTS.md is current.
3. Both down -> Antigravity on this folder. GEMINI.md is current.
4. Afterwards: ask Claude to merge any CLAUDE.md changes made elsewhere back.
```

## Pitfalls Nick calls out

- Codex MCP runs inside Claude Code, so it only covers model degradation, not a Claude Code outage.
- Skills written only in Claude's format and codebases with no comments are hard for other agents to pick up. Keep things readable.
- Rankings change in weeks. Do not over-invest in a second-place tool, just stay fluent.
- Prices, product names and the 70/30 split are his at recording time.

## How Caleb should use this

- AIRE must not go dark when Claude does. Keep `AGENTS.md` current in the AIRE repo and test it in Codex once so a lead-follow-up fix can ship during an outage.
- Keys for OpenAI or others go in `.env`, never in chat (see `cca-security-80-20`).
- Use Codex MCP for a second opinion on a tricky AIRE back-end change, since Nick notes people rate it for deep back-end work.
- Installing Codex or Conductor and buying a subscription costs money, so it needs Caleb's approval before running.
- Keep brokerage SOP skills in plain markdown so any agent can follow them.

## Verification

- `codex --version` works and the Codex app opens on the workspace.
- From Claude Code, "ask Codex how it's going" returns a reply from Codex.
- `AGENTS.md` matches `CLAUDE.md` apart from path adjustments, and editing CLAUDE.md updates it.
- You have completed one real task in the backup tool end to end.
