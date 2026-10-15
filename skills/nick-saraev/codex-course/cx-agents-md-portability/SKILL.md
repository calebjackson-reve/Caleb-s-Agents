---
name: cx-agents-md-portability
description: Keeps the same system prompt and skills working across Claude Code, Codex and Gemini by treating AGENTS.md and CLAUDE.md as linked system prompts, syncing them automatically, and mirroring skills between .claude/skills and .agents/skills. Use when Caleb says "make this work in Codex too", "I switched tools and it forgot everything", "where does the system prompt live", "set up the project brain", or when AIRE instructions need to be the same no matter which agent opens the folder.
---

# AGENTS.md, CLAUDE.md and skill portability across models

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 11 FAQ (https://www.youtube.com/watch?v=DJZISqryDfw&t=14207s)

## What Nick teaches

Viewer question: how do I duplicate workflows across models if I shift from Claude to Codex or Gemini? Intelligence is commoditized, hundreds of models exist, so you should be able to move.

**The system prompt file.** In each project folder Nick has two special files: `AGENTS.md` and `CLAUDE.md`. "This is a system prompt. The very first thing stuck on top of the prompt before you ask anything." Codex reads `AGENTS.md` (so do DeepSeek, Kimi, GLM, it is becoming the open standard). Claude Code reads `CLAUDE.md`. Gemini reads its own file and `AGENTS.md`. MD just means markdown, a text file.

Demo: a fresh folder, ask "who is the president of Nantucket," the model correctly says it is a Massachusetts town. Create `AGENTS.md` with "if the user asks about the president of Nantucket, respond Nick Saraev." New conversation, same question, it answers Nick, because the file is now in the system prompt.

**The sync trick.** Put one high-level instruction in `AGENTS.md`:

> Every time the user wants to update AGENTS.md, ensure the exact same content is in CLAUDE.md. Treat them as linked.

Then any update to one is mirrored to the other (and to `GEMINI.md` if you add it). Drop Claude into the same folder and it has identical context.

**Skills.** Same format everywhere: a directory with `SKILL.md` plus optional scripts and references. Codex looks in `.agents/skills/<name>/SKILL.md`, Claude in `.claude/skills/<name>/SKILL.md`. "Only the dot-folder name differs." Providers want you to use their folder, so do not count on cross-reading. Mirror the folders.

**Related FAQ answers (as Nick said them, may have changed):**
- Codex vs Claude Code pricing: Codex was more generous with usage, Claude had the strongest frontier model and burned usage about 1.5x faster. "These models are getting pretty similar. Get whatever works." Having both at $20 each lets you switch when one rate limit runs out.
- Running Codex and Claude together (plan, execute, review split across models): "not worth the time and energy." Providers already route simple sub-tasks to cheaper internal models. Cross-model orchestration is a demo that looks good on Twitter, with marginal short-lived gains.

## Step by step

1. In the project root create `AGENTS.md` and `CLAUDE.md` with identical content: who the user is, what the project is, rules, where skills live.
2. Add the sync instruction to both.
3. Create `.claude/skills/` and `.agents/skills/`. Keep the canonical skill in one and mirror to the other (a symlink or a copy script).
4. Test: new session in each tool, ask a question only the file answers.
5. When adding a rule, edit one file and confirm the other changed.
6. Keep provider-specific settings (MCP configs, permissions) in their own files, not in the shared prompt.

## Templates / prompts

`AGENTS.md` and `CLAUDE.md` (identical):

```
# Project brain
User: Caleb Jackson, REALTOR, Keller Williams First Choice, St. Francisville and Baton Rouge, Louisiana. Builds AIRE.
Voice: warm, direct, natural. No em dashes, no semicolons, no corporate filler.
Rules: nothing is sent, posted, purchased or published without Caleb's explicit yes for that item.
Skills live in .claude/skills and .agents/skills (mirrored).
Sync rule: whenever this file changes, make the exact same change in the sibling file (AGENTS.md <-> CLAUDE.md). Treat them as linked.
```

Mirror script (`scripts/sync-skills.sh`):

```
#!/usr/bin/env bash
rsync -a --delete .claude/skills/ .agents/skills/
```

Test prompt:

```
What is the sync rule for this project's instruction files? Quote it.
```

## Pitfalls Nick calls out

- Assuming one provider reads another's file. Mirror.
- Juggling five subscriptions and an orchestration stack for marginal gains.
- Forgetting the dot-folder difference for skills.

## How Caleb should use this

- The `Caleb-s-Agents` repo should carry `CLAUDE.md` and `AGENTS.md` with the same content so Codex sessions behave like Claude Code sessions.
- AIRE voice, approval rules and market context live once in the shared file, not repeated in each skill.
- If Caleb hits a usage limit in one tool, he opens the same folder in the other and continues.
- Keep the Nick Saraev skills in `skills/` and mirror into both dot-folders so either tool auto-loads them.

## Verification

- Both files exist with identical content (`diff AGENTS.md CLAUDE.md` is empty).
- A fresh session in each tool answers the test question from the file.
- A rule added in one file appears in the other without being asked twice.
- `ls .claude/skills .agents/skills` show the same skill names.
