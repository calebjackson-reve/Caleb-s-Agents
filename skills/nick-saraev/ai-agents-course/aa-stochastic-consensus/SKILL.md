---
name: aa-stochastic-consensus
description: Spawns N parallel sub-agents with slightly varied framings of the same question, then aggregates their answers into a consensus map (consensus, divergent, outlier ideas) to cover far more of the idea space than one prompt would. Use when Caleb asks "give me every angle on this", "brainstorm with multiple agents", "stochastic consensus", "I'm stuck on why my listings aren't getting showings", "rank these options", or any strategic decision for AIRE, lead gen, pricing or content where he wants the rare good idea surfaced.
---

# Stochastic Multi-Agent Consensus

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 11-14
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=3367s through &t=3965s)

## What Nick teaches

Ask the same model the same question twice and you get slightly different answers. That property is
**stochasticity**. Run "give me three ideas for X" once and you get A, B, C. Run it again and you
may get A, B, D. A third time, B, C, E. Stochastic multi-agent consensus automates this: spawn
multiple agents with slightly varied prompts, collect everything, and nearly double the ideation
scope, including the rarer ideas the model only produces 5 to 10 percent of the time.

Mathematically this is **traversing the search space**. Picture a pie chart of all possible answers.
One query covers a small wedge. Many parallel queries cover many wedges. His framing: Einstein
versus 10,000 researchers with 95 IQ. The crowd will statistically get there. And it runs in
parallel: three sequential 5-minute searches cost 15 minutes, three parallel ones cost 5.

The formal procedure:

1. One question or prompt.
2. Slight framing variations for each copy (he uses 3, 4, 5 or up to 10 depending on depth).
3. Each copy is a **sub-agent** with its own context window.
4. All report back to the parent agent.
5. The parent synthesizes: calculates the **mode** (frequency of each answer) and the **median**,
   then combines.
6. Output is a consensus map with three tiers: **consensus** items (many agents agree, probably do
   it), **divergent** items (reason about them before deciding), and **outliers / wild cards** (one
   in ten said it, so either brilliant or hallucination). You spawn many agents specifically to farm
   the wild cards.

His skill description: "Spawn N agents, where N is the number you specify, with slight framing
variations to independently analyze a problem, then aggregate results by consensus. Use for decision
making, ranking, strategic analysis, or any problem where you want to filter hallucinations and
surface high-variance ideas."

Demo: his real problem, TikTok stuck at about 1,000 views per account despite 450k Instagram
followers. Ten agents spawned, each with a different lens: conservative analysis, assume limited
time and budget, only what is measurable and provable, think from the end viewer's perspective, and
so on. Each got his context (287k YouTube subs, professional audience, small team). The consensus
report: every agent independently flagged TikTok-native hook reformatting and fresh account plus
clean device fingerprint. Divergent: paid Spark ads (one agent), Shorts first, micro-topic focus. A
couple asked "is TikTok even worth it," which he found genuinely useful. Cost: "three or four
dollars realistically in tokens." He uses this for product ideation, keyword research and content
titles.

## Step by step

1. Write the problem with real context (numbers, constraints, what has been tried).
2. Pick N (5 for quick, 10 for strategic).
3. Generate N framing variations (lenses). Keep the core question identical.
4. Spawn N sub-agents in parallel, one lens each, fresh context, same output format.
5. Parent collects, tallies frequency per idea, groups into consensus / divergent / outlier.
6. Write `consensus-report.md` with context, consensus items, divergent items with reasoning,
   outliers flagged as "try or discard," and a recommended next step.
7. Act on consensus, deliberate on divergent, test one or two outliers cheaply.

## Templates / prompts

Skill description (copy Nick's) plus body:

```
---
name: stochastic-consensus
description: Spawn N agents with slight framing variations to independently analyze a problem, then aggregate results by consensus. Use for decision making, ranking, strategic analysis, or any problem where you want to filter hallucinations and surface high-variance ideas.
---

## Procedure
1. Restate the problem and context in 5 lines. Confirm N with the user (default 10).
2. Generate N lenses from this list, rotating: conservative, limited time and budget,
   only measurable and provable, end customer's perspective, contrarian, first
   principles, what a top 1% operator would do, cheapest possible path, fastest
   possible path, what we are probably wrong about.
3. Spawn N sub-agents in parallel. Each gets: context + its lens + "Return 5 to 8
   candidate ideas, each with a one-line rationale and a confidence 1-5. Independent
   analysis only."
4. Aggregate: count how many agents proposed each idea (merge near-duplicates).
   Consensus = 50%+ of agents. Divergent = 2 to 49%. Outlier = exactly 1.
5. Write consensus-report.md: Context, Consensus (with count), Divergent (with the
   disagreement), Outliers (brilliant or BS?), Recommended execution plan.
```

Trigger prompt:

```
Use stochastic multi-agent consensus with 10 agents on this: <problem with
numbers and what I've tried>. I want a consensus map, not a single answer.
```

## Pitfalls Nick calls out

- Not every idea is good. Do not treat the output as strategy. Treat it as fast ideation that trades
  a few dollars for hours of your time.
- Outliers can be hallucinations. Verify before acting.
- Without research tools the agents reason from context only. He noted the debate version would have
  caught more with web access.
- It costs tokens (a few dollars for 10 Opus agents). Fine for strategic questions, wasteful for
  trivial ones.

## How Caleb should use this

- Pricing strategy on a stale listing: 10 lenses on "why no showings in 21 days and what to change."
  Act on consensus, test one outlier.
- Lead-gen channel choice for St. Francisville and Baton Rouge: which sources (absentee owners,
  expireds, FSBOs, investor lists, sphere) deserve the next 90 days.
- AIRE feature prioritization: what to build next for clients.
- Content: 10 agents generate YouTube or Instagram titles for a market-update series, then
  consensus-rank them.
- Spawning 10 sub-agents costs tokens each run. Fine on a subscription, but if running on API
  billing it needs Caleb's approval before running.

## Verification

- `consensus-report.md` exists with the three tiers and counts per idea.
- At least one idea appears that Caleb had not thought of.
- Consensus items are specific enough to act on this week.
