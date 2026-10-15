---
name: cca-auto-research-loop
description: Sets up a Karpathy-style auto-research loop the way Nick Saraev does: define a metric, a change method and a fast assessment, clone the autoresearch repo, write a program.md that tells the agent what it may modify and where to log results, then let it hypothesize, change, assess, keep or revert, hundreds of times, with a live dashboard. Use when Caleb says "auto research", "optimize this until it's as fast as possible", "run experiments overnight on X", "improve my Lighthouse score", "A/B my cold email or listing page copy automatically", or "make AIRE's response time better on a loop".
---

# Auto-Research: Metric, Change Method, Assessment, Loop

**Source:** Nick Saraev, "Claude Code Advanced Full Course (3 Hours)", chapters 18 through 21 (https://www.youtube.com/watch?v=UPtmKh1vMN8&t=5366s through https://www.youtube.com/watch?v=UPtmKh1vMN8&t=6523s)

## What Nick teaches

**Origin.** Andrej Karpathy (founding member of OpenAI, former head of AI at Tesla) broke his own research into a loop: hypothesize ("if I change X, the system runs faster"), execute the change, assess. If better, keep it and go again. If worse, revert and try something else. Every step is appended to a research log, which over time becomes a massive record of what moves the metric and what does not. He published it as the "autoresearch" repo.

**The repo.** Three files: `prepare.py` (fixed constants, downloads training data, trains a tokenizer, irrelevant unless you are training models), `train.py` (the thing being optimized, in his case the model, in yours the website or system), and `program.md` (the instructions). `program.md` is the important one: it tells the agent what it can modify, what it cannot, to print a summary of scores after every change, and which file to log to. Plus a progress file and a README.

**The three requirements** (Nick's rule for whether auto-research applies):

1. **A metric** to optimize. Objective and standardized. His: Google Lighthouse (performance score, LCP, FCP, TBT).
2. **A change method** that directly influences the metric. His: edit the website code.
3. **An assessment** you can run right after the change. His: run Lighthouse.

Speed is everything. If change and assessment each take 30 seconds, the loop runs 60 times an hour, 1,440 times a day. If only 2% of runs improve things by 1%, that is 1.01^30, about 34% improvement in one day. At 90 good changes it is 2.4x, at 180 it is 6x. A loop that takes 2 hours per iteration is still far ahead of a human but you will not see the vertical curve.

**Results he cites.** His own site (leftclick.ai, glassmorphism animations, many images) improved about 20%. Later in the course he says the loop he left running reached roughly 800 ms load from a baseline of 1,802. Tobi Lutke (Shopify CEO) ran it on the Shopify Liquid codebase: 53% faster combined parse plus render, 61% fewer object allocations. Recorded as Nick said them.

**His demo flow.** New folder `autoresearchtest`, cloned the repo into it ("clone this into our current folder so it doesn't end up in root"). Built a throwaway one-page portfolio site with demo data. Then the setup prompt (below). Claude read the repo files, set up the loop, and started experimenting. He asked for the dashboard to watch it work: experiments listed with FCP, LCP, size, and each change (minify CSS took size 12.9 to 10, `content-visibility: auto` and removing `scroll-behavior: smooth` produced the big FCP jump from 646 ms). Failed changes are discarded. His constraint on the real site: the page must look pixel-identical, verified by screenshot comparison.

**Running it.** By default it occupies the main thread. He notes you can say "run this in the background," or run it as a loop with the Agent SDK and an API key.

**Spectrum of involvement.** Vibe coding (human prompts, AI writes, human reviews) to agentic engineering (human directs agents) to independent research (human sets the goal and the assessment, agents run autonomously). Auto-research is the third stage.

**What else to point it at.** SaaS front end or back end ("time one request, make it instant"), small internal modules, customer-support prompts (assess hourly, 24 changes a day), cold email (his real use, 6 to 10 tests a day at 500 to 1,000 emails per test), ad creative, copy, conversion rate. Anything with enough data volume to construct the test.

## Step by step

1. Write down the metric, the change method, and the assessment command. If any is missing or slow, fix that first.
2. Create a dedicated folder, open it in Claude Code, and have Claude clone the autoresearch repo into it (not into root).
3. Put the thing being optimized in the folder (or point to it).
4. Rewrite `program.md`: the goal, what may be changed, what may not (hard constraints like visual parity), the exact assessment command, the log file path, keep/revert rules.
5. Ask Claude to set up the loop and a live dashboard. Review the first 2 or 3 experiments to confirm the assessment is really measuring the metric.
6. Let it run. Check the dashboard and the log periodically. Revert anything that broke a constraint.
7. When it plateaus, read the log for the top changes and record them in CLAUDE.md lab notes.

## Templates / prompts

Setup prompt (Nick's, cleaned up):

```
Excellent. I'd like you to create a dashboard for auto research, then set up the auto research framework to optimize the Google Lighthouse page score for index.html. Run this on a local loop and make index.html as fast as possible across LCP, FCP, TBT and performance score. Give me a live dashboard view so I can watch it work.
```

`program.md` template:

```markdown
# Auto-research program
## Goal
Maximize {METRIC} for {TARGET}. Secondary: {METRIC_2}.
## You may change
{FILES_OR_SCOPE}
## You may NOT change
- Visual output. After each change take a screenshot and compare to baseline/screenshot.png. Any visible diff = revert.
- {OTHER_HARD_CONSTRAINTS}
## Loop
1. Read research-log.md. Form one hypothesis not already tried.
2. Make one small change.
3. Run: {ASSESSMENT_COMMAND}
4. Print a summary of all scores.
5. If improved: keep, append "KEPT" entry. If not: revert, append "REVERTED" entry with why.
6. Repeat. Never stop on your own.
## Log format (research-log.md)
| run | change | {METRIC} before | after | kept? | note |
```

Constraint he used on the real site:

```
You cannot visually change the website at all. Take a screenshot and it should be pixel perfect compared to the initial one.
```

## Pitfalls Nick calls out

- `prepare.py` is model-training specific. Ignore it.
- Minor changes can break the site. Hard constraints and screenshot checks catch that.
- Some "improvements" move a vanity number (file size) without moving the real metric. Watch the metric you declared.
- Slow assessment kills the compounding. Shrink it.
- The loop blocks the main thread unless you run it in the background or via the SDK.
- Cold email and conversion tests need volume. If you cannot run 500+ per test, the signal is noise.

## How Caleb should use this

- AIRE or listing landing pages: Lighthouse loop exactly as Nick ran it, with the pixel-parity constraint, so pages load fast on a buyer's phone. No approval needed, it is local.
- Lead response time: metric is time from inbound lead to first drafted reply, change method is the AIRE prompt and pipeline, assessment is a replay of 50 past leads. Keeps the loop local.
- Seller cold outreach copy: metric is reply rate, change method is the email or letter template, assessment needs real sends. Needs Caleb's approval before running since it sends messages and costs money, and runs only 6 to 10 tests a day like Nick.
- Listing description quality: metric is a rubric score from a QA agent, change the prompt, assess on 30 past listings.
- Social post hooks: metric is engagement, change the hook formula, assess weekly. Publishing needs Caleb's approval before running.

## Verification

- Folder contains the cloned repo, your `program.md`, `research-log.md`, and the dashboard.
- Log grows with KEPT and REVERTED rows and the declared metric moves in the right direction over tens of runs.
- Hard constraints hold (screenshots match, nothing user-visible broke).
- Dashboard updates live while the loop runs.
