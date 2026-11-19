# 4x: four times the closings next year

Written 2026-11-04 after Caleb said "we want to quadruple our sales for this year next year." This is the math, the levers, what is already built for each, and what only Caleb can switch on. Confirmed facts, historical context and inference are marked.

## The baseline

| Fact | Number | Source |
|---|---|---|
| Closed deals since 2022 | 81, $25.1M | Identity standard, as of October 7, 2026 (confirmed) |
| Average price per closed deal | about $310,000 | $25.1M / 81 (arithmetic) |
| Closed in the last 90 days | 1, $425,000, $12,750 commission | AIRE CRM sheet, Deals tab, 2026-11-04 (confirmed) |
| Under contract today | 3 deals, $2,397,000 | Deals tab, 2026-11-04 (confirmed) |
| Sphere | 3,656 contacts, 123 hot, 50 warm, 421 next actions waiting, 32 people touched in the last 30 days | AIRE CRM sheet, 2026-11-04 (confirmed) |
| New leads | 2 this week, 30 in 30 days, website leads come from Luxury Presence | AIRE CRM sheet and Gmail counts, 2026-11-04 (confirmed) |
| Closings per year, 2022 to 2026 | about 17 a year | 81 over roughly 4.75 years (inference, the yearly split is not in the repo) |

**Unknown:** the 2026 closed count and volume. The Deals tab only holds deals since the CRM was built on October 16. Caleb's "this year" number has to come from Command or the brokerage production report. Until it does, this plan uses the 17-a-year average as the stand-in and every target below scales with the real number.

## The target

Four times 17 is 68 closings in 2027, about 5.7 a month, roughly $21M in volume at the $310,000 average. At the commission the one measured closing paid (3% of $425,000), that is about $9,300 a deal and about $630,000 in gross commission. Inference from one closing; the Deals tab commission column will replace it as deals close.

## The math behind 68

Closings come from conversations, so the plan is counted in conversations. The conversion rates below are assumptions to start the year, not measurements. The dashboard replaces each with Caleb's own rate within 60 days, and the targets move with them.

| Source | 2027 closings | Conversion assumed | Conversations needed | Per week | Today |
|---|---|---|---|---|---|
| Sphere and past clients (referrals, repeat, the 173 hot and warm) | 36 | 1 in 10 real conversations becomes a deal within the year | 360 | 7 | about 8 touches a week (32 in 30 days) |
| Website and Luxury Presence leads | 18 | 1 in 40 leads closes | 720 leads | 14 | 2 a week |
| Listings as lead machines (sign calls, open houses, Just Sold posts, neighbors) | 10 | 2 buyer or seller deals per listing taken | 5 extra listings a year | | 3 active listings now |
| Partners (lenders, title, builders, other agents' referrals) | 4 | 1 deal per partner per year | 4 active partners | | partner pool exists, cadence not running |

Two things jump out. The sphere number is reachable with discipline, not new money: 7 real conversations a week from a list of 173 hot and warm people is one a day. The lead number is a 7x jump and is where the website, AI visibility and speed to lead do their work.

## The levers, and what is built for each

1. **Speed to lead.** Every Luxury Presence lead lands in the Website leads sheet within seconds (webhook, built today in `aire/lp-webhook/`), becomes a call task in Pipeline, and a text draft waits in the compose box. Caleb taps send. Measure: minutes from lead to first touch, on the dashboard once the webhook is live. Needs Caleb: the Luxury Presence API key, 10 minutes (`aire/lp-webhook/README.md`).
2. **Ten touches a day.** Pipeline's queue already drafts by pool (sphere, past client, active buyer, seller candidate, partner, recruit) with the Do Not Contact check and the daily cap. The sphere target is 7 conversations a week; 10 drafted touches a day gets there with room. Measure: touches per week and replies per touch, both on the Command Center.
3. **Be the answer.** `aire/ai-visibility/check.py` measures how AI answers talk about Caleb in his markets and lists the sites they cite that he is not on (Zillow profile, Realtor.com, Google Business Profile reviews, local Reddit). Run it weekly, do the top recommendation each week. Needs Caleb: one run on the Mac with the API key, then a yes to the Monday schedule.
4. **Reviews.** Every closing asks for a Google review and a Zillow review in the week after. AI answers and buyers both read them. Measure: review count on the Google Business Profile, through Metricool once the profile reports (it shows zeros today).
5. **Listings as lead machines.** Each listing gets the Just Sold and Just Listed social set (`aire/social`), an open house with sign-in to the CRM, and the farm drawn around it in the Map so the neighbors get the market letter. Measure: leads per listing.
6. **Partners.** The partner pool has its own 60-day cadence in the follow-up library. Turn it on and keep four partners warm. Measure: referrals received.
7. **The scorecard.** Five numbers every Monday on the dashboard: leads in, first-touch minutes, conversations, appointments, agreements signed. Closings follow with a lag. The inputs are on the dashboard now; the weekly roll-up is the next build once the Mac loop has two weeks of history.

## Connectors and keys: what to switch on

Nothing here can be authorized from a cloud session. Each is a click Caleb makes once.

| Connect | Why it matters for 4x | Where | Cost |
|---|---|---|---|
| Luxury Presence API key | Lead webhook, lever 1 | app.luxurypresence.com, Profile, API keys (admin) | none if the plan includes it (unknown) |
| ANTHROPIC_API_KEY on the Mac | AI visibility runs, Pipeline Q&A | `~/.aire/pipeline.env`, the key Pipeline already uses | about $1.44 per visibility run |
| QuickBooks, fresh sign-in | Commission and spend on the dashboard, cost per lead | claude.ai, Settings, Connectors, QuickBooks (the connector is installed, the session is expired) | none |
| Google Business Profile in Metricool | Review count, profile calls and direction requests | Metricool, Connections, reconnect Google Business | none |
| Google token for the World sync | Calendar and inbox on the dashboard | `/usr/bin/python3 aire/world/sync.py auth` on the Mac | none |
| ChatSEO credits | Search Console questions in plain words | ChatSEO app, plan | paid, decide |
| FirstAnswer MCP | Not needed: `aire/ai-visibility` is the same loop on our engine | | skip |
| Inkbox SMS | Texts to new leads from an agent number | Already connected | needs written consent rules first; Pipeline texting from Caleb's own Messages stays the default |

Not recommended: a second CRM, a lead-buying subscription, Zapier for the webhook (the direct registration is free). The one-system rule in `aire/STACK.md` stands.

## Order of work

1. This week: Luxury Presence key and webhook live; World sync auth on the Mac; first AI visibility run; QuickBooks sign-in.
2. Next two weeks: ten touches a day through Pipeline, partner cadence on, review ask added to the closing checklist.
3. By December: two weeks of history on the dashboard, replace the assumed conversion rates with measured ones, set the 2027 weekly scorecard from the real numbers.
