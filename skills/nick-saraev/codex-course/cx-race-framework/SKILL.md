---
name: cx-race-framework
description: Picks which business process to automate first using Nick Saraev's RACE framework (Reach, Acquisition, Conversion, Expansion) and the compounding multiplier math behind it. Use when Caleb asks "what should I automate first", "where does AI pay off in my real estate business", "is this worth building", "prioritize my AIRE roadmap", or wants to rank ideas like lead follow-up, listing marketing, seller outreach, bookkeeping or transaction admin by return on effort.
---

# RACE framework: where automation pays off

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 3 (https://www.youtube.com/watch?v=DJZISqryDfw&t=1474s)

## What Nick teaches

Nick has run online businesses since 2016. Every time he enters a business, whether his own or a client's, he starts with a four-letter acronym: **RACE**.

- **R, Reach**: the number of eyeballs that see the business. Systems here economize how easily you produce advertising and top-of-funnel content: creative generation (images, video, audio), copy, headline and hook testing, YouTube titles, short-form packaging. More ads, more copy, more variants tested.
- **A, Acquisition**: turning an eyeball into intent or interest. Booking a meeting, capturing information for a quote, confirming someone is interested. Systems here are "speed to lead" (how fast you get back to a lead), nurturing (email list to webinar, in-person event flows) and follow-up.
- **C, Conversion**: turning demonstrated intent into money. Generating proposals, quotes, estimates, scope-of-work documents, e-sign and payment, onboarding packages, daily pipeline check-ins that decide who needs a touch.
- **E, Expansion**: turning a customer into a bigger customer. Follow-ups, deep dives, re-pitching, upsells, and using the AI as "brains" to scan a large solution space and help innovate on the product side.

The core argument: most people rush to automate fulfillment, admin and bookkeeping (the back of the business). The highest return relative to time spent comes from the **front** of the business, the parts that touch customers or improve the funnels that capture them. If you double reach, revenue often doubles almost immediately. A $100K/month business becomes $200K/month. No bookkeeping automation compares to that, and with AI both take about the same time to build.

**The multiplier math.** Typical realistic lifts from systems:

| Stage | Lift | Multiplier |
|---|---|---|
| Reach | +50% | 1.5 |
| Acquisition | +20% | 1.2 |
| Conversion | +10% | 1.1 |
| Expansion | +10% | 1.1 |

1.5 x 1.2 x 1.1 x 1.1 = **2.18x**. A $100K/month business becomes about $220K/month. If it is your business, that is incredible. If it is someone else's, that is directly attributable revenue you created.

Nick's course builds one system per function on this spine: sales (call to proposal), marketing (content repurposing), operations (pipeline hygiene) and an after-hours voice agent that patches pipeline leaks.

## Step by step

1. List every candidate automation Caleb is considering in one place.
2. Tag each with its RACE stage. If it does not touch R, A, C or E (pure fulfillment, admin, bookkeeping), tag it "back office".
3. For each candidate estimate the percentage lift on its stage. Be honest, use Nick's defaults (50/20/10/10) when unsure.
4. Estimate build effort in hours at the "prompt" level (see `cx-four-levels-ladder`). With AI most builds land in the same 1 to 3 hour band, so effort rarely breaks ties.
5. Rank front-of-business items first, highest lift first. Back-office items go to the bottom unless they are blocking something front-of-business.
6. Write the top 3 as a short roadmap with the expected compounding multiplier.
7. Build the first one through all four levels before starting the second.

## Templates / prompts

Prioritization prompt (dictate or paste into Claude Code or Codex):

```
Here is a list of automation ideas for my real estate business:
[paste list]

Classify each one by RACE stage (Reach, Acquisition, Conversion, Expansion, or back office).
For each, estimate the realistic percentage lift to that stage and a build effort in hours.
Rank them: front-of-business first, highest lift first, back office last.
Then show me the compounding multiplier if I ship the top four (multiply the lifts).
Output a table and a three-item roadmap. Plain language, no hype.
```

Roadmap file layout:

```
aire/
  roadmap/
    2026-10-race-ranking.md     # the ranked table plus the multiplier
    01-<first-system>/          # one folder per system as it is built
```

## Pitfalls Nick calls out

- Rushing to automate fulfillment, admin or bookkeeping first. Leverage lives at the front.
- Comparing automations by how "cool" they are instead of by stage and lift.
- Forgetting that lifts compound. Four modest lifts more than double the business.
- Treating the framework as the only lens. It is the simplest one Nick uses when entering a new business, not a complete map.

## How Caleb should use this

- **Reach**: listing marketing content, St. Francisville and Baton Rouge neighborhood content, repurposing one listing video into Reels, Facebook, Instagram and newsletter (see `cx-content-repurposing`).
- **Acquisition**: speed to lead on Zillow, Realtor.com and website inquiries, open house sign-in follow-up, buyer nurture sequences, after-hours call handling (see `cx-voice-agent-fit-matrix`).
- **Conversion**: listing presentation and CMA proposals generated from a seller consult recording (see `cx-sales-call-to-proposal`), buyer rep agreement packages, daily pipeline nudges inside the CRM (see `cx-pipeline-hygiene-champion`).
- **Expansion**: past-client and sphere check-ins, referral asks, investor clients buying a second property, annual home value updates.
- Back office (transaction coordination checklists, commission tracking) goes last unless it is actively losing deals.
- Anything that sends messages to leads or clients, posts publicly or spends money needs Caleb's approval before running.

## Verification

- The ranked table exists, every item has a RACE tag, and the top items are front-of-business.
- The multiplier is computed by multiplying lifts, not adding them.
- Caleb can say in one sentence why item one is first. If he cannot, the ranking is not done.
