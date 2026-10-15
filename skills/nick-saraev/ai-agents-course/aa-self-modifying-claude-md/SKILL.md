---
name: aa-self-modifying-claude-md
description: Sets up a self-modifying, self-correcting CLAUDE.md (or AGENTS.md / GEMINI.md) with a numbered "Learned Rules" section that the agent appends to every time Caleb corrects it, so mistakes drop with every session. Use when Caleb says "stop doing that every time", "remember this for next time", "why does it keep making the same mistake", "set up my CLAUDE.md", "add a rule", or when starting a new project folder for AIRE, listing marketing, or client work and there is no CLAUDE.md yet.
---

# Self-Modifying CLAUDE.md (Learned Rules)

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapter 7
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=1543s)

## What Nick teaches

Every agent platform prepends a project file to the top of every conversation: `GEMINI.md` in
Antigravity, `AGENTS.md` in Codex, `CLAUDE.md` in Claude Code. It is literally as if you pasted the
whole file into the first message. Nick demoed it by writing "my name is Antonio Banderas, refer to
me as such, always sign off super kawaii desu" into an empty GEMINI.md and watching the next session
obey.

The reason this beats copy-pasting the same prompt is that you can build a **meta-prompt** into the
file: a growing list of lessons and learnings from previous sessions. Before the model signs off, it
updates the file. Flow:

1. New session starts. Agent reads GEMINI.md / CLAUDE.md.
2. You give a task ("build me a website").
3. It returns the work. You say "I don't like this, no dark mode."
4. Instead of just fixing the build, it also writes "no dark mode" as a rule into the file.
5. Next session reads the file, sees the rule, never makes that mistake again.

Errors relative to your preferences drop every session: high on session one, lower on two, lower
still on three, near zero by five. He calls this "a very, very high ROI design pattern" and
recommends it for business, personal and programming use. He has not hit the point where rules
become counterproductive, but guesses it would happen around a thousand rules stepping on each
other.

He also explains the **injection hierarchy**: a global CLAUDE.md (user-wide rules, lives in
`~/.claude/`) is injected first, then the local project CLAUDE.md, then skills, then your inline
prompt. Global holds wide preferences, local holds project specifics. This collapses a lot of
functionality into few tokens, which matters because cost and quality both get worse as context
grows.

## Step by step

1. Create or open `CLAUDE.md` in the project root (and optionally `~/.claude/CLAUDE.md` for global
   rules).
2. Paste the meta-prompt below at the top. Nick says a three or four line version works too.
3. Add an empty `## Learned Rules` section at the bottom.
4. Work normally. Every time you correct the agent, confirm it appended a numbered rule.
5. Periodically read the rules list. Merge duplicates, delete anything stale, move universal rules
   to the global file.

## Templates / prompts

Nick's meta-prompt (cleaned up from the transcript, keep the shape):

```
# Self-improving instructions

Before we start any task, read this entire file. This file contains a growing
rule set that improves over time. At session start, read the entire Learned
Rules section before doing anything.

## How it works
When the user corrects you or you make a mistake, immediately append a new rule
to the Learned Rules section at the bottom of this file. Rules are numbered
sequentially and written as clear imperative instructions.

Format: `N. [Category] Never/Always do X because Y.`

## When to add a rule
- When the user explicitly corrects your output.
- When the user rejects a file, approach or pattern.
- When you hit a bug caused by a wrong assumption.
- When the user states a preference.

## Examples
1. [Style] Never build applications in dark mode because the user prefers light themes.
2. [Process] Always ask before sending any email or text because the user must approve outreach.

## Learned Rules
(append below, numbered)
```

Short version:

```
Read the Learned Rules below before every task. When I correct you, append a
numbered rule here in the form "[Category] Never/Always X because Y." Never skip this.

## Learned Rules
```

Starter rules for Caleb's repo:

```
## Learned Rules
1. [Voice] Never use em dashes or semicolons because Caleb's writing voice avoids them.
2. [Brand] Always write "Keller Williams First Choice" in full on first mention because that is the brokerage name.
3. [Safety] Never send, post or spend without Caleb's approval because outreach and money need a human check.
4. [Area] Always default to St. Francisville and Baton Rouge, Louisiana market context because that is Caleb's market.
```

## Pitfalls Nick calls out

- Forgetting the file is in context every message. Long files eat tokens on every turn (he showed
  CLAUDE.md consuming about 4,900 tokens before a single message).
- Rules only help if the agent actually appends them. Check the file after a correction.
- A thousand overlapping rules would start to conflict. Prune.
- Mixing project-specific rules into the global file pollutes every other project.

## How Caleb should use this

- Put the meta-prompt in `/home/user/Caleb-s-Agents/CLAUDE.md` style project files so every AIRE
  session learns from corrections (tone of follow-up texts, how to format a CMA, which fields the
  CRM needs).
- Keep a global rules file for voice (warm, direct, no em dashes), brokerage name, and the "ask
  before sending" safety rule.
- Keep per-project rules local: listing-marketing folder learns photo and caption preferences,
  lead-gen folder learns list formats and county names.
- When onboarding a new assistant or VA to Claude Code, the Learned Rules section doubles as a
  written SOP of Caleb's preferences.

## Verification

- After you correct the agent once, open CLAUDE.md and confirm a new numbered rule appeared.
- Start a fresh session, give a task that would have triggered the old mistake, confirm the mistake
  does not recur.
- Run `/context` in Claude Code and confirm the CLAUDE.md token cost stays reasonable (a few
  thousand tokens, not tens of thousands).
