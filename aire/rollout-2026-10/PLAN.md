# AIRE rollout plan: putting October 2026's AI releases to work

Written October 19, 2026. Based on `aire/ai-briefs/2026-10-19.md`. Nothing here is live until Caleb says so for each item. Status of every item is tracked in `aire/STATUS.md`.

## The idea in one paragraph
The big labs just shipped cheaper bulk models, agents that run on their own, AI inside Gmail and Docs, and live dashboards and explainer video. The portals (Realtor.com, Zillow) are shipping agent-side AI too, which means the floor for "an agent who uses AI" is rising fast. The play is not to chase every feature. It is to wire the handful that touch Caleb's five arenas into skills that load on their own, so the system runs the same way every time without Caleb retyping a command. Then package the same system as what he teaches and sells to agents.

## How "never upload the command again" works
1. Every workflow is a skill in `skills/` with a description that names the trigger words. Claude Code loads it by description match from `.claude/skills/`, and the plugin installs the same set on any machine.
2. Facts that change (which model, which tool, which subscription) live in `aire/STACK.md`. Skills read that file. Caleb updates one line, every skill follows.
3. Corrections go into the Learned Rules of `global-claude-md/CLAUDE.md`, one dated line each.
4. For claude.ai chat, the same skills get zipped into `chat-skills/` once. Upload once, done.

New skills in this rollout: `ai-weekly-brief`, `aire-stack`, `ai-compliance-check`, `agent-offer-builder`. Existing ones they lean on: `teardown`, `teardown-tuesday`, `aa-tiered-model-cost-routing`, `mk-speed-to-lead-email-sms`, `ce-compliant-outbound-guardrails`.

## The five arenas

### 1. Website (calebjackson.org on Luxury Presence)
| Move | Uses | Effort | Needs Caleb |
|---|---|---|---|
| Home value and net sheet calculators as interactive pages, embedded in an LP custom HTML section | Claude artifact (or GPT-6 Intelligent UI as reference) | 1 session | Approve copy, send LP one case |
| Monthly market update as a 30 second animated explainer on the home page, no AI people | Claude Motion beta | 1 session per month | Confirm Motion is on his plan |
| Speed to lead goes from DRY_RUN to live, daytime only first | Existing directive | Flip one flag | Explicit yes, after reviewing the dry run |
Measure: leads per month and seconds to first reply, both already logged by the speed-to-lead directive.

### 2. Lead generation ("Legion" is read as lead gen. If Legion is a product or tool name, correct STACK.md.)
| Move | Uses | Effort | Needs Caleb |
|---|---|---|---|
| Enrichment pipeline reroutes bulk steps to Haiku 5.5, judgment to Opus. Target 60/30/10 split | `aa-tiered-model-cost-routing`, STACK.md | 1 session | Nothing |
| Check if Baton Rouge or St. Francisville is in RealAssist's 21 markets. If yes, use it as a free benchmark of portal AI, not a dependency | Realtor.com+ | 30 min | Log in to Realtor.com+ |
| Instagram feed links under listing posts, if Meta One Advanced pays for itself at one lead | Meta One | Decide | Decide on the subscription |
| Facebook "Your Algorithm": set Caleb's own feed to St. Francisville and Baton Rouge real estate so Teardown Tuesday sees local competitors | Facebook | 10 min | Do it on his phone |
Measure: cost per enriched lead, leads from Instagram links.

### 3. Touches (follow-up and client communication)
| Move | Uses | Effort | Needs Caleb |
|---|---|---|---|
| Gmail AI Inbox to-dos feed the daily touch list. Claude for Workspace sidebar drafts replies in Caleb's voice inside Gmail and Docs | Google Workspace, Claude sidebar | Turn on, 1 session to tune | Enable the add-on |
| Meet next steps draft the recap email after buyer consults and listing appointments | Google Meet | Turn on | Enable |
| Every outbound draft passes `ai-compliance-check` before Caleb sees it | New skill | Built here | Nothing |
Measure: touches per week, replies per touch (Metricool and Gmail).

### 4. How we operate
| Move | Uses | Effort | Needs Caleb |
|---|---|---|---|
| Monday: `ai-weekly-brief` runs the news sweep and appends to `aire/ai-briefs/`, flags anything that changes STACK.md | New skill | Built here | Read it |
| Tuesday: `teardown-tuesday` as today | Existing | None | Read it |
| Pipeline dashboard from the deals sheet, refreshes itself | Claude Dashboards beta | 1 session | Point at the sheet |
| Claude Max monthly API credits fund the Haiku bulk jobs, so subscription money covers pipeline cost | Claude Max | Link Console org in billing | One click in billing |
| Custom GPTs, if any exist, rebuilt as skills before December | This repo | Depends on count | List any GPTs he has |

### 5. What to sell or teach agents
The product is the system above, packaged. Three tiers, drafted by `agent-offer-builder`:
1. Free (Skool): the weekly AI brief for agents, one page, plain words. Lead magnet for the community.
2. Workshop ($): "Set up your AI office in a day": Gmail AI Inbox, Claude sidebar, speed to lead, compliance check. The existing ai-workshops program.
3. Done-for-you ($$): install the caleb-skills plugin and STACK.md on their machine, tuned to their brokerage and state rules.
Measure: Skool members, workshop seats, installs. Pricing is Caleb's call.

## Rules and regulations that shape every piece
Confirmed from the global CLAUDE.md (Louisiana Real Estate Commission advertising rules): name and Keller Williams First Choice on every piece, real sender identity, opt-out on every email, no cold texting, no price or timing guarantees, fair housing language only, license number 995709547.

New this month, by inference from the brief:
- Regulators are watching consumer AI chat (eight state AGs sued OpenAI Oct 14). Any chatbot on calebjackson.org identifies itself as automated and hands off to Caleb for anything about price, offers or contracts.
- Instagram now labels AI-generated profiles. AI-generated video gets the AI label on by Caleb, every time. Never AI-generated or altered listing photos. Virtual staging disclosed in the caption and the MLS remarks.
- Brokerages are being told to set AI policies and agents carry the liability. Ask KW First Choice whether a policy exists. Until then, this repo's approval gate is the policy: AI drafts, Caleb approves, Caleb sends.
- TCPA still governs texts. Speed to lead texts only to people who submitted a form with a phone number, with STOP on every one.
- Every market stat carries source and date. AI never makes up a number.

## Order of work
1. This week: enable Gmail AI Inbox, the Claude Workspace sidebar, and Meet next steps. Link the Claude Console org for API credits. Run `ai-weekly-brief` next Monday to prove the loop.
2. Week 2: calculators on the site, reroute enrichment to Haiku 5.5, decide on Meta One.
3. Week 3: Claude Dashboards on the pipeline sheet, first Motion market update.
4. Week 4: flip speed to lead to live, daytime only. Draft the three-tier agent offer and put the free tier in Skool.

## Definition of done for the rollout
- All four new skills load by description in a fresh Claude Code session without Caleb typing a command.
- STACK.md is the only place a tool choice is written down.
- One weekly brief, one Teardown Tuesday and one dashboard refresh have each run on schedule.
- Every consumer-facing draft in that month passed `ai-compliance-check` before Caleb saw it.
