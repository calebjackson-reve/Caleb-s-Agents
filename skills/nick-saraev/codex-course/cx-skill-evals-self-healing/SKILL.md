---
name: cx-skill-evals-self-healing
description: Hardens a skill or automation after it works once by running it many times, scoring the runs, feeding failures back so the skill patches itself, and pruning wasted steps so it runs in half the time and tokens. Use when Caleb says "it worked once but failed the next time", "make this more reliable", "why is it inconsistent", "make the skill faster", "this is eating my usage", or before promoting any AIRE skill to a scheduled or cloud run.
---

# Skill evals, self-healing and speed passes

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 10 (https://www.youtube.com/watch?v=DJZISqryDfw&t=12910s) and the speed pass in chapter 8 (https://www.youtube.com/watch?v=DJZISqryDfw&t=8338s)

## What Nick teaches

### Non-determinism

AI has randomness baked in (seeds, and at every token there are many possible next words). Run the same prompt in 5 windows and maybe runs 1, 2 and 4 work while 3 and 5 fail. So you cannot judge a skill from one output. You need an **accuracy score**: run it many times, count right versus wrong. A skill that works 95 of 100 times has a 95% score. Benchmarks are the same idea at scale (thousands of tasks, many runs each).

### The eval loop

1. Before finishing a skill, come up with a test.
2. Design the skill.
3. Run the test (many runs, or a spread of inputs).
4. Score.
5. Look at the failures. Update the skill.
6. Run again, score again. 80% becomes 85% becomes 95%.

In micro: run the skill 5, 10 or 20 times on the same inputs, score the good and bad ones, and tell it to make itself faster and better.

### Self-healing

Instead of you patching, tell the skill: "take all the mistakes from all your previous runs and patch your own skill to improve the probability you get it right the first time." Nick did this with most skills in the course. It is the main way to reduce ongoing maintenance.

### Speed and cost passes

After a slow run (chapter 8): "Review everything you did from start to finish. Run this in half the time with half the tokens. Identify what to prune, what was unnecessary, wasted discovery, explored paths you didn't need. Consolidate it in the skill." Nick says this routinely makes a skill 3 to 4 times faster. Later: "you've run this 100 times now. Go through every run in our context history and find cheaper ways to do it." The first run of anything is always the worst.

What the chapter 8 speed pass actually changed: parallel fetches of known lists instead of global search, authenticate once, resolve the delivery destination once, read details only for flagged items and in parallel, stop early when a path is unavailable, and make each delivery a transaction (send then audit).

## Step by step

1. Write the test: 3 to 10 realistic inputs with the expected properties of a correct output (not exact text). Save as `evals/cases.md`.
2. Run the skill on every case, in parallel sub-agents, 3 times each for important skills.
3. Score each run pass or fail against the properties. Record in `evals/runs/<date>.md` with the accuracy score.
4. Collect the failures. Ask the skill to read them and patch itself.
5. Rerun. Compare scores. Stop at the score Caleb needs (95% for internal drafts, higher for anything client facing).
6. Run the speed pass. Record run time and token use before and after.
7. Repeat the speed pass after every 50 to 100 real runs.

## Templates / prompts

`evals/cases.md`:

```
# consult-to-proposal evals
Case 1: transcripts/2026-10-03-smith-listing.txt
  must: client name correct, address correct, three packages present, recommended package marked, no "to be confirmed" for timeline
Case 2: transcripts/2026-10-05-jones-buyer.txt
  must: ...
Pass threshold: 95% of must lines across all runs
```

Self-heal prompt:

```
Here are the last [N] runs of the [skill] and which ones failed and why: [paste or point to evals/runs]. Take every mistake across these runs and patch the skill itself so the probability of getting it right first time goes up. Do not change the output format. Then rerun the failing cases and report the new score.
```

Speed pass prompt:

```
Review the route you took from start to finish on this run. I want the skill to run in half the time with half the tokens. Identify what to prune: wasted discovery, unnecessary exploration, repeated authentication, serial steps that can be parallel. Consolidate the lean path into the skill so it runs that way every time.
```

Cost audit:

```
This skill has run about 100 times. Go through the run history, find the cheapest reliable way to do each step, and update the skill. List what changed and the expected savings.
```

## Pitfalls Nick calls out

- Judging a skill on one run.
- Shipping the first version to a schedule without an eval.
- Hand-patching forever instead of having the skill patch itself.
- Never doing the speed pass, so the worst first run becomes the permanent run.
- Expecting 100%. Stochasticity remains. Pick a threshold and add a notification for failures.

## How Caleb should use this

- Every AIRE skill gets an `evals/` folder before it goes on a schedule.
- Listing description skill: 10 past listings as cases, properties like correct beds and baths, no banned words, under the MLS character limit.
- Lead reply drafts: 10 real inquiries, properties like answers the question asked, offers two times to talk, no AI tells.
- Pipeline champion: a seeded test board with known stale items, pass means exactly those items got one nudge each.
- Watch usage. A speed pass on the heaviest skill is the cheapest way to extend the monthly plan.

## Verification

- `evals/cases.md` exists with must-have properties, and `evals/runs/` has at least two dated scorecards showing improvement.
- The skill file changed as a result of a self-heal prompt, with the failures it addressed noted.
- Run time or token use dropped after the speed pass, with before and after numbers recorded.
