# Caleb's Agents

Every skill I have built with Claude, collected in one place and started fresh on September 24, 2026.

A skill is a folder with a `SKILL.md` that tells Claude what the job is, what it may read, what it may never do on its own, and how to tell when it worked. Some folders also carry a `policy.md` (the step by step procedure), a `schema.json` (the shape of the output) and a `cases/` folder (test cases to run the skill against).

## What is here

Twelve skills, all written between August 24 and September 2, 2026. They come in two families.

### Reasoning skills (the AIRE contracts)

These six are the reasoning seats inside AIRE, my private chief of staff system. Each one is a contract: the business question, the exact inputs, the allowed sources, the human authority boundary, failure recovery, and the bar a version has to clear before it is promoted. AIRE's own code reads them, so they do not carry the YAML frontmatter that Claude Code and claude.ai look for. The `brain/` modules they mention live in the AIRE repository, not here.

| Skill | Business question |
|---|---|
| `daily-executive-planning` | Given every transaction, relationship, promise, deadline and calendar constraint, what is the best plan for my day, and why is it better than the alternatives? |
| `relationship-strategy` | For one important person, what is open between us, what is unanswered, how is the relationship moving, and what is the right next move? |
| `transaction-strategy` | For each live transaction file, what is the verified state, what is on the critical path, who is silent, what could fail, and what is the next best action? |
| `conversation-actions` | Given a recent text or email thread, what work does the conversation itself ask for: appointments, deadlines, follow ups, promises, documents owed? |
| `conversation-drafting` | Given a message that needs a reply, what reply in my own voice answers it without inventing anything? |
| `promise-drafting` | For each promise I made in a text and have not kept, what short message in my voice would keep it? |

### Operational patterns (runbook skills)

These six are Claude format skills with `name` and `description` frontmatter. Each one captures an exact code pattern for a job on my Mac and names the failure it prevents. AIRE archived them on September 1 when it cleaned up its repo root, but they are still the working patterns.

| Skill | What it does |
|---|---|
| `keychain-secrets` | Store and read local secrets with the macOS `security` CLI, accepting new values only through a hidden prompt. |
| `kw-command-import` | Stage Keller Williams Command contact imports from the official two row CSV template without breaking the header rows. |
| `launchd-scheduling` | Install macOS launchd calendar jobs and prove the schedule from live launchd state, not from the plist you wrote. |
| `safe-imessage-read` | Read the Apple Messages database from a consistent read only snapshot that includes the WAL. |
| `second-brain-learning` | Operate AIRE's bounded outcome learning loop from receipts without granting it any new authority. |
| `staging-canary-swap` | Refresh a live SQLite app through a verified backup, a staging copy, deterministic canaries and an atomic swap. |

## Where they came from

Confirmed facts:

- Source: the private `relationship-brain` repository (AIRE), commit `31eaac6` from September 3, 2026.
- The reasoning skills were copied from `skills/`. They were first committed on September 1 and 2, 2026.
- The operational patterns were copied from `docs/archive/operational-patterns/`. They were first committed on August 24, 2026 and moved to the archive on September 1.
- Every skill file was copied byte for byte. Nothing was rewritten.
- The copy was scanned before it entered this public repository. It holds no client names, phone numbers, email addresses, street addresses or secrets. Every test fixture uses placeholder people such as "Buyer Fixture" and placeholder addresses on "Fixture Lane". The five historical cases hold counts only.
- No other custom skills were found in the other repositories pushed since July 15, 2026, in the skills synced to my claude.ai account, or in Google Drive.

## Using a skill

- Claude Code: copy a folder into `.claude/skills/` inside a project, or into `~/.claude/skills/` to have it in every project. The six operational patterns load as is. The six AIRE contracts need a frontmatter block with `name` and `description` added first.
- claude.ai: zip a folder and upload it as a custom skill in Settings.

## Adding a new skill

Make a folder under `skills/` named in lowercase with hyphens. Put a `SKILL.md` in it with `name` and `description` frontmatter. Add `policy.md`, `schema.json` and `cases/` when the skill has a procedure, an output shape or tests worth keeping.

## Commit guard

`scripts/pii_scan.py` is the same guard AIRE uses. It refuses client data, secrets, databases, backups and oversized files. Turn it on once per clone:

```
git config core.hooksPath .githooks
```

Run it by hand any time with `python3 scripts/pii_scan.py --all`.
