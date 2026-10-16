---
name: cca-stochastic-consensus
description: Runs Nick Saraev's stochastic multi-agent consensus: spawn n subagents with the same question but different personas, collect every idea, count how often each appears (the mode), and report a consensus list plus the high-variance outliers. Use when Caleb says "poll agents", "get consensus", "spawn n agents", "brainstorm every way to", "what are all my options for", "rank these approaches", or wants a wide idea sweep for listing marketing, lead gen, open house concepts, AIRE features, or pricing strategy.
---

# Stochastic Multi-Agent Consensus

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 10 and 11 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=3489s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=3972s)

## What Nick teaches

Because agents are stochastic, the same prompt returns different answers each run. Consensus turns that into a feature. Picture agent 1 returning A, B, C, agent 2 returning B, C, E, and agent 3 returning A, B, Q. A synthesizer counts the **mode** (frequency): A appears twice, B twice, C twice, D once, E once, Q once. The decision is a weighted sum, roughly 2A + 2B + 2C + D + E + Q. You get two things at once:

- The statistically most likely answers (what many agents independently agreed on).
- The genuine outliers (one agent out of three, or one out of 24, suggested it). These can be the most valuable ideas, and they also filter hallucinations because a bad idea rarely shows up twice.

Conceptually this maps the solution space quickly: a fixed set of ways to solve something and a fixed set of ways not to, scanned in parallel instead of one agent plodding through.

**His skill.** He has a skill named `stochastic-multi-agent-consensus`. Its description: break a query into n other queries ("spawn n agents") with the same or slightly different prompt to independently analyze a problem, then aggregate results by consensus. Use for decision-making, ranking options, strategic analysis, or any problem where you want to filter hallucinations and surface high-variance ideas. Trigger words: consensus, poll agents, stochastic consensus, spawn n agents.

**Live demo.** Prompt: "Use stochastic multi-agent consensus to determine all of the different ways you could make a nice-tasting sauce using tomatillos. I want every agent to come up with at least 10 independent responses, then have them synthesized and turned into a giant list." It spawned 10 agents with the same base prompt but different personas: a conservative tradition-minded chef, an adventurous boundary-pushing chef, one who challenges conventional wisdom, one who reasons from first principles, and so on. Result: 119 raw ideas, 52 unique after deduplication, delivered as a consensus report (salsa verde cruda, tomatillo avocado crema, aguachile verde, down to outliers like a tomatillo beurre blanc).

He points out this is how labs throw many model runs at hard math problems, and that with dedicated or local infrastructure you could leave it running constantly on long-standing problems.

## Step by step

1. Write the question so each agent can answer it independently in one pass.
2. Pick n (Nick used 10) and the minimum ideas per agent (he asked for at least 10).
3. Assign each agent a distinct persona or framing so the runs diverge on purpose rather than by chance.
4. Run all n in parallel with fresh contexts.
5. Synthesizer: deduplicate, count frequency per idea, sort by count, then list the single-vote outliers separately with the persona that raised them.
6. Write the consensus report to `active/consensus/<slug>-<date>.md` (Nick stores skill outputs in a named subfolder under `active`, see `cca-workspace-organization`).
7. If the results look promising, follow with `cca-model-chat-debate` so agents can argue over the list.

## Templates / prompts

SKILL.md for a consensus skill (modeled on Nick's description):

```markdown
---
name: stochastic-multi-agent-consensus
description: Spawn n agents with the same or slightly different prompt to independently analyze a problem, then aggregate results by consensus. Use for decision-making, ranking options, strategic analysis, or any problem where you want to filter hallucinations and surface high-variance ideas. Triggers on "consensus", "poll agents", "stochastic consensus", "spawn n agents".
---
# Stochastic multi-agent consensus
1. Extract from the user's message: the topic, n (default 10), min ideas per agent (default 10).
2. Build n personas that differ in framing (traditionalist, boundary-pusher, contrarian, first-principles, cost-focused, speed-focused, customer-eye, risk-averse, data-driven, creative).
3. Spawn n subagents in parallel. Each: "Brainstorm at least {min} independent {ideas} for {topic}. You are {persona}. Return a numbered list, one line each."
4. Synthesize: deduplicate, count occurrences, sort descending. Section 1: consensus (count >= 2). Section 2: outliers (count = 1) with persona attribution. Include raw and unique totals.
5. Save to active/consensus/{slug}-{YYYY-MM-DD}.md and summarize the top 5 in chat.
```

Invocation (Nick's wording, generalized):

```
Use stochastic multi-agent consensus to determine all of the different ways I could {GOAL}. I want every agent to come up with at least 10 independent responses, then have them synthesized and turned into one giant deduplicated list with counts and outliers.
```

## Pitfalls Nick calls out

- One agent could produce a list, but the odds it is as differentiated or covers as much of the space in the same time are very low.
- Personas should differ or you are paying for near-duplicates.
- The count is a signal, not a verdict. Outliers are often where the interesting ideas are (and sometimes where the terrible ones are, like husk tea).
- This trades tokens for time. Keep subagents on cheaper models where reasoning depth is not needed.

## How Caleb should use this

- Listing launch ideas: "poll 10 agents on every way to market a historic home in St. Francisville." Consensus gives the safe plan, outliers give the hook nobody else is using.
- Lead generation: consensus on all the ways a Keller Williams First Choice agent can get seller leads this quarter, with personas like investor-minded, farm-area door knocker, content creator, referral networker.
- AIRE roadmap: spawn agents on "features AIRE should have for buyer follow-up," then build the ones with the highest count first.
- Pricing or offer strategy on a tricky listing: 10 agents reason independently, consensus report shows where they agree.
- Pure thinking, no external actions, so no approval gate. If a follow-up step would send emails or post content, that needs Caleb's approval before running.

## Verification

- n subagents visibly run in parallel with distinct personas.
- The report states raw idea count and unique count (Nick: 119 raw, 52 unique).
- Consensus items carry a count, outliers carry a persona attribution.
- The report file exists under `active/consensus/`.
