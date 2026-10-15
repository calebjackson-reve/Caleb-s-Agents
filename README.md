# Caleb-s-Agents

All the agents and skills Caleb Jackson has built in Claude. One repo, usable from both Claude Code and claude.ai chat. Repo conventions (report format, approval gate, voice) live in [`CLAUDE.md`](CLAUDE.md).

## Use from Claude Code (any folder, any machine)

Install once and every skill loads automatically by description match:

```
/plugin marketplace add calebjackson-reve/Caleb-s-Agents
/plugin install caleb-skills --marketplace calebjackson-reve/Caleb-s-Agents
```

Or open this repo as a project. The `.claude/skills/` folder links every skill in, so they load without installing anything.

## Use from claude.ai chat

Chat takes one zip per skill. Ready-made zips for the most useful ones are in `chat-skills/`. Upload them at Settings, Capabilities, Skills. To bundle any other skill:

```
cd skills/nick-saraev/<course> && zip -r <skill-name>.zip <skill-name>
```

## Skills

| Skill | What it does |
|---|---|
| [Nick Saraev course skills](skills/nick-saraev/README.md) | 148 skills from Nick Saraev's free courses plus the $25K roadmap. Summary in [`REPORT.md`](skills/nick-saraev/REPORT.md). |
| [`brand-consistency`](skills/brand-consistency/SKILL.md) | Audit and fix Caleb's public identity and search visibility. |
| [`teardown-tuesday`](skills/teardown-tuesday/SKILL.md) | Weekly review: pulls Metricool results, tears down the best and worst post, drafts two hooks for next week. Drafts only. |
| [`teardown`](skills/teardown/SKILL.md) | Reverse engineers a reel, listing presentation, page, sequence or software feature into a Blueprint, Proof and Unknowns report, then drafts two original versions for my business. |

## Projects

| Project | What it is |
|---|---|
| [**SKOOL AI FOR AGENTS**](SKOOL-AI-FOR-AGENTS/README.md) | Project hub for the free Skool community: status log, shot board for every video, and links to the plan, scripts and research. Start here for anything Skool. |
| [Speed to lead](aire/speed-to-lead/DRY-RUN-2026-10-15.md) | AIRE responder for website inquiries: dry run, directive and templates. |
| `global-claude-md/` | The global CLAUDE.md for Caleb's machine, with the install line. |

## Programs

| Program | What it is |
|---|---|
| [AI for Agents](programs/ai-for-agents/PLAN.md) | 90-day launch to 100 free Skool members: foundation and values, production playbook, 7-day challenge with scripts, 10 beginner lessons, Skool research and invite drafts. |

## Lessons

| Lesson | Source | Files |
|---|---|---|
| Reverse Engineer Everything | [YouTube video on the REA tool](https://www.youtube.com/watch?v=dAzs_rU6080) | [Lesson plan](lessons/reverse-engineer-everything/LESSON.md) · [Viewable page](lessons/reverse-engineer-everything/lesson.html) |
| The Floor Is Rising | Video on why AI automation won't last forever | [Lesson plan](lessons/the-floor-is-rising/LESSON.md) |

## Setup

Run `scripts/setup-local.sh` once on your computer. After that, type `aire` to start Claude with Chrome and Remote Control.

Other folders: `audits/` dated audit runs, `architectural-preview/`, `motion-kit/`, `lp-integration/` website and Luxury Presence work.
