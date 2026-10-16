---
name: aw-parallel-agents
description: Runs multiple agent instances in parallel, both to build a workflow three to five different ways at once in isolated tmp folders and pick the winner, and to split day-to-day work across two to four side-by-side terminals or across Claude, Gemini and GPT to stay under rate limits. Use when Caleb says "try a few approaches at once", "which way is best", "run these at the same time", "I'm hitting my usage limit", "speed this up", or when an AIRE build has several viable architectures and testing them one by one would take hours.
---

# Parallel Agents

**Source:** Nick Saraev, "AGENTIC WORKFLOWS: Build & Sell AI Automations (2026)", chapters 23 and 34
(https://www.youtube.com/watch?v=MxyRjL7NG18&t=12197s and &t=17675s), with the three-approach hack
from chapter 22 (&t=11299s) and the day-to-day demo in chapter 35 (&t=18034s)

## What Nick teaches

Parallelization is "all you're really doing is opening multiple terminal instances." VS Code,
Antigravity and any terminal let you open panes and run Claude Code, Gemini or GPT in each. Nick
arranges three vertically (left, middle, right). Two simultaneous agents is his average baseline,
four is his soft max before it becomes counterproductive. "Feeling productive is not the same thing
as being productive." Beyond four, most agent time is spent waiting for you to notice the tab.

**Spread across models.** Frontier models are at similar intelligence levels now. If one plan has
strict rate limits (he mentions a $200/month Claude Max plan with extra credits after the
threshold), run one Claude, one Gemini, one GPT instance. Because `CLAUDE.md`, `GEMINI.md` and
`AGENTS.md` are identical, there is no functional difference. You also get slightly different ways
of working, which helps during building.

**Parallel building (the main use).** Instead of one first-pass build, say: "give me three distinct
approaches with in-depth steps for each, because I'm going to send this to another model. Include
pros and cons." Then open one instance per approach, each with a dedicated working folder (`tmp/1`,
`tmp/2`, `tmp/3`), and tell each: "you're currently working in this folder because we're creating
three copies of a similar build with three different approaches, so files don't cross." Test all
outputs side by side on speed, reliability and cost. Scores like 75%, 84%, 99% make the choice
obvious. Move the winner into `directives/` and `execution/`, then retest everything because file
references change. "Three builds in the same amount of time. Best one wins." The cost of exploring
is "basically free" relative to the cost of intelligence, and you cover the search space in a tenth
of the time.

**The five-agent demo (chapter 23).** Prompt: "five best approaches, be comprehensive" for HVAC
companies in Texas. Scaffold for each child: "Your task is to build a lead generation workflow
according to the below details. I'm giving similar tasks to five other agents. Since you're in the
same workspace, do all your work in a new tmp/test3 folder." He handed out API keys as each asked
(Google Places, an email finder, Apollo, Apify), dropped the ones with painful hiccups, standardized
the test (50 leads each), caught a bad lead (a Neuralink employee in an HVAC list) and asked one
agent to double-check its filters, refined the LinkedIn search by industry instead of keyword, then
said: "turn this into directives, or merge these directives and executions with the main branch
using approach one, then update everything so file paths are correct." Cost: a few dollars in API
calls and some plan usage, far cheaper than no-code dev time. He can also combine: "build a unified
workflow that combines the best of X, Y and Z."

**Trade-offs to weigh when picking:** speed vs cost, reliability vs complexity (one script beats
ten), breadth vs depth, and sometimes human judgment. Steering at the start is "the highest return
on investment time you will ever spend."

**Parallel using (chapter 35).** Three panes: left runs a post-kickoff agency flow from a
transcript, middle runs a YouTube outlier scraper, right pulls and answers community posts. He sits
above all three and chimes in where needed.

## Step by step

1. Send the bullet-point spec to one agent and ask for 3 (up to 5) distinct approaches with steps,
   pros and cons.
2. Open one terminal pane per approach. Set bypass permissions.
3. Paste the scaffold prompt with the approach text and a unique `tmp/<n>` folder into each.
4. Supply API keys and inputs as each one asks. Drop any approach that hits a wall too big to bother with.
5. Standardize the test (same input, same size) and run all survivors.
6. Compare on speed, reliability, cost and output quality. Spot-check results for bad data.
7. Merge the winner (or a combination) into the main `directives/` and `execution/` and retest from
   a fresh session.
8. For daily work, keep two to four panes, one task each, and spread across models if limits bite.

## Templates / prompts

Approach request:

```
I want to build [a seller-lead workflow that finds likely sellers in
St. Francisville and Baton Rouge, enriches contact info and loads a Google
Sheet]. Give me 3 distinct approaches with in-depth steps for each. I'm
sending them to other instances to build. Include pros and cons so I
understand the trade-offs.
```

Child scaffold:

```
Your task is to build the workflow described below. I'm giving similar
tasks to 2 other agents in this same workspace. To avoid conflicts, do ALL
your work in tmp/approach_<n>/. Do not touch directives/ or execution/.
Build, test on 20 records, and report speed, cost and result count.

<approach text>
```

Merge:

```
Approach 2 won. Merge its directive and scripts into the main directives/
and execution/ folders, update all file paths, delete tmp/approach_*, and
run a fresh end-to-end test.
```

## Pitfalls Nick calls out

- More than four agents. You become the bottleneck and productivity drops while feeling high.
- Letting parallel builds share folders. Files cross and break each other.
- Skipping the retest after merging. Paths and references shift.
- Trusting lead quality without spot checks. Filters can be loose.
- Free-tier API keys during tests. They may not support the needed endpoints (his free Apollo key
  could not enrich).

## How Caleb should use this

- Build AIRE's seller-lead finder three ways at once (public records, expired and FSBO lists,
  geographic farming) and keep the one with the best verified-contact rate.
- Run daily work in three panes: lead follow-up drafts, listing marketing, CRM cleanup.
- Spread between Claude and Gemini when a plan limit hits mid-day.
- Parallel tests that hit paid data APIs multiply cost. Cap each test at a small batch and get
  Caleb's approval before running volume.
- Any outbound messages produced by the winning workflow still need Caleb's approval before sending.

## Verification

- Each parallel build lives in its own `tmp/approach_<n>/` folder with no writes outside it.
- A comparison table exists (approach, time, cost, result count, quality notes).
- After merge, `tmp/approach_*` is gone and a fresh session runs the winner cold.
- Caleb can explain why the winner won in one sentence.
