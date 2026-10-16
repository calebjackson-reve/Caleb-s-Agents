---
name: cc-claude-md-project-brain
description: Writes, initializes and prunes a CLAUDE.md "project brain" file the way Nick Saraev teaches it, including /init, the 200 to 500 line rule, primacy ordering and the three layers (global, project, enterprise). Use when Caleb says "set up a CLAUDE.md", "init this folder", "Claude keeps making the same mistake, add it to the rules", "my CLAUDE.md is bloated", or starts a new AIRE module, listing-site build or lead follow-up workspace that needs a brain file.
---

# CLAUDE.md as the Project Brain

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 8, 9 and 13 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=1441s and https://www.youtube.com/watch?v=QoQBzR1NIqI&t=3313s)

## What Nick teaches

A conversation with Claude is a chain: user, model, user, model. What most people miss is that before the very first user message there is a hidden prompt injected at the top of the chain. That hidden prompt is `CLAUDE.md` (capital CLAUDE, lowercase md) sitting in the workspace folder. Because it is the first thing the model reads and internalizes, it steers everything that follows.

Nick's ship analogy: if you sail from the east coast of North America to the west coast of Africa and your rudder barely turns, you have to be dead accurate when you leave port. A one degree error at the dock becomes hundreds of miles at the destination. CLAUDE.md is your launch angle. It compresses the wide fan of ways Claude could go into a narrow band of likely-good outcomes, so even a slightly imperfect prompt lands close.

Key facts he gives:

- You could paste the same text at the start of every chat and delete the file. The file only exists so you never have to.
- It costs tokens on every single session, so write it as "high information density": bullet points, short headings, no voice-dump prose.
- Primacy and recency bias: the model remembers the beginning best, the end second, and the middle worst. Put hard guardrails ("never delete X") at the very top.
- Target 200 to 500 lines. Never exceed 500.
- Treat it like technical debt. Review and prune periodically. If you let Claude keep appending to it, it accumulates over-precise rules and starts changing how it talks to you.
- Run `/init` first in any new folder. It reads the codebase, summarizes architecture, deploy steps and conventions, and writes CLAUDE.md in the workspace root (not inside `.claude/`). Nick calls "just having a description of how the folder works" 90% of the battle.
- Why summarize what Claude could read anyway? Because without it Claude re-reads every file every session (100K tokens instead of 10K), quality drops as prompts get longer, and you pay more.
- `@include` syntax: writing `@git.md` inside CLAUDE.md pulls that file in. Nick says the `rules/` folder mostly replaces this and he avoids includes unless necessary.
- His favorite line when Claude repeats a mistake two or three times: "Add this to your CLAUDE.md so it works next time on a fresh instance."
- Where to get good CLAUDE.md ideas: not by asking Claude to "write rules for efficient coding" (it does a poor job). Instead ask Grok on X: "Compile the last month of high ROI CLAUDE.md writings. What are the best things to include?" Power users live on X and the tips move fast.
- Newer models already absorb the most common CLAUDE.md conventions, so you can drop rules you needed for older models.

Three layers merge together, in precedence order:

1. Personal global: `~/.claude/CLAUDE.md` (applies to every workspace on the machine).
2. Per project: `./CLAUDE.md` or `./.claude/CLAUDE.md` in the workspace.
3. Enterprise managed (system level, for enterprise licenses, which Nick skips).

Related file: `memory.md` (auto memory). If you tell Claude "remember my brother's name is George" it writes to a global memory file that is also injected at the top of every session. Nick treats it as Claude's own notes, not your instruction set, and says it is small in practice (88 tokens in his `/context` readout).

## Step by step

1. Open the workspace folder in the terminal or IDE and run `/init`. Let it finish. Read what it wrote.
2. Move the top three guardrails to the first lines of the file (files never to touch, data never to send, approvals always required).
3. Rewrite everything else as bullets under short headings: What this workspace is, Architecture, How to run and deploy, Conventions, Workflow.
4. If Caleb voice-dumped context, feed the transcript to Claude and say "turn this into a very high information density summary of rules" before pasting anything in.
5. Count lines. If over 500, split task-like sections into `.claude/rules/` files or skills (see `cc-claude-directory-rules` and `cc-skills-sop-to-skill`).
6. Each time Claude repeats a mistake, append one specific rule. Each month, prune anything that no longer earns its tokens.
7. Keep `~/.claude/CLAUDE.md` for things true everywhere (Caleb's name, brokerage, voice rules, approval rules) and keep project files for project specifics.

## Templates / prompts

Starter CLAUDE.md for an AIRE workspace:

```markdown
# AIRE Lead Follow-Up Workspace

## Hard rules (read first)
- Never send an email, text or CRM update without Caleb's explicit approval in this session.
- Never delete or overwrite files in /data/clients. Create new files instead.
- Caleb Jackson is a REALTOR with Keller Williams First Choice, St. Francisville / Baton Rouge, LA. Comply with Louisiana real estate advertising rules: brokerage name on every outward-facing piece.

## What this workspace is
- Scripts and templates that draft follow-ups for buyer and seller leads from the CRM export in /data.
- Output goes to /drafts as markdown. Nothing is sent from here.

## How to run
- `python scripts/draft_followups.py --since 7d` writes drafts.
- Tests: `pytest tests/`.

## Conventions
- Voice: warm, direct, plain English. No em dashes. No corporate filler.
- Every draft ends with Caleb's signature block from /templates/signature.md.

## Workflow
- Plan first for anything touching more than two files.
- Task, do the task, verify the result (open the output and check it) before reporting done.
```

Prompts Nick uses:

```text
Add this to your CLAUDE.md so that this works the next time I run it on a fresh instance of Claude.
```

```text
Turn this voice transcript into a very high information density summary of rules and context for a CLAUDE.md. Bullets and short headings only. Most important guardrails at the top.
```

Grok / X research prompt:

```text
Compile the last month of high ROI CLAUDE.md writings from Claude Code power users. What are the best things to include right now?
```

## Pitfalls Nick calls out

- Dumping whole style guides or API docs (for example a full PandaDoc API reference) into CLAUDE.md. That is 10,000 tokens on every session. Instead ask Claude which endpoints you actually need and keep only those.
- Vague aspirational rules like "be smart" or "make no mistakes". Claude cannot act on them. Give it the specific slice.
- Letting Claude continuously self-edit the file without pruning.
- Voice-dumping straight into the file. Compress first.
- Expecting `/init` to put the file in `.claude/`. It writes to the root. Move it yourself if you want the folder layout.

## How Caleb should use this

- Run `/init` in every AIRE repo and every one-off project folder (listing microsite, open house sign-in app, CRM cleanup scripts) before the first real prompt.
- Put a global `~/.claude/CLAUDE.md` with Caleb's identity, brokerage, Louisiana disclosure rules, voice rules and the standing rule that nothing is sent externally or purchased without approval.
- Add a top-of-file guardrail in any workspace that touches client data: never email, text, post or charge without Caleb's approval before running.
- When Claude keeps formatting MLS remarks or follow-up texts wrong, say the magic sentence and let it write the rule itself.
- Monthly: open each CLAUDE.md, delete what is stale, and confirm it is under 500 lines.

## Verification

- `/context` shows the system prompt (CLAUDE.md plus rules) as a small share of the window, not tens of thousands of tokens.
- A fresh session can answer "how do I run and deploy this project?" correctly without reading files.
- The repeated mistake stops happening on the next fresh instance after the rule is added.
- `wc -l CLAUDE.md` is between roughly 200 and 500, and the first ten lines are the guardrails.
