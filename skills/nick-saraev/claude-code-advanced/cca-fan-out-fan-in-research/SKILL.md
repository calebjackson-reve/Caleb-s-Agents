---
name: cca-fan-out-fan-in-research
description: Parallelizes research or analysis by fanning out to several cheap subagents (Sonnet or Haiku) that each take a different angle, then fanning in to one Opus synthesizer that merges overlaps and scores outliers, following Nick Saraev's fan-out/fan-in pattern. Use when Caleb says "research this from several angles", "compare these APIs or CRMs", "find the best tool for X", "analyze my market", "competitor research on other Baton Rouge agents", or any question where one long single-thread research run would be slow and bloat context.
---

# Fan-Out / Fan-In Research with Cheap Researchers and a Smart Synthesizer

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 8 and 9 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=2068s and https://www.youtube.com/watch?v=UPtmKh1vMN8&t=2527s)

## What Nick teaches

**Why parallelize.** Four reasons:

1. Autonomous agents take a long time now (Nick has had Claude work 15 minutes on one task). Sitting and watching is not productive. Parallel work turns one 15-minute wait into a few short ones.
2. Many tasks have independent steps. Four 5-minute steps done serially take 20 minutes. Run three of them in parallel plus a 2-minute integration step and it takes 12 minutes, about 60% of the original.
3. Agents are stochastic. Run the same prompt three times and you get different answers (his demo: three tabs asked for "five ways to improve this codebase" returned overlapping but different lists). Running n times and keeping unique answers covers far more of the solution space, roughly 2.5x in his sketch.
4. Model performance degrades as context grows. Fresh subagents each stay in the "zone of good" instead of one agent sliding down the curve.

**The pattern.** For a research query (his example: "find the best APIs for my feature"):

- Old way: one thread visits site 1, 2, 3, 4 sequentially, context grows, quality drops, then synthesizes. About 25 minutes and poorer output.
- Fan-out: the orchestrator spawns n research agents at once, each with its own fresh context and a slightly different axis.
- Fan-in: a synthesizer agent gets a different, shorter prompt: "here is context from other models that already did the research. Integrate anything that overlaps, note the outliers, and score them differently." About 10 minutes total and higher quality.

**Model tiering.** Research is token-heavy but mostly extraction, so use cheap fast models (Sonnet, or Haiku). Synthesis needs reasoning, so use Opus. As Nick quoted pricing at recording time, Opus 4.6 was $5 per million input tokens and Sonnet 4.6 was $3, so research costs drop about 60% before counting output tokens. Prices may have changed. He cites Anthropic's own research that Opus orchestrating Sonnet subagents outperforms Opus alone on both time and quality.

**His live prompt** fanned out six Sonnet agents, each on a different optimization axis (architecture, etc.), then Opus produced a ranked list of high-impact easy fixes and medium-effort fixes. All six ran simultaneously using plain subagents, not agent teams.

He uses this for far more than code: business system design, process optimization, product pricing and packaging, competitor research.

## Step by step

1. State the question in one sentence and decide the minimum number of researchers (Nick's default is 5 or more).
2. Tell Claude explicitly: fan out, model for research, model for synthesis, minimum subagent count.
3. Let the orchestrator assign each researcher a different axis. If it does not, list the axes yourself (for a CRM comparison: pricing, integrations, texting, lead routing, reporting).
4. Wait for all researchers to return. Do not add instructions mid-run, it muddies contexts.
5. Synthesizer step: merge overlaps, keep outliers with a note on who raised them, rank by impact and effort.
6. Save the result to `active/research/<topic>-<date>.md` so it does not pollute the root or the main context.
7. Optionally run a second fan-out on the top finding to go deeper.

## Templates / prompts

Nick's prompt, cleaned up:

```
Use a fan-out / fan-in researcher-synthesizer pattern to research the question: "How best should I optimize this codebase?" Minimum five subagents. Use Sonnet to do the research and individual contemplation, Opus to synthesize. Each researcher should take a different axis. The synthesizer should integrate anything that overlaps, flag outliers, and score them by impact and effort.
```

Reusable version:

```
Fan out at least {N} research subagents on: "{QUESTION}". Use {CHEAP_MODEL} for the researchers, {SMART_MODEL} for the synthesizer. Assign each researcher a distinct angle: {AXIS_1}, {AXIS_2}, {AXIS_3}, ... Each researcher returns a bulleted list with sources. Then fan in: the synthesizer merges overlapping findings, keeps outliers labeled as outliers, ranks everything by impact versus effort, and writes the report to active/research/{slug}-{date}.md.
```

Synthesizer system prompt snippet:

```
You are the synthesizer. You did not do the research. Below are reports from {N} independent researchers. Integrate anything that overlaps into a single finding and note how many researchers agreed. Keep outliers (raised by only one) in a separate section. Score each item: impact (high/med/low) and effort (easy/med/hard). Lead with high-impact, easy items.
```

## Pitfalls Nick calls out

- One long thread does the same work slower and worse because context keeps growing.
- The synthesizer prompt must be different from the researcher prompt. It should be shorter and about integration, not about doing research again.
- Every delegation step away from you dilutes faithfulness to the original query. Keep the axes explicit.
- Using Opus for raw extraction wastes money and time. Tier the models.
- Pricing figures are as of his recording and may have changed.

## How Caleb should use this

- Tool selection for AIRE: "fan out five Sonnet researchers on the best texting plus CRM stack for a solo Keller Williams agent, Opus synthesizes." Axes: pricing, MLS integration, drip automation, mobile app, compliance.
- Market research: parallel researchers on St. Francisville and Baton Rouge pricing trends, days on market, new construction, school zones, investor activity, then one ranked report.
- Competitor research: each researcher studies one competing local agent's marketing (social, listings presentation, reviews), synthesizer finds gaps Caleb can own.
- Listing strategy: researchers on pricing comps, staging, photography, launch timing, buyer demographics, synthesizer produces the launch plan.
- Reads of public websites are fine. Anything that scrapes at volume, posts, or messages people needs Caleb's approval before running.

## Verification

- You see multiple subagents running at once (Nick zoomed out and saw all six).
- Each researcher's output is short and focused on its axis.
- The synthesizer report has a consensus section with agreement counts, an outliers section, and impact/effort scores.
- The main session's `/context` stays small since the research lived in subagent contexts.
