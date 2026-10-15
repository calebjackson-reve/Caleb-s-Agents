---
name: mk-claude-desktop-workspace-setup
description: Sets up and operates the Claude desktop app's Code tab the way Nick Saraev runs a marketing workspace: permission modes, model and effort choice, context-window hygiene, usage limits, /btw, /loop, /usage, voice dictation, folders, and the CLI alternative. Use when Caleb is onboarding a new machine or teammate for AIRE, asks "which mode should I use", "why did Claude stop and ask me", "I hit my usage limit", "how do I check what this cost", "should I use Fable or Sonnet for this", or "how do I run two things at once".
---

# Claude Desktop (Code tab) workspace setup and daily operation

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 2 and 3 (https://www.youtube.com/watch?v=yulWjh3rq28&t=210s and &t=474s)

## What Nick teaches

### Install (ch. 2)
1. claude.com -> Continue with email/Google -> onboarding -> choose **personal use**.
2. You must pay to use the Code product (Nick pays ~$24 CAD/month and calls it his number one investment). Free Claude cannot use Code.
3. Download for your OS. Chrome may block the file ("download unverified file"). On Mac drag to Applications. Log back in with the emailed code.
4. In the app, switch from **Home** to **Code** (two products. The course uses Code only).

### The interface (ch. 3), the parts that matter
- **Sidebar**: search chats, Artifacts (web pages Claude builds. Share "anyone with link" to host dashboards/client pages for free), Customize (skills, connectors, plugins, memory), More -> **Routines**, folders/projects.
- **Environment button**: Local (your machine) vs Cloud (Anthropic's machine) vs Remote Control vs SSH. Course uses Local and Cloud. The gear icon next to each opens **environment variables** = where you store API keys and credentials (see `mk-connect-tools-keys-and-connectors`).
- **Permission modes** (bottom left):
  - Manual: asks before everything. Nick: don't.
  - Accept edits: can edit existing files, cannot create/delete.
  - Plan: writes a plan, changes nothing.
  - **Auto**: handles most permission decisions, asks only for scary stuff. Nick's default recommendation.
  - **Bypass permissions**: never asks. Nick uses it for marketing work because nothing is sensitive. Requires a one-time opt-in.
- **Attach files/folders**: drop images, CSVs, or an entire folder (whole folder becomes context).
- **Slash commands**: `/` lists everything, including skills (`anthropic-skills:morning`). Ones Nick highlights:
  - `/btw` opens a side chat with full thread context without interrupting the main run.
  - `/usage` shows the 5-hour window %, weekly limit %, session cost, token breakdown, and which skill consumed limits.
  - `/loop` runs a prompt or skill on an interval (one-minute floor). Say "stop the loop" to cancel.
  - `/schedule` exists (used later for cron loops).
- **Escape / stop button** halts a run that is stuck repeating.
- **Voice**: hold Cmd+D (or the mic). Nick prompts mostly by voice because speaking is 3 to 4x faster than typing. Brain-dump context this way.
- **Model picker**: Fable 5 (best, needed usage credits on his plan), Opus 5, Sonnet 5, Haiku 4.5. Nick used Sonnet 5 for most of the course, Opus 5 when it kept erring, and Fable 5 on **high** for design-heavy work (dashboard), buying $20 of credits for it.
- **Effort slider**: low is fast (seconds) and guessy, high/ultra re-checks everything (minutes). Nick defaults to medium or high. "Sonnet high works quick with good results."
- **Context window** (bottom right): messages, system tools, system prompt, MCP tools, skills, memory files all count. Sonnet 5 had 967k tokens. Claude compacts when full. Nick's sweet spot: keep a thread under ~500k. Past that performance drops and usage burns faster.
- **Top right**: terminal, diff, built-in browser (Claude opens it to tune pages), iOS simulator, rename, transcript/summary, fork, archive, delete.
- **Status dot** on a session turns from gray to yellow/green when it needs you. Nick fires off 15 to 20 minute tasks and works elsewhere.
- **CLI alternative**: in a terminal run `claude --verbose` inside the project folder. Same product, different "browser". Nick prefers CLI for dev work, desktop app for simplicity.

### Usage limits
Plans give a 5-hour rolling window and a weekly limit. Hit 100% and you wait for the reset. Nick blew through limits recording the course in a day and bought credits. A normal user won't.

## Step by step

1. Install the desktop app, log in, click **Code**.
2. Create a project folder for the work (Nick used "for YouTube". Caleb should use a folder per business area, e.g. `aire/`, `kw-marketing/`).
3. Set mode to **Auto** (or Bypass for pure content work with no credentials at stake).
4. Set model Sonnet + effort high for everyday tasks. Switch to the top model for design, architecture, or anything that failed twice.
5. Connect needed connectors under Customize -> Connectors (Gmail, Drive, Slack, etc.) before running skills that need them.
6. Start every new system in a fresh chat. Archive or fork long chats before 500k tokens.
7. Check `/usage` before launching parallel subagents or big batches.
8. For unattended work, move to Routines (see `mk-prompt-skill-loop-routine-ladder`).

## Templates / prompts

Session-start checklist to paste into a new AIRE chat:
```
Context: I'm Caleb, REALTOR with Keller Williams First Choice (St. Francisville / Baton Rouge, LA),
building AIRE, my AI real estate assistant. Project folder: {{folder}}.
Mode: auto. Model: {{model}} / effort {{level}}.
Connectors available this session: {{list}}.
Today's single goal: {{goal}}.
Before doing anything that sends a message, posts publicly, or spends money, stop and ask me.
```

`/loop` usage example (from the course): `/loop 1m say hey Nick` . To stop: `stop the loop`.

## Pitfalls Nick calls out

- Interface changes often. Anthropic A/B tests buttons, so the same control appears in several places.
- Claude's tab autocomplete suggestions are right maybe 30 to 40% of the time. Don't let it drive.
- Long threads get confused and cost more. Compaction helps but start fresh for new builds.
- Memory stores personal facts (height, dog's name). It is also where you can seed business facts.
- Manual mode makes you check in every 5 seconds.

## How Caleb should use this

- Set up one shared cloud environment for AIRE so anything built on Caleb's Mac runs identically for a future assistant or partner agent.
- Seed Memory with KW First Choice facts (brokerage, market area, license info, brand voice, no em dashes) so every session starts right.
- Use `/btw` during long listing-creative runs to ask quick MLS or copy questions without stopping the batch.
- Use Artifacts to host client-facing pages (seller progress page, open-house sign-in, buyer dashboard). Sharing an artifact publicly **needs Caleb's approval** since it exposes content externally.
- Check `/usage` before a big UGC video batch. Model credits and video credits are separate costs.

## Verification

- Code tab opens to a project folder, mode shows Auto, chosen model/effort visible.
- `/usage` returns percentages. `/btw` opens a side panel. `/loop 1m` fires and "stop the loop" cancels it.
- A test artifact opens in the browser and (if shared) loads in an incognito window.
