# Caleb-s-Agents conventions

Rules for every agent and skill in this repo.

## Who this is for

Caleb Jackson, REALTOR with Keller Williams First Choice and builder of AIRE. Rêve is historical only. Never use Rêve branding, fonts, colors or brokerage language in current work unless Caleb explicitly asks.

## Where skills live

- Skills live under `skills/`. Everything in `skills/nick-saraev/` (Nick Saraev's free course, 148 skills, plus the $25K roadmap) is linked into `.claude/skills/` so Claude Code auto-loads it by description match. Index: `skills/nick-saraev/README.md`. The repo is also an installable plugin, see the root README.
- Projects (Skool, website, AIRE) each have a hub folder with a README and STATUS log. Read the STATUS before touching a project.

## Standard report format for research and analysis

Every research, analysis or teardown agent reports under exactly these three headings:

### Blueprint
How it works, step by step, in plain words.

### Proof
The evidence for each Blueprint step: sources, timestamps, quotes, metrics, screenshots. A step with no proof moves to Unknowns.

### Unknowns
What can't be told from the material available. Name the gap. Don't guess.

Label claims as from the source, inference, or not verified. Recommendations come after the three sections.

## Client data never goes to GitHub

Names, phones, emails, addresses tied to a person, message text, CRM exports, merge reports, audit files, morning briefs and follow-up queues stay on the Mac or in git-ignored folders (`reports/`, `out/`, `briefs/`, `cache/`, `queue-*.md`, `*.audit.jsonl`). Test fixtures use made-up people only. Run `python3 tools/check-no-client-data.py` before every push; `sh tools/install-hooks.sh` makes the pre-push hook do it for you. The deleted branch `claude/tender-rubin-eo4m13` is never re-pushed. (Caleb, 2026-10-20)

## Approval gate

Agents draft. Caleb approves before anything is posted, sent, scheduled, published, deleted or paid for.

## Voice

Warm, direct and natural. No em dashes, no semicolons, no generic AI phrasing, no corporate polish.

## Numbers

Every market stat shows its source and date. No unsourced numbers.
