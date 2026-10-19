---
name: ce-sunday-iteration
description: Runs outbound campaigns as a data experiment per Nick Saraev: multiple variants always live, 500 to 1,000 sends per variant before judging, a fixed weekly iteration slot (his is Sunday, 20 to 30 minutes), a change log, a large enough TAM, and big changes early then small changes late. Use when Caleb says "which version of my letter is better", "is 80 sends enough to tell", "set up an A/B test for my seller emails", "when should I change my campaign", or when AIRE reports campaign metrics and proposes the next change.
---

# Sunday Iteration and A/B Testing

**Source:** Nick Saraev, "COLD EMAIL COPYWRITING & OUTREACH Full Course 2026", chapters 4, 27 and 28 (https://www.youtube.com/watch?v=uSTGNHGFOAo&t=12127s and https://www.youtube.com/watch?v=uSTGNHGFOAo&t=12785s)

## What Nick teaches

Campaigns rarely rock right away. A typical path: launch at 2.5% reply, change copy to 3.2%, change again and drop to 3%, change again to 4%, and eventually plateau at the campaign's true rate. "It is very rare to one-shot a campaign." Outbound is a data scientist's game of hill climbing.

Rules:
1. **Always iterate, always have multiple variants running.** One variant means money left on the table. Instantly and Smartlead have built-in variant support for email, HeyReach for LinkedIn, some tools for X (check terms of service, not all are compliant).
2. **Stick to a schedule.** Nick iterates every Sunday, the one day he sends no outbound, for 20 to 30 minutes. That yields 45 to 50 iteration cycles a year that nobody else gets. Most people iterate daily for a week, then never again.
3. **Log every change** and look at it like a researcher's experiment log.
4. **500 to 1,000 sends per variant** before judging. 50 or 100 sends with one reply versus zero tells you nothing. "Talking to 100 people is not enough." More volume beats clever statistics.
5. **Pick a TAM with a lot of leads.** A few hundred holistic nutritionists in Texas cannot support one test. 100,000 US digital agencies supports 100 to 200 tests.
6. **Big changes early, small changes late.** Week one: two fundamentally different scripts (30 to 50 words and casual versus a long personal story, formal versus informal, deep personalization versus none). Cut half the search space fast. Then make the next pair 2x different, then 1x, then 0.5x, converging on a high performer. Late stage: swap a word, a subject line, one line, the personalization style.
7. **Kill losers fast, breed from winners.** Three campaigns, one at 10% and two at 2%: scratch the two, write new variants off the winner.
8. **Data over gut, revealed over stated preference.** Customers' behavior is the truth, not what they say or what you believe.
9. Nick mentions his Claude Code "auto research" approach can have AI design and run iterations on a schedule, but says to just stick to a manual schedule for now.

KPIs to log: opens (if visible), replies, opt-ins, calls, proposals, closes, lifetime value, and block or spam rate per variant.

## Step by step

1. Launch with two variants that are fundamentally different (length, tone, personalization depth). Same list, same send window.
2. Set the judging threshold: 500 sends each, or 1,000 if reply rates are low. Do not look for a winner before that.
3. Block a recurring 30-minute slot on a no-send day. Put it on the calendar.
4. In the slot: pull metrics per variant, kill the loser, write one new variant off the winner with a smaller difference than last time, log the change with the date and the hypothesis.
5. When a variant beats your bar for two cycles, add a follow-up step (ce-two-touch-follow-up).
6. When improvements stall for three cycles, you have hit the plateau. Shift effort to a new segment or offer.

## Templates / prompts

```
ITERATION LOG: <campaign>
Date | Variant | Sends | Replies | Reply% | Booked | Blocks/Opt-outs | Change made | Hypothesis | Decision
2026-10-19 | A short/casual | 540 | 14 | 2.6% | 2 | 1 | baseline | - | keep
2026-10-19 | B long/story   | 530 | 7  | 1.3% | 1 | 3 | baseline | - | kill
2026-10-26 | A2 = A + loss subject | ... 
```

Prompt for AIRE on iteration day:
```
Here are this week's numbers per variant. Only compare variants with 500+ sends. Name the loser, propose one new variant built off the winner that differs by a smaller margin than last week's test, state the hypothesis in one sentence, and append a row to the iteration log. Do not change more than one thing at a time now that we are past week two.
```

## Pitfalls Nick calls out

- Judging on 50 to 100 sends.
- Iterating in a burst then abandoning it.
- Tiny tweaks in week one when you should be exploring opposite approaches.
- Big rewrites in month three when you should be polishing.
- Trusting intuition. His "no way this works" emails have hit 15%.
- Small niches that cannot support testing.

## How Caleb should use this

- Real estate TAM check: a 50-letter expired campaign in St. Francisville alone will never reach significance. Pool across Baton Rouge, Zachary, Central, Denham Springs, and similar price bands, or accept that small local campaigns are judged on booked appointments over months, not weekly reply rates.
- Make Sunday (or whichever day Caleb does not prospect) a 30-minute AIRE review. AIRE pulls the numbers from the CRM, proposes one change, Caleb approves. Any resend is "needs Caleb's approval before running."
- Keep the iteration log inside AIRE so the best-performing opener, offer, and subject per segment are always known.
- Track opt-outs and complaints as a first-class KPI, since Caleb's phone number and domain reputation are the asset.

## Verification

- Each live campaign has at least two variants and an iteration log with dated rows.
- No winner is declared under 500 sends per variant.
- A recurring calendar block exists for iteration and has been honored at least three weeks running.
