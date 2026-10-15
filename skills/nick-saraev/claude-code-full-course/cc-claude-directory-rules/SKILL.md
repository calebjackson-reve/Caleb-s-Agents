---
name: cc-claude-directory-rules
description: Sets up the hidden .claude folder structure Nick Saraev walks through (settings.json, settings.local.json, CLAUDE.local.md, rules/, agents/, skills/, .mcp.json) and splits a long CLAUDE.md into focused rules files. Use when Caleb says "organize my .claude folder", "split CLAUDE.md into rules", "where do settings go", "keep my API keys out of GitHub", or when an AIRE repo has a CLAUDE.md creeping past a few hundred lines.
---

# The .claude Directory and Rules Files

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapter 13 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=3313s)

## What Nick teaches

A folder with a leading period is hidden in the file explorer by convention. Claude Code uses a hidden `.claude` folder, and inside it Anthropic has given you roughly 10 to 15 "buttons" to customize your instance beyond a bare CLAUDE.md. A fully loaded `.claude` folder looks like this:

```text
.claude/
  settings.json          team permissions and hooks (this is where Nick's chime hook lives)
  settings.local.json    same, but local only and git-ignored
  CLAUDE.md              project brain
  CLAUDE.local.md        git-ignored brain for private notes
  rules/                 split-out rule files
  agents/                subagent definitions
  skills/                skill folders
  .mcp.json              MCP server definitions
```

The `.local` convention: anything with `.local` in the name stays on your computer and is not pushed to GitHub. People use it for tokens, auth keys and anything sensitive that should not live in a cloud repo.

Two levels exist. The project level `.claude` lives inside the workspace. The global level lives at `~/.claude` (the tilde means your home folder, for example `/Users/nick`). It is organized the same way and its settings apply across every workspace. Nick describes companies where a director owns the global folder (high level rules like "never delete these folders", "refer to staff as X") and each team member owns their own project-level folder.

Rules folder: instead of one monolithic CLAUDE.md you define high level rule files that correspond to parts of a build. His example set: `code-style`, `testing`, `security`, `frontend`, and under frontend `react` and `styles`. Each is short, a couple of paragraphs or a list. The file title acts as the heading. Benefits he lists:

- Evolve the workflow rules without touching the design rules.
- Give teammates access to styles while you keep control of the top-down workflow.
- A 10,000 word CLAUDE.md becomes several small files, so you can see what you no longer need.

His live demo: he moved CLAUDE.md into `.claude/`, created `agents`, `skills` and `rules`, then told Claude: "Split CLAUDE.md into its component rules. Use the Claude Code rule specification if you don't know what that means." Claude read the spec, split the file into three rules (workflow, technical defaults, design rules) and the result was more compressed than the original.

He does not recommend asking Claude to invent "rules for efficient coding" from nothing. Source rules from power users on X or your own repeated mistakes.

His personal 80/20: just a CLAUDE.md, sometimes skills and agents. Do not over-build the folder before you need it.

## Step by step

1. In the workspace root create `.claude/` and move CLAUDE.md inside it (or leave it at root, both work).
2. Create `rules/`, `agents/`, `skills/` subfolders.
3. Prompt: "Split CLAUDE.md into its component rules. Use the Claude Code rule specification if you don't know what that means."
4. Review each rules file. Keep each one to a single concern and a few paragraphs.
5. Move any secrets or personal notes into `CLAUDE.local.md` or `settings.local.json`, and confirm `.gitignore` covers `*.local.*`.
6. Put machine-wide rules in `~/.claude/CLAUDE.md` and `~/.claude/rules/`.
7. Re-run `/context` to confirm the system prompt share went down, not up.

## Templates / prompts

Rules set for an AIRE project:

```text
.claude/rules/
  workflow.md          plan first, task-do-verify, when to ask Caleb
  compliance.md        KW First Choice name on all public copy, LA license disclosures, fair housing wording
  voice.md             warm, direct, no em dashes, no filler, sign-off block
  data-handling.md     client PII never leaves /data, no sending without approval
  frontend.md          listing pages mobile-first, brand colors, image sizes
```

`.claude/rules/compliance.md` example:

```markdown
# Compliance
- Every outward-facing piece (listing page, email, text, social post) names Keller Williams First Choice.
- Use fair housing safe language. No references to protected classes or neighborhood demographics.
- Never state square footage or price as fact unless it comes from the MLS record in /data.
```

Split prompt (verbatim from Nick):

```text
Split CLAUDE.md into its component rules. Use the Claude Code rule specification if you don't know what that means.
```

## Pitfalls Nick calls out

- Building every folder on day one. Most of his own workspaces are just a CLAUDE.md.
- Putting tokens in files that get pushed to GitHub. Use `.local` variants.
- Asking Claude to generate generic best-practice rules. It produces fluff.
- Forgetting the global folder exists and duplicating the same rules in every project.

## How Caleb should use this

- One global `~/.claude` with identity, brokerage, compliance and approval rules so every AIRE and side project inherits them.
- Per-project `.claude/rules/` for things that differ: the listing-site project gets frontend rules, the CRM project gets data-handling rules.
- Keep MLS credentials, CRM API keys and Supabase keys in `settings.local.json` or `.env`, never in CLAUDE.md.
- When a rules file is about a repeatable task (like "how to draft a just-listed email"), it is really a skill. Move it to `.claude/skills/`.

## Verification

- `ls -la .claude` shows the expected folders and `git status` does not list any `.local` files.
- `/context` shows the rules files under the system prompt category and the total is lower than before the split.
- A fresh session follows a rule from a rules file without being told (test with a small request that touches it).
