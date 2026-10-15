---
name: cx-parallel-subagents
description: Runs independent work as parallel sub-agents (fan out, fan in) so three 5-minute tasks finish in 5 minutes instead of 15, and uses fresh-context sub-agents to escape a polluted long conversation. Use when Caleb says "this is taking forever", "do these all at once", "research this from every angle", "generate 10 of these", or when a skill is generating images, drafts, proposals or research serially.
---

# Parallel sub-agents: fan out, fan in

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 5 (https://www.youtube.com/watch?v=DJZISqryDfw&t=2017s) and chapter 11 (https://www.youtube.com/watch?v=DJZISqryDfw&t=14207s)

## What Nick teaches

**Wall clock time.** A linear flow runs tasks 1, 2, 3, 4 one after another. If each takes 5 minutes, three examples take 15 minutes. In a parallel flow you start task 1, then kick off 2, 3 and 4 simultaneously. Each still subjectively takes 5 minutes, but your wall clock time is 5 minutes. The speedup is roughly the number of sub-agents. Nick says most people prompt linearly and this is the single biggest habit to change.

**Sub-agents** are separate instances spawned inside the same thread. Each gets its own prompt (Nick's three proposal runs each had a slightly different prompt), works independently, then collapses and returns results to the parent, which reports to you. In chapter 7 the content skill was taking 10 minutes per run because images were generated one after another. The fix was "use sub-agents to generate both the text and the images," plus a final independent tone-of-voice pass. Run time dropped to about 5 minutes.

**Fan out, fan in.** Start with one query, fan out to cover a lot of surface area (10 searches, 10 angles), deduplicate, then fan all results back in. Most people get the fan out but forget the fan in. You need both.

**Non-context-sharing is a feature.** Every conversation accumulates context. After 800,000 tokens of trying things, asking the same thread to "just finish this last bit" means it takes all 800,000 failure tokens as input. Nick's analogy: you spent hours writing an essay arguing the sky is green and someone asks you why it is blue. A sub-agent resets the slate: a small query, no history, goes and does the thing, comes back with the answer. Cheaper and better.

**Where sub-agents fit:**
- Research (favorite): "spawn 10 sub-agents to look up X from all angles."
- Development of *different* features: three different pages on a site, fine. Three parts of the same page, not fine, because changes step on each other.
- Anything high volume, low accuracy, where you can spawn 50.

**Cost:** 10 sub-agents cost about 10x. Nick's usage meter jumped visibly. Use the cheaper model tier for sub-agent tasks. Smarter orchestrators already delegate simple sub-tasks to lighter models.

## Step by step

1. Look at the plan. Mark which steps depend on another step's output and which do not.
2. Group independent steps into one fan-out batch. Give each sub-agent its own complete prompt and the files it needs. They do not share context.
3. Name the fan-in: what the parent must do with results (dedupe, rank, merge into one document, pick the best).
4. Pick the model tier: cheaper for the sub-agents, smarter for the fan-in.
5. Launch. Do something else while it runs.
6. Review the merged result, not the individual runs, unless something failed.
7. If a conversation has gone long and polluted, delegate the next question to a fresh sub-agent instead of the main thread.

## Templates / prompts

Parallel generation:

```
Because I'm short on time, do this as sub-agents. Create [three] independent [inputs] and run the [skill] on each simultaneously. At the end give me [three] outputs side by side.
```

Research fan out, fan in:

```
Spawn 10 sub-agents to research [topic] from different angles: [list angles]. Each sub-agent writes a short findings file with sources. Then deduplicate across all ten and fan the results back into one briefing with the top findings ranked by evidence.
```

Skill speed-up:

```
This run took 10 minutes. Inside the skill, generate the [images / drafts / sections] as parallel sub-agents, then do one final independent pass that [checks tone / merges]. Update the skill so it always runs this way.
```

Fresh-context escape:

```
Hand this question to a fresh sub-agent with only [the file] and this question: [question]. Do not pass our conversation history. Report its answer back.
```

In Claude Code, the same ideas map to the Agent tool with several agents launched in one message, and to task-scoped sub-agents that receive only the files they need.

## Pitfalls Nick calls out

- Forgetting the fan-in. Ten reports with no merge is not a result.
- Parallelizing edits to the same file or same page.
- Running expensive models for 50 throwaway sub-tasks.
- Expecting sub-agents to know the conversation. They know only their prompt.
- Serial image generation inside a skill.

## How Caleb should use this

- Neighborhood research for a relocation guide: one sub-agent each for schools, commute, taxes, flood zones, HOA, recent sales, then fan in to one page.
- Comps and pricing: sub-agents pull and summarize different data sources, parent reconciles.
- Listing marketing kit: captions, email, flyer and MLS description generated in parallel, then one tone pass.
- Seller prospecting lists: parallel enrichment of expired, FSBO and absentee-owner lists, then dedupe. Any outreach from the lists needs Caleb's approval.
- When an AIRE build session has gone in circles, delegate the stuck question to a fresh sub-agent with just the relevant file.

## Verification

- Wall clock time for the batch is close to the longest single task, not the sum.
- The parent produced a merged, deduplicated result.
- No two sub-agents edited the same file.
- Usage consumed is in line with the number of sub-agents, and cheaper tiers were used where possible.
