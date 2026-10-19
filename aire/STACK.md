# AIRE stack memory

The living record of which tool does which job. Skills read this file instead of asking Caleb. Update it when a tool changes, with the date. Newest decision wins.

Last updated: 2026-10-19

## Rule
Trade money for time. Pick the fastest reliable option. Every tool below is "current" unless marked "watch" (not adopted yet) or "retired".

## Models
| Job | Tool | Why | Since |
|---|---|---|---|
| Bulk and cheap: lead enrichment, listing data cleanup, tagging, first-pass drafts | Claude Haiku 5.5 | Cheapest fast Anthropic model, Oct 7 2026 | 2026-10-19 |
| Everyday drafting and client copy | Claude Sonnet 5.5 | Mid tier, cache pricing dropped in October | 2026-10-19 |
| Judgment, routing, anything Caleb reads before a client does | Claude Opus 5.5 or the Claude Code default | Top tier only where it matters | 2026-10-19 |
| Very long documents (contracts, inspection packets, HOA docs) | Gemini 4 Argon | 1M output, intro pricing through Nov 30 2026 | watch |
| Client-facing interactive calculators (net sheet, payment, rent vs buy) | ChatGPT GPT-6 Intelligent UI, or a Claude artifact | Interactive answers without building an app | watch |

## Where things run
| Need | Tool | Note |
|---|---|---|
| Inbox, calendar, docs | Google Workspace on calebjackson.org | Gmail AI Inbox arriving Oct 12 to 26 2026. Claude for Workspace sidebar in beta. |
| CRM | KW Command via Chrome extension | No API in use. Browser automation only. |
| Website and IDX | Luxury Presence, calebjackson.org | Changes through LP support, one case per topic. See lp-integration/. |
| Social scheduling and GBP analytics | Metricool | Drafts only, Caleb schedules. |
| Speed to lead | aire/speed-to-lead directive on the Mac | DRY_RUN until Caleb flips it. |
| Dashboards | Claude Dashboards beta | watch. Candidate: pipeline sheet to live view. |
| Short explainer video, no AI people | Claude Motion beta | watch. Candidate: monthly market update. |
| Generated video for ads | Kling 4.0 via Higgsfield | Disclose as AI-generated. Never for listing photos. |
| Community | Skool, AI for Agents group | See SKOOL-AI-FOR-AGENTS/ |
| Skill sync across ChatGPT and Claude | Notion 3.8 Skills API | watch. Only if a second assistant gets used daily. |

## Retired or avoid
- Custom GPTs. OpenAI is retiring them (Enterprise Dec 11 2026, other plans to follow). Build as a skill here instead.
- OpenAI Sora. Gone.
- GPT-4o and 4.1 API models. Shut down Jan 14 2027.

## Subscriptions in play
Confirm with Caleb before assuming any is paid: Claude Max (monthly API credits since Oct 7 2026), ChatGPT (plan unknown), Google Workspace (paid, needed for AI Inbox), Meta One (not subscribed, needed for Instagram feed links), Higgsfield (connected).
