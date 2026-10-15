---
name: cca-claude-md-global-vs-local
description: Designs and splits CLAUDE.md system prompts using Nick Saraev's four-pillar model (knowledge compression, preferences and conventions, declaration of capabilities, log of failures and successes) across the global ~/.claude/CLAUDE.md and the project-level CLAUDE.md. Use when Caleb says things like "set up my CLAUDE.md", "what should go in my global vs project CLAUDE.md", "Claude keeps forgetting it can do X", "Claude keeps asking me to run commands myself", "write a system prompt for AIRE", or "my CLAUDE.md is bloated and burning tokens".
---

# CLAUDE.md: The Four Pillars and the Global vs Local Split

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 2 and 3 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=57s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=543s)

## What Nick teaches

Nick says a CLAUDE.md is really four things, and each one should live as its own section:

1. **Knowledge compression.** Instead of Claude reading every file in the workspace to answer "what was that file I made two weeks ago about X", the CLAUDE.md holds a highly succinct summary of what is in the folder and where it lives. Claude can reason at a bird's-eye level without going into the weeds. This saves tokens and time.
2. **Preferences and conventions.** Anthropic bakes more conventions into Claude Code with every release, but it lags behind what advanced users want. Your own preferences (how to return file paths, which language or paradigm to use, how to handle docs, debugging, updating itself) go here.
3. **Declaration of capabilities.** If a skill or tool exists in your workspace but the CLAUDE.md does not say so, Claude will often say "I don't have a built-in way to do this, want me to build it from scratch?" Claude also underestimates its own agency: it will quote "about 3 months" for a build it could do in minutes, or hand you a terminal command to paste instead of running it. The CLAUDE.md itemizes everything the agent can currently do and reminds it that it can act (run plans autonomously, call APIs, call the database, drive browsers).
4. **Log of failures and successes.** Every file and every working bit of code was hard-won with tokens and time. Writing the learnings back into the system prompt carves out the chunks of the solution space that have already been tried, so the next run skips roughly 80% of dead ends and spends effort on the 20% that matters.

**Two scopes.** Claude Code loads prompts from several places on initialization. The two that matter:

- **Global (user scope):** `~/.claude/CLAUDE.md`. Loaded on every session in every workspace. On Mac this is in a hidden `.claude` folder in your home directory (show hidden files with Shift+Cmd+Period in Finder).
- **Local (project scope):** `CLAUDE.md` in the repository root (Nick also mentions one inside a `.claude` folder in the repo). Loaded when you work in that folder.

When Nick says "system prompt" he means both together.

**What goes where:**

| Global CLAUDE.md (high-level reasoning and personal beliefs) | Local CLAUDE.md (low-level project knowledge) |
|---|---|
| A profile of who you are and your goals (so Claude stops optimizing for the wrong thing, like cost when you want time) | Compressed map of the workspace from `/init`: what is where, why it was built, purpose of the workspace |
| Reasoning strategies you personally use and understand | Project description and low-level preferences |
| Communication style | Specific API docs and usage (he keeps the entire GoHighLevel API docs inside the project so Claude never has to spawn a research subagent) |
| Global preferences: "return absolute file paths", "always use Rust", "object-oriented" | Capabilities within this project |
| Agency reminders: "you can actually do X, Y, Z yourself" | Build, dev, lint, deploy commands |
| Token conservation strategies: "docs first before trying an unfamiliar API", "use Chrome DevTools MCP if docs are JS-rendered" | Lab notes of what not to try again in this project |

The global file is injected on every run, so keep it dense. The local file compresses project knowledge so Claude does not re-read the codebase.

## Step by step

1. Decide which scope a line belongs to. Ask: "Would I want this in every conversation, in every folder?" If yes, global. If it is about this project's files, APIs or commands, local.
2. Open or create `~/.claude/CLAUDE.md`. Give it four sections: Profile, Reasoning and interaction rules, Capabilities and agency, Token conservation.
3. In the project, run `/init` to generate the local CLAUDE.md (see `cca-local-learning-loop` for the full loop). Add sections for Preferences, Capabilities and Lab notes beneath the generated summary.
4. Under Capabilities, enumerate every skill, MCP server, API, database and automation Claude has access to in that workspace, with a one-line description and where it lives.
5. Under Agency, write explicit reminders: "You run commands yourself. Do not hand the user a CLI command to paste. When estimating time, assume you are doing the work, not a human team."
6. Keep each bullet high information density. Nick's example: a 827-word component (about 1,100 tokens) summarized as a 22-word line, a roughly 45x compression.
7. Re-read the file for contradictions between rules (Nick caught "don't fetch well-known sites" fighting "always read the docs"). Remove one.

## Templates / prompts

Global `~/.claude/CLAUDE.md` skeleton:

```markdown
# Global CLAUDE.md
This is inserted at the beginning of every conversation across all of Caleb's workspaces.

## Profile
Caleb Jackson, REALTOR with Keller Williams First Choice in St. Francisville / Baton Rouge, Louisiana.
Builds AIRE, an AI real-estate agent system. Non-engineer power user of Claude Code.
Priorities: trade money for time. Do not pick the cheapest option by default, pick the fastest reliable one.
Voice: warm, direct, natural. No em dashes, no corporate filler.

## Reasoning and interaction rules
- Return absolute file paths so I can click them.
- Don't overexplain, overengineer, or add unrequested improvements.
- When making widespread changes to one file, use one write instead of many sequential edits.
- Before using any non-trivial platform or API you don't already have context on, look up the documentation first.

## Capabilities and agency
- You can run commands, call APIs, query databases, and drive a browser yourself. Do not ask me to paste commands.
- When estimating how long something takes, assume you are the one building it.
- Skills live in .claude/skills. Read the relevant SKILL.md before saying you can't do something.

## Token conservation
- Read CLAUDE.md before searching the workspace.
- Docs first: the tokens spent reading docs save many more tokens spent on things that don't work.
- If an MCP or browser tool fails twice, stop and ask instead of retrying.
```

Local `CLAUDE.md` section layout (below whatever `/init` generated):

```markdown
## Project purpose
One paragraph: what this workspace is for and who it serves.

## Where things live
- .claude/skills/  reusable SOPs
- active/          generated files, research, outputs
- .env             keys (never read or display)

## Commands
dev: ...   build: ...   lint: ...   deploy: ...

## Capabilities in this project
- Skill: aire-lead-followup (.claude/skills/aire-lead-followup) drafts follow-up texts from CRM rows
- API: Follow Up Boss docs cached at docs/fub-api.md

## User preferences
- When I say "open the app", run the dev server AND open it in Chrome.

## Lab notes: what not to do
- (append as failures happen)
```

## Pitfalls Nick calls out

- Do not bake opinions into a CLAUDE.md before you have developed without one for a while. Claude is very good out of the box and you need to see where it actually struggles.
- Long context degrades quality, not just cost. A bloated CLAUDE.md works against you on every single query.
- Without a capabilities section, Claude will offer to rebuild things you already have.
- Claude underestimates its own agency. Say explicitly that it does the work.
- Rules can contradict each other. A human has to read the file and reconcile them.
- Recorded as Nick said it: token prices were rising and he expected them to keep rising. Prices may have changed.

## How Caleb should use this

- Global file: put the Caleb profile above so every conversation knows he is a REALTOR building AIRE, prefers speed over cost, and writes in a warm direct voice.
- AIRE workspace local file: list every AIRE skill, the CRM or MLS data sources it can touch, and the exact commands to run the dashboard, so Claude never says "I don't have a way to pull your leads."
- Add an agency reminder that Claude can draft the listing email, build the open house landing page, or query the lead list itself. Anything that actually sends a message or publishes needs Caleb's approval before running.
- Keep brokerage-specific low-level knowledge (Keller Williams tools, local MLS quirks, transaction checklists) in the AIRE project file, not the global one.
- Keep client or transaction specifics out of the global file entirely.

## Verification

- Run `/context` in a fresh session. The system prompt share should be small (Nick's was 0.6% before, 0.2% after relying on CLAUDE.md for a lookup).
- Ask a workspace question ("what are my opinions on dark mode", "what skills do I have for lead follow-up"). Claude should answer from CLAUDE.md without an agentic search.
- Ask Claude to do something a listed skill covers. It should use the skill, not offer to build from scratch.
- Grep the file for two rules that conflict. There should be none.
