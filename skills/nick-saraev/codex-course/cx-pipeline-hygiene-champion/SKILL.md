---
name: cx-pipeline-hygiene-champion
description: Builds a daily "champion" that reads every open record in the CRM, project board and internal ops list, finds stale deals, overdue projects and unanswered requests, and sends one plain, actionable nudge per item to the responsible person with the dollar amount at stake, backed by a written company knowledge base. Use when Caleb says "what's going stale", "nudge me on my pipeline", "daily accountability", "who hasn't been followed up", "check my CRM every morning", or wants AIRE to keep the Keller Williams pipeline, transaction checklist and lead board honest.
---

# Daily pipeline hygiene champion

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 8 (https://www.youtube.com/watch?v=DJZISqryDfw&t=8338s)

## What Nick teaches

In any CRM or project management rollout, the **champion** is the most important part: the person who checks that the system is being used and nudges people forward. Without one, things go stale and fall through the cracks. These systems exist first for accountability and organization (people can see what others are doing, which incentivizes work in a remote company), later for analytics (time to complete, who goes overdue, who closes most). Nick has sold ClickUp and Monday champion systems like this for tens of thousands of dollars.

The AI becomes the champion. Every day it walks every open record and nudges.

### The demo workspace (ClickUp)

Folders: Sales CRM, Client Delivery, Internal Ops. Sales pipeline stages: New Lead, Discovery, Proposal Sent, Negotiation, Contract Sent, Closed Won, Closed Lost. A Renewals board: Upcoming, Outreach, Negotiating, Renewed, Churned. Client Delivery: Active Projects and Client Requests. Internal Ops: team offsite, offboarding, contractor laptops. Questions the champion answers: this contract was sent three days ago, has anyone followed up? How long has this deal sat in Proposal Sent? This request is past SLA, who owns it?

### Build order

1. **Verify control** of ClickUp with the plugin: ask what it can do, then move one task from Not Started to In Progress (see `cx-plugins-and-mcp`).
2. **Knowledge base.** The missing piece is context: who the company is, what it sells, revenue, how to prioritize, tone of voice, who decides what, how to reach people. Nick's `knowledge-base/` folder had a company file (Arclight Digital, fictional 38-person agency in Austin, about $10.5M a year, founded 2019, what it builds, org chart with who decides pricing exceptions, deals over $150K, renewals, legal) and a team file (name, role, Slack ID, time zone, email). "Write it once, have the agent assemble it from your website and videos, and it becomes an AI operating system you could sell."
3. **Skill prompt** (dictated, with the knowledge base pasted): "every day go through all open statuses, tasks and records, nudge forward things that need nudging. Check in with individuals over Slack so CRM, project management and internal ops are 100% taken care of. Be the champion. Build it as a skill first, then local automation, then cloud."
4. **Scope guard:** "Only send Slack messages to me, Nick."
5. **Connect Slack**, send a loud test message, correct the Slack ID in the knowledge base.
6. **First run**, then tone and format corrections:
   - No em dashes.
   - One message per action, not a batch. Batching kills follow-through.
   - Hyperlink the record at the beginning, not pinned at the end.
   - Speak plainly, directly actionable. "Fires act today" is not an instruction.
   - Use Slack blocks for visual fidelity.
   - Bold the company or record name on the first line.
   - Add the dollar amount we stand to gain or lose on anything sales related.
   - Say whether the item is sales, fulfillment or internal ops.
   Example after fixes: "**Silver Spruce renewal.** The renewal is 6 days late. Legal says it is month to month and Paula has gone quiet. Do this next: call Paula today with a save plan."
7. **Speed pass:** "Review everything you did from start to finish and make the skill run in half the time with half the tokens. Prune wasted discovery, explored paths you didn't need. Consolidate it in the skill." Result: fetch the five mapped lists in parallel instead of global search, pre-flight auth once and the Slack destination once, read comments only for flagged tasks in parallel, stop early on unavailable enumeration, per-task delivery transaction (send, then immediately audit with a comment). The champion also wrote risk notes back onto the record ("risk high, renewal date passed, no signed extension").
8. **Local scheduled run** at 6:00 a.m. with one test run. Nick dropped the ClickUp audit comment path from the automation to keep it simple.
9. **Cloud automation** with a smarter model "because it is less likely to make mistakes," noting the cloud environment may not have the plugin installed, so that is an extra step.

### Extensions Nick lists

Triage differently per task type. Weave two responsible people into one thread. Make it two-way: tag the agent in Slack and have it update the CRM from chat. Add Gmail to follow up with leads and clients directly (he skipped this since sales was already covered). Hourly heartbeats that congratulate you when something moved. Use a smarter model for anything client facing.

## Step by step

1. Write `knowledge-base/company.md` and `knowledge-base/team.md` (see templates). Have the agent draft them from Caleb's site, bio and a dictated brain dump, then correct.
2. Connect the CRM and the messaging channel. Prove a read and a reversible write.
3. Set the scope guard: messages only to Caleb until the team is added deliberately.
4. Dictate the champion brief with the knowledge base attached. Build as a skill.
5. Run once. Fix tone and format with the chapter 8 rules. Run again.
6. Speed pass: half the time, half the tokens, consolidate into the skill.
7. Define staleness thresholds per stage in the skill (for example new lead untouched 24 hours, under contract with no task movement 2 days, listing with no showing feedback 72 hours).
8. Local run at 6:00 a.m. Test once. Then cloud (see `cx-event-automation-local-to-cloud`).

## Templates / prompts

`knowledge-base/company.md`:

```
# Caleb Jackson, REALTOR, Keller Williams First Choice
Markets: St. Francisville, West Feliciana, Baton Rouge area, Louisiana
What we do: listing representation, buyer representation, investor acquisitions
Decision rules: Caleb approves all client messages, pricing advice and anything legal
Priorities: active listings first, under-contract deadlines second, new leads third, sphere fourth
Tone: warm, direct, plain
Thresholds: [stage: hours before stale]
```

`knowledge-base/team.md`:

```
| Name | Role | Channel | Handle or ID | Time zone | Email |
| Caleb Jackson | Agent, owner | Slack DM / SMS | <id> | America/Chicago | <email> |
| <TC name> | Transaction coordinator | Slack | <id> | America/Chicago | <email> |
```

Champion brief:

```
Here is my knowledge base. Every day go through every open lead, listing, transaction and task in [CRM / board]. For anything stale by our thresholds, send one message per item to the responsible person. Format: bold the client or property name, hyperlink the record first, say if it is sales, transaction or internal, the dollar amount at stake, then "Do this next:" with one plain action. No em dashes. For now, only message me. Build this as a skill. Then we will schedule it.
```

Nudge format:

```
**<Client or property>** (<sales | transaction | internal>) <link>
<What is stale and for how long, one or two plain sentences>
At stake: $<amount>
Do this next: <one action, today>
```

## Pitfalls Nick calls out

- Batched digests. One message per action or nothing gets done.
- Links at the bottom. Link first.
- Vague verbs. Every nudge ends with a concrete next action.
- Wrong IDs in the team file.
- Running the first slow version forever. Do the speed pass.
- Using the cheap model for client-facing actions.
- Messaging the whole team on day one.

## How Caleb should use this

- Lead board: new portal or website leads untouched 24 hours, buyers with no showing in 14 days, sellers in "thinking about it" with no touch in 30 days. Nudges go to Caleb with the estimated commission at stake.
- Transactions: inspection, appraisal, financing and closing dates approaching with open tasks. Nudge Caleb and the transaction coordinator.
- Listings: no price review in 21 days, no showing feedback requested, marketing tasks not done.
- Sphere and past clients: anniversaries and annual check-ins due.
- Any nudge to a client (not to Caleb or his team) and any CRM write beyond notes needs Caleb's approval.

## Verification

- One run produces one message per stale item, each with a bold name, link first, category, dollar amount and a next action.
- The record in the CRM gained a risk or audit note where the skill is allowed to write.
- Second run after fixing items produces fewer nudges and no duplicates.
- The speed pass cut run time roughly in half.
