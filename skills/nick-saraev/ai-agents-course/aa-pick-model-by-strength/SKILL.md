---
name: aa-pick-model-by-strength
description: Chooses which AI agent platform or model (Claude Code, Codex/GPT, Gemini/Antigravity) to use for a given job based on Nick Saraev's observed strengths and weaknesses. Use when Caleb asks "which model should I use for this", "should this be Claude or Gemini", "why does the design look clunky", "who is best at front end / back end / video", or when setting up a new AIRE feature (client dashboard UI, backend API, video walkthrough analysis) and the choice of model is open.
---

# Pick the Model by Its Strength

**Source:** Nick Saraev, "AI Agents Full Course 2026: Master Agentic AI (2 Hours)", chapters 5-6
(https://www.youtube.com/watch?v=EsTrWCV0Ph4&t=798s and &t=1349s)

## What Nick teaches

There are three major agent platforms as of his recording: **Codex** (OpenAI, GPT 5.4 series),
**Claude Code** (Anthropic, Claude Opus), and **Antigravity** (Google, Gemini 3.1 Pro). Setup is the
same shape for all three: sign up, download the desktop app, pick a folder, type a request. Claude
Code requires a paid plan (he quoted the Pro plan at $17/month annual or $20/month monthly, and prices
may have changed). Nick says he gets a 100x to 200x return on that money and tells people to bite
the bullet and earn it back in the first month.

The UX differences (thinking tabs, queued messages, "steer" to send immediately, plan mode) are
flavors of the same thing. The differences that matter are intelligence and specialty, and Nick
stresses they are small, a few percentage points, and only matter at the frontier. Mostly they come
from which model was trained most recently, and that resets each generation. He demoed the same
prompt ("make a brief portfolio site about Nick Saraev, super simple and minimal") on all three.

**Claude (Claude Code)**
- Pros: most interpretable reasoning. You can see every decision in real time, so you can steer,
  stop, pause or hand it new resources halfway through. Best for orchestration and agentic
  workflows. Most consistent day to day. "A partner you build things with."
- Cons: slower unless you use fast mode (which burns a lot of credits). Weaker at front-end design
  than Gemini.

**Gemini (Antigravity)**
- Pros: best at design and front ends (his demo produced the sleekest site). Superior multimodal
  abilities, including native video understanding through the Gemini API. Fast output.
- Cons: least interpretable. Quality inconsistent ("some days incredible, some days craps the bed").
  No dedicated paid fast mode.

**GPT (Codex)**
- Pros: best at back-end programming and "absolute mathematics." Great at test-driven development:
  outline the definition of done and it fires autonomously until it gets there. Biggest ecosystem
  and most documentation (first major player).
- Cons: less interpretable than Claude. Design output was more complex and clunkier in his demo.

Nick's rule: Gemini and GPT are missiles (set the target and go), Claude is a partner. You can also
just pick one model and use it. Everything else in the course works on any platform.

## Step by step

1. Name the job: UI/design, backend/API/tests, video or image understanding, or orchestration and
   judgment.
2. Map it: design or multimodal go to Gemini. Backend, math, TDD go to Codex/GPT. Orchestration, review,
   anything you want to watch and steer → Claude.
3. If the difference does not matter for the task (most tasks), stay in Claude Code to avoid paying
   for two subscriptions and fragmenting context.
4. Only go multi-model when a few percentage points of quality actually matter (see
   aa-multi-model-mcp-orchestration).

## Templates / prompts

Decision table to paste into a project CLAUDE.md:

```
## Model routing (from Nick Saraev's course, may have changed)
- Front-end / visual design / video understanding: Gemini
- Backend / API / math / test-driven builds: Codex (GPT)
- Orchestration, review, anything I want to watch and steer: Claude Code (default)
- When in doubt: Claude Code. Do not add a second platform unless quality is measurably short.
```

## Pitfalls Nick calls out

- Treating "Claude is better than GPT at X" as a religious war. The gaps are tiny and change every
  generation.
- Paying for every platform "just in case." Only do it if you are at the frontier where the few
  points matter.
- Fast mode in Claude is great but eats credits. He spent about $500 in tokens making this one
  video.
- Prices and model versions he quoted (Pro at $17-20, GPT 5.4, Gemini 3.1 Pro, Opus 4.6) will be
  outdated.

## How Caleb should use this

- AIRE client-facing dashboards and listing landing pages: consider Gemini for the visual pass, then
  bring the code back into Claude Code for integration. Any new paid subscription needs Caleb's
  approval before running.
- AIRE backend (CRM sync, follow-up scheduling, lead scoring): Codex or Claude Code are both fine, and
  Claude Code is the default because Caleb can watch it work.
- Property video walkthroughs or recorded webinar analysis: Gemini's video understanding is the tool
  (see aa-video-to-action-pipeline).
- For everyday REALTOR tasks (listing copy, follow-up emails, CMA summaries) stay in Claude Code.
  The difference is not worth the context switch.

## Verification

- You can state in one sentence why the chosen model fits the job.
- If you added a second platform, you can point to a concrete quality gap it closed. If not, remove
  it.
