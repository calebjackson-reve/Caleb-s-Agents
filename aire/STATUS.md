# AIRE status log

Newest first. Every entry says what was done, what it was based on, and what needs Caleb.

## 2026-10-19, evening: week 2 built

**Done**
- Merged the week 1 checklist. Built week 2 the same day on Caleb's say-so.
- Seller net sheet calculator at `aire/calculators/net-sheet.html`, in the site's paper, ink and coral tokens. Proven in a headless browser: math matches hand calculation, no overflow at phone width, no errors. Preview at https://claude.ai/artifact/9nV9rkWA422LkAbX5AC31L.
- First bulk tier workflow at `aire/lead-enrichment/`: directive, `enrich.py` on Haiku 5.5 with JSON schema output, DRY_RUN default, sample CSV. Compiles. Not run against the API, no key in this session.
- `aire/rollout-2026-10/WEEK-2.md`: status, proof, the Meta One decision memo, and the two small checks.

**Inference**
- No enrichment pipeline existed, so "reroute to Haiku" became "build the first one on Haiku".

**Needs Caleb**
- Review the calculator defaults, then paste into the Sell page on Luxury Presence.
- Run the enrichment dry run on the Mac (one command in WEEK-2.md).
- Meta One yes or no. RealAssist market check. Facebook Your Algorithm.
- Week 1 switches are still open.

## 2026-10-19, afternoon: plan merged, week 1 started

**Done**
- Merged the rollout plan and the four skills into main.
- Wrote `aire/rollout-2026-10/WEEK-1.md`: the six week 1 switches with click paths, requirements, proof and sources.
- Created the scheduled task "AIRE Monday AI brief": every Monday 7:47 am Central, fresh session, runs `ai-weekly-brief`, opens a draft PR. First run October 26.

**Needs Caleb**
- Switches 1 to 4 in WEEK-1.md: install the Claude sidebar, check for Gmail AI Inbox, turn on Meet notes for the next consult, link the Console org in Max billing.
- List any custom GPTs (switch 6).

## 2026-10-19: October AI rollout plan and four auto-loading skills

**Done**
- Researched AI and major app releases Oct 6 to 19 and saved the brief with sources in `aire/ai-briefs/2026-10-19.md`.
- Wrote `aire/rollout-2026-10/PLAN.md`: five arenas (website, lead gen, touches, operations, agent offer), the rules that shape each, four weeks of order, definition of done.
- Created `aire/STACK.md` as the single memory of tool choices so skills stop asking.
- Added four skills that load by description: `ai-weekly-brief`, `aire-stack`, `ai-compliance-check`, `agent-offer-builder`. Linked into `.claude/skills/` and listed in the README.

**Inference**
- "Legion" in Caleb's request was read as lead generation. If it is a product name, fix STACK.md and the plan.

**Needs Caleb**
- Read the plan and say which of week 1's switches to flip: Gmail AI Inbox, Claude Workspace sidebar, Meet next steps, linking the Claude Console org for API credits.
- Confirm which subscriptions are paid (see the bottom of STACK.md).
- Say whether KW First Choice has an AI use policy.
- List any custom GPTs that exist, so they can be rebuilt as skills before December.
