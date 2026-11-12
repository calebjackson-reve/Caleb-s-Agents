# AIRE stack memory

The living record of which tool does which job. Skills read this file instead of asking Caleb. Update it when a tool changes, with the date. Newest decision wins.

Last updated: 2026-11-12 (Claude Code model plan: Haiku / Sonnet / Opus / Fable)

## One system (Caleb, 2026-10-19)
Google Workspace is the only database and the only place data lives. Sheets is the database, Gmail the outbox, Calendar the schedule, Drive the files. KW Command stays because the brokerage requires it; the Mac companion reads it and the sheet mirrors it. Claude Code is the engine, this repo is where the code lives. No Supabase, no Airtable, no BoB Tools, no second database of any kind. A tool is added only if a paid subscription already covers it or nothing we pay for can do the job.

## Rule
Trade money for time. Pick the fastest reliable option. Every tool below is "current" unless marked "watch" (not adopted yet) or "retired".

## Models
Always pass `--model` and `--max-budget-usd` on Claude Code runs. Never omit `--model`: the current Claude Code default is Fable 5.2, which is expensive. Never put Claude Code on the Mac mini's scheduled jobs (LaunchAgents); those stay plain Python.

| Job | Tool | Why | Since |
|---|---|---|---|
| Matching, classification, log checks, small fixes, first-pass cleanup, cheap tagging and data cleanup | Claude Haiku 5.5 (`--model haiku`) | Cheapest token model that fits | 2026-11-12 |
| Everyday Pipeline builds, UI, refactors, and draft PRs | Claude Sonnet 5.5 (`--model sonnet`) | Mid tier. Default for almost all builds | 2026-11-12 |
| Hard architecture or a review after Sonnet already failed | Claude Opus 5.5 (`--model opus`) | Only if Sonnet failed. Atlas can also review instead | 2026-11-12 |
| Creative work only: brainstorms, design, draft wording | Claude Fable 5.2 (`--model fable`) | Do not use Fable for ordinary builds | 2026-11-12 |
| Hard drafts Caleb escalates (upset client, price talk, long silence) and phone calls | Grok bot, through the Pipeline bridge | Calling is built into Grok. Only on Caleb's press. | 2026-11-10 |
| Scoring, due lists, caps, next move rules | No model, plain code | Free and repeatable. A model is called only when a rule cannot answer. | 2026-11-10 |
| Very long documents (contracts, inspection packets, HOA docs) | Gemini 4 Argon | 1M output, intro pricing through Nov 30 2026 | watch |
| Client-facing interactive calculators (net sheet, payment, rent vs buy) | Claude artifact, published from this repo | Interactive answers without building an app | 2026-10-19 |

## Where things run
| Need | Tool | Note |
|---|---|---|
| Inbox, calendar, docs | Google Workspace on calebjackson.org | Gmail AI Inbox arriving Oct 12 to 26 2026. Claude for Workspace sidebar in beta. |
| CRM | The AIRE CRM Google Sheet (1w9izcliqmXlFR3_O3dnP2G5SGfCrua7mrCLCE7cdoDc), engine in aire/crm | One CRM, 3,626 contacts, created Oct 16 2026. Mac scripts, the Pipeline app and aire/crm all read and write it with the same gates. KW Command stays because the brokerage requires it; read only through the Mac companion. No second CRM, no renaming of sheets (Caleb, 2026-10-19). |
| Website and IDX | Luxury Presence, calebjackson.org | Changes through LP support, one case per topic. See lp-integration/. |
| Social scheduling and GBP analytics | Metricool | Drafts only, Caleb schedules. |
| Speed to lead | aire/speed-to-lead directive on the Mac | DRY_RUN until Caleb flips it. |
| Running AIRE on the Mac | Apple Terminal with Claude Code | Free, built in. Every Mac-side tool starts here. |
| Briefs, X and public social reads, hard drafts, phone calls | Grok bot | Caleb lifted the reading-only rule on 2026-11-10. Grok may see client data and write hard drafts. It never sends a text or email: Pipeline is the one sender. A call dials only after Caleb taps Grok's own Call card. Contract: `aire/pipeline-app/CONTRACT-grok-bridge.md`. |
| Notes and memory | Obsidian vault on the Mac, an AIRE folder inside it | Notes layer only (Caleb, 2026-11-10). The Sheet stays the system of record. The vault is outside this repo and never pushed. |
| Dashboards | aire/command-center on the Mac, reading the Google Sheets | Phone view later: a Claude Dashboard over the same sheet, never a second database. |
| Daily view | Pipeline (`aire/pipeline-app/`, local Python server plus a Jarvis-style screen, rebuilt 2026-10-22), reading aire/crm/feed.json | Caleb's one daily tool (2026-10-19). The command center web app was rejected as the front end; improve Pipeline, never build a parallel dashboard. One live host (Caleb, 2026-11-10): the Mac mini is the only Mac that sends, set with `PIPELINE_LIVE_HOST`. The MacBook Air is a second checkout and never sends. |
| Short explainer video, no AI people | Claude Motion beta | watch. Candidate: monthly market update. |
| Generated video for ads | Kling 4.0 via Higgsfield | Disclose as AI-generated. Never for listing photos. |
| Community | Skool, AI for Agents group | See SKOOL-AI-FOR-AGENTS/ |

## Retired or avoid
- Supabase. Schema removed 2026-10-19. Sheets is the database.
- Airtable. Never adopted.
- BoB Tools. Connected but unused, overlaps Sheets. Disconnect.
- ChatGPT, all of it (chat, Codex, custom GPTs). Cancelled by Caleb 2026-10-19. Nothing it does better than Claude is needed here: images and video are Higgsfield, calculators are Claude artifacts, coding is Claude Code.
- Custom GPTs. OpenAI is retiring them (Enterprise Dec 11 2026, other plans to follow). Build as a skill here instead.
- OpenAI Sora. Gone.
- GPT-4o and 4.1 API models. Shut down Jan 14 2027.

## Subscriptions in play
Confirm with Caleb before assuming any is paid: Claude Max (monthly API credits since Oct 7 2026), ChatGPT (cancel, 2026-10-19), Google Workspace (paid, needed for AI Inbox), Meta One (not subscribed, needed for Instagram feed links), Higgsfield (connected).
