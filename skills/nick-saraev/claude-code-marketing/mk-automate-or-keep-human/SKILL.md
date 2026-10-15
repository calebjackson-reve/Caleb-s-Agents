---
name: mk-automate-or-keep-human
description: Applies Nick Saraev's "effectiveness beats efficiency" filter to decide whether a marketing or client-facing task should be automated, automated with human QA, or kept fully human. Use when Caleb asks "should AIRE handle this", "can I automate my buyer consult follow-up", "is it okay to auto-send this to a seller", "what should stay me", or when a proposed automation touches a relationship with a client, prospect, or referral partner.
---

# Automate or keep it human: the effectiveness filter

**Source:** Nick Saraev, "Claude Code Marketing Full Course (6 Hours)", chapters 16 and 17 (https://www.youtube.com/watch?v=yulWjh3rq28&t=20145s and &t=21695s)

## What Nick teaches

**Effectiveness beats efficiency.** Efficiency is doing things fast and cheap. Effectiveness is doing the right things. People shave milliseconds and margins off processes, watch their KPIs improve, then wonder why revenue fell: they automated things that never mattered, or worse, automated the thing that actually made the money.

Nick's private-equity story: a PE firm wanted a voice agent to replace the one hour per week they spent on the phone doing due diligence with blue-collar business owners. That hour was the only thing that made them money. "If you can't spend one hour a week doing the most important thing in your business, do you even have a business?" He turned it down.

Nick does a lot manually on purpose: recording videos, sales calls with mid-market and enterprise clients where his presence changes the outcome. He automates the rote work (bookkeeping, lead scraping) so he has more time for that.

### Automate vs. don't, as Nick lists it

| Automate | Do not automate |
|---|---|
| Data entry (lead enrichment, icebreakers, CRM updates) | Client relationships |
| First-draft copy and creative (hundreds of ad variants) | The final asset. AI ideates and specs. A human picks, upgrades, ships |
| Reporting ingestion (pulling from 5 platforms into one dashboard) | Delivering bad news from the report. Never auto-send "signals" to a client. Sit down with them |
| Scheduling logistics | Any moment where a paying client must feel valued ("does Tuesday or Wednesday at 2 work?" beats "here's my calendar link") |

**The filter question:** "Does the customer actually feel this process? Is a relationship at risk?"
- No -> automate it.
- Yes -> you can still automate it, but QA it by hand before it reaches the person, and keep a human element.
- "Hey Pete, checking in on the invoice" = logistical, fine to automate.
- "Hey Pete, I'd love to schedule a call about X, I think I can make a big bottom-line impact" = keep human.

"Automation should buy you more time with people. It should not replace the time you have with people." A two-cent "We value you" robot text proves the opposite.

Nick's closing (ch. 17): people over-automate tremendously. He is a fan of automation and still says this.

## Step by step

1. Write the task in one line and who is on the other end (nobody / a stranger / a lead / a client / a referral partner).
2. Ask the filter: does that person feel this step? Is a relationship at risk?
3. Ask the effectiveness test: is this step the thing that actually makes money (listing appointments, buyer consults, negotiations, closing-day moments)? If yes, keep it human no matter how much time it saves.
4. Classify: **Automate fully** / **Automate with human QA gate** / **Keep human (AI may prep notes only)**.
5. For "QA gate" items, define the gate concretely: drafts land in a folder or as unsent drafts. Caleb approves. Then send.
6. Record the decision next to the skill so future routines respect it.

## Templates / prompts

Decision prompt:
```
Task: {{one-line description}}
Who is on the other end: {{nobody / stranger / lead / active client / past client / referral partner}}
Is this step where the money is actually made? {{yes/no + why}}
Does the person feel this step? {{yes/no}}
Classification: {{AUTOMATE / AUTOMATE + HUMAN QA / KEEP HUMAN}}
If QA: where do drafts go, who approves, and what is the max delay before a human must act?
```

Caleb's starting map (edit as needed):
```
AUTOMATE
- Enrich new leads from Zillow/Facebook/open-house sign-ins with neighborhood, price band, timeline
- Generate 50 listing ad variants, 10 UGC-style scripts, newsletter personalization fields
- Pull MLS stats, ad spend, website sessions into the weekly dashboard
- Log calls/emails into the CRM, set next-action dates

AUTOMATE + HUMAN QA
- Speed-to-lead first text/email (templated, short, promises a call) -> Caleb makes the call
- Invoice / document / signature nudges
- Social posts and listing ads (Caleb picks winners before publishing)
- Market-update newsletter send

KEEP HUMAN
- Listing presentations, buyer consultations, price-reduction conversations
- Delivering bad news (appraisal gap, inspection issues, low showings)
- Negotiation, offer strategy, closing-day communication
- Referral-partner relationships (lenders, inspectors, past clients)
```

## Pitfalls Nick calls out

- Measuring efficiency gains while revenue drops.
- Auto-sending report "signals"/bad news to clients.
- Robotic "we value you" messages that cost two cents and read like it.
- Automating the single hour that makes the money.
- Over-automation is the common failure, not under-automation.

## How Caleb should use this

- Run every proposed AIRE feature through the filter before building. Real estate is a relationship business. The sweet spot is AI doing prep and logistics so Caleb shows up more present at the human moments.
- Default rule for AIRE: anything addressed to a client or lead by name is **AUTOMATE + HUMAN QA** until it has been reviewed for two weeks and Caleb explicitly promotes it. Promotion **needs Caleb's approval before running** unattended.
- Pitching AIRE to other KW First Choice agents: lead with "this buys you more time with clients," never "this replaces your follow-up."
- Keep a "never automate" list in the repo and have routines check it (a note in each skill's SOP: "If this touches X, write a draft and stop").

## Verification

- Every skill in the AIRE repo carries a classification line (AUTOMATE / QA / HUMAN).
- No routine sends a message to a client or lead without either a QA gate or a logged approval decision.
- Caleb's weekly calendar shows more, not less, time in live client conversations after automations ship.
