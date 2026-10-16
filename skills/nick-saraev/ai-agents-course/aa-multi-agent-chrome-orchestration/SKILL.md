---
name: aa-multi-agent-chrome-orchestration
description: Orchestrates many parallel browser agents, each with its own Chrome DevTools MCP instance, workspace and CLAUDE.md, coordinated through a shared chat file, to do the same web action across many targets at once (form fills, scraping JS-rendered listings, filling applications). Use when Caleb says "do this on every site", "fill out all these contact forms", "scrape rentals / listings / FSBOs from multiple sites", "spin up multiple browsers", or when a one-at-a-time browser task would take hours.
---

# Multi-Agent Chrome Orchestration

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 2, 22
and 23 (https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=134s, &t=5501s, &t=5854s)

## What Nick teaches

The course opens with the payoff demo: a list of conference leads with websites and LinkedIn
descriptions but no emails. Instead of giving up, he spawned a fleet of Claude Code agents, each in
its own Chrome browser, that navigated to each website's contact page, dynamically filled first
name, last name, email and a templated-but-personalized message, and submitted. They researched and
communicated with each other through a shared chat room. His thesis: agents are not smarter than
humans yet, but they are fast and parallelizable, so they try many approaches at once and win on
throughput.

Why parallel: one agent using a browser MCP is easy, but linear. Receive URL, launch Chrome via
DevTools MCP, navigate, screenshot, identify the form, extract fields, generate a personalized
message, fill, submit. Launch 5 seconds, navigate 5, screenshot 15, find the form a minute, and so
on: 2 to 3 minutes per form. 1,000 forms is roughly 2,000 minutes, about 30 hours. With 10 agents
you do 10 forms in the same 2 minutes (0.5 per minute becomes 5 per minute). 100 agents, 50 per
minute, so 2,000 a day takes 40 minutes. Limited only by compute.

Architecture:

- A top-level business workspace folder with an **orchestrator** (he uses Claude Opus).
- N **Chrome agents**, each with its own Chrome DevTools MCP server, its own workspace, and its own
  CLAUDE.md, with autonomy opened up so they can build their own tooling to navigate pages if
  needed.
- A **centralized chat file**. Sub-agents post progress, problems with websites, and reports there.
  Each sub-agent monitors its own task list by posting to the chat.
- The orchestrator checks the chat every 30 seconds or so.

His skill: "Orchestrate parallel browser automation using multiple Chrome DevTools MCP instances.
Use when a task requires doing the same browser action across many targets simultaneously:
submitting forms, filling applications, scraping pages that need JavaScript rendering." Steps:
determine how many agents are needed, launch all Chrome instances, reset the chat file (previous
runs leave residue), dispatch tasks.

Demo: Vancouver rental search. "I want to find a rental in Vancouver, 15-minute walk from Granville
SkyTrain station downtown, use Chrome to navigate through sites, high-quality sleek places, 2K to
2.5K, one bed, near the water, AC built in." He ran it through a prompt contract first (edited to 20
apartments, 1.2 km, south of Drake or west of Burrard), approved, and the skill spawned four
parallel Chrome agents, one per rental site (including liv.rent and padmapper.com, sites he would
not have checked himself). After about 30 seconds they picked up instructions from the main thread,
loaded their sites, adjusted filters autonomously, clicked into listings, and returned a filtered
list.

Ethics note he makes: this can be used for nefarious purposes, and many sites try to verify you are
human. Fingerprinting workarounds exist, but he deliberately does not teach them.

## Step by step

1. Define the task with a prompt contract (targets, action per target, output format, failure
   conditions, and whether submission is allowed).
2. Install the Chrome DevTools MCP for Claude Code. Confirm one agent can do the action on one
   target.
3. Create a workspace folder with `orchestrator/CLAUDE.md`, `agents/agent-N/CLAUDE.md` templates,
   and `chat.json`.
4. Orchestrator: count targets, decide N agents (one per site, or targets divided evenly), reset
   `chat.json`, launch N Chrome instances, assign each a task list.
5. Each agent: read its CLAUDE.md and task list, work through targets, post after each one (`done`,
   `blocked: <reason>`, `result: <data>`) to `chat.json`.
6. Orchestrator polls chat every 30 seconds, reassigns blocked targets, compiles results into
   `results.md` or a CSV.
7. Spot-check a sample of results by hand.

## Templates / prompts

Agent CLAUDE.md:

```
# Chrome agent <N>
You own one Chrome DevTools MCP instance. Work ONLY the targets in tasks.md.
For each target:
1. Navigate. Screenshot. Find the contact form (or the listing filters).
2. Extract fields. Fill using the template below, personalized from the
   target's name, site, and description.
3. Submit ONLY if submit_allowed is true in tasks.md. Otherwise stop before submit
   and screenshot the filled form.
4. Append {"agent": <N>, "target": "...", "status": "done|blocked", "note": "..."}
   to ../chat.json.
If a site blocks you or needs a login, mark blocked and move on. Never retry more
than twice. Never enter payment details.
```

Orchestrator prompt:

```
Use multi-agent Chrome orchestration. Targets: targets.csv (<count> rows).
Spawn one agent per <site|20 targets>. Reset chat.json first. Poll chat every
30 seconds. submit_allowed=false for this run. Compile results.md with one row
per target: status, extracted data, screenshot path.
```

Message template (contact forms):

```
Hi <first name>, I came across <company> and <one specific line from their site>.
<One-sentence reason for reaching out>. Would a quick call make sense this week?
<Caleb's signature>
```

## Pitfalls Nick calls out

- Linear browser work is slow (2 to 3 minutes per form). Parallelize or accept the hours.
- Stale chat.json from previous runs confuses the orchestrator. Reset it.
- Sites detect automation. Do not build fingerprint evasion, and respect sites that block you.
- Moving windows while agents click confuses them.
- Fast models or fast mode burn credits. Budget before running hundreds of targets.

## How Caleb should use this

- Pull FSBO and expired listings from multiple public sites in the St. Francisville and Baton Rouge
  area into one sheet (read-only scraping, no submissions).
- Research investor or builder prospects: visit each company site, extract contact page info and a
  one-line description for Caleb to review. No form submissions without approval.
- Cold outreach via contact forms to builders, property managers or relocation companies: run with
  `submit_allowed=false` first, review the filled screenshots, then a submit run. Submitting forms,
  sending messages or anything that contacts people needs Caleb's approval before running.
- Rental or comp research for a client relocating to the area, one agent per listing site.
- Check that any site's terms allow automated access before scraping it.

## Verification

- N Chrome windows open, each working a different target set.
- `chat.json` fills with one entry per target, and blocked entries have reasons.
- `results.md` row count matches the target count, and a manual spot check of 5 rows is accurate.
