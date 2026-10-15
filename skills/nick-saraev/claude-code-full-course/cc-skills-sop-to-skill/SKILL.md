---
name: cc-skills-sop-to-skill
description: Turns a repeatable piece of knowledge work (an SOP, a checklist, a thing Caleb does every week) into a Claude Code skill folder with a SKILL.md checklist and scripts, following Nick Saraev's skill structure, creation prompt and iterate-to-99% method. Use when Caleb says "make this a skill", "I do this every time, automate it", "turn my open house checklist into a skill", "build me a skill that drafts just-listed emails", or wants a repeatable AIRE workflow Claude can run on command.
---

# Turning SOPs into Skills

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 13 (skills section), 21, 22, 23 and 24 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=9329s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=9675s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=9879s)

## What Nick teaches

Skills (formerly custom slash commands) are the most economically valuable part of Claude Code in Nick's opinion. A skill is a list of instructions handed to the parent agent, unlike a subagent which runs as a separate agent. His `.claude/skills` folder is "a collection of all the things I usually do on a daily basis," each turned into a checklist: classify leads, create proposals, find outliers in his niche, auto-reply to emails, edit YouTube videos, onboard clients, apply to Upwork jobs, monitor Skool posts, shop Amazon, scrape leads, literature research. He no longer hires contractors for this work because a skill does it in a hundredth of the time for a hundredth of the cost.

Structure of a skill:

```text
.claude/skills/scrape-leads/
  SKILL.md       the orchestrator / checklist (conductor)
  scripts/       the musicians: Python scripts that do each step the same way every time
```

SKILL.md anatomy from his scrape-leads example:

- Frontmatter: `name`, `description` (what it does, then "Use when the user asks to find leads, scrape businesses, generate prospect lists, or build lead databases for any industry or location"), optionally `allowed-tools`.
- Goal.
- Inputs.
- Scripts available.
- Process checklist: test scrape of 25, verify quality, full scrape, LLM classification, upload to Google Sheet, enrich missing emails, with branches depending on how many leads are wanted.

Why it is token cheap: only the frontmatter (name and description) is loaded into context. His scrape-leads skill costs 63 tokens at rest. The full body loads only when Claude decides the skill applies or you name it. That is why a single MCP tool definition often costs more than all his skills combined.

Why scripts instead of "just do it": if it is the same thing every time, make it a defined program so it executes the same way. Claude uses the scripts like it uses Bash or web search. Claude's native intelligence is reserved for orchestration: when a step fails (his Google Sheets upload failed on a filename with spaces, his PubMed query failed the first time) it reads the error, reads a bit of docs, retries, and then updates the skill so the next run does not hit the same problem. Treat it like a junior employee with a checklist.

Results he shows: 1,000 dentist leads scraped in 87 seconds with four parallel scrapers, classified, pushed to a Google Sheet, emails enriched, ready for Instantly. Previously 30 minutes or more of his own time. He ran it in the terminal with fast mode (Opus 4.6 at about 2.5x speed for about 3x price, per him).

How he creates a skill (chapter 24, the prospect website generator):

1. Voice-dump what the skill should do: input (a Google Sheet row about a prospect), output (a website matching a template), rules (follow the template closely, find public images, make it pretty).
2. Paste a screenshot of the template site and its HTML (474 lines) so Claude can derive a style guide.
3. Paste example input data (a few rows from the sheet).
4. Send. Claude reads the other skills and CLAUDE.md for the pattern, asks clarifying questions (output location, how data is provided, image source, mockup vs pitch page) and often flips into plan mode on its own.
5. Test on one row. Give feedback ("not a fan, get pixel perfect by screenshot comparison, find a library for that", "images are all the same, get different ones"). Test on a second row. Each later run took about 30 seconds.
6. Later, turn it into a subagent to run ten in parallel (see `cc-subagents-research-review-qa`).

His accuracy ladder: first version maybe 70% right, feedback and "modify the skill so you do better next time", 80%, 90%, eventually 98 to 99%, which beats most humans.

If Claude does not know the skill format, say so and let it research it, or point it at an existing skill as the example.

## Step by step

1. Pick a task Caleb does at least weekly and could hand to an assistant with a checklist.
2. Write or dictate: goal, inputs, outputs, the checklist in order, what "good" looks like, and any stop points that need Caleb's approval.
3. Gather examples: one sample input, one example of a good output, any template.
4. Prompt Claude: build the skill in `.claude/skills/<name>/` with SKILL.md and `scripts/`, modeled on existing skills. Let it ask questions.
5. Open a fresh session (the skill must be discovered fresh) and run it on one real input.
6. Review. Tell Claude what was wrong and to update the skill so next time is right. Repeat two or three times.
7. Once it is reliable, consider a subagent wrapper for parallel runs.

## Templates / prompts

Skill creation prompt (Caleb version):

```text
Today we're creating a skill called just-listed-marketing. Input: an MLS number or a pasted listing sheet plus the photo folder path. Output: a folder with a just-listed email draft, three social captions, a one-page flyer HTML and a 30-second video script, all in my voice (see rules/voice.md) with Keller Williams First Choice branding. Process: read the listing data, pull the top five selling points, draft each piece, screenshot the flyer and check layout, then STOP and show me everything for approval. Do not send or post anything. Check my other skills for the format. Here is an example listing sheet and an example email I liked: [paste].
```

SKILL.md skeleton:

```markdown
---
name: just-listed-marketing
description: Drafts the full just-listed marketing kit (email, social captions, flyer, video script) for a new listing. Use when the user says "new listing", "just listed", "marketing kit for [address]" or gives an MLS number.
---

# Just Listed Marketing Kit

## Goal
...

## Inputs
- MLS number or listing sheet text
- Photo folder path

## Scripts
- scripts/pull_listing.py <mls>  -> listing.json
- scripts/render_flyer.py listing.json -> flyer.html

## Process
1. Pull listing data. If missing fields, ask.
2. ...
6. STOP: get Caleb's approval. Do not skip this step.

## Output
/output/<address>/ with the files above.
```

Improvement prompt after a run:

```text
Here's what was wrong: [list]. Fix the output, then modify the skill so a fresh instance gets this right next time.
```

## Pitfalls Nick calls out

- Asking Claude to do the task from scratch every time instead of encoding it. Results drift.
- Expecting 100% on run one. Plan on three iterations.
- Forgetting that a new skill is only visible in a fresh session.
- Letting a skill with purchase or send steps run fully automated. His shop-amazon skill says "STOP, get purchase approval, do not skip this step." He adds to cart and reviews himself.
- Over-long descriptions. Description is the trigger, keep it specific and short.

## How Caleb should use this

- just-listed-marketing, open-house-prep (sign-in sheet, flyer, neighborhood facts), weekly-lead-followup (read CRM export, draft touches by stage), cma-summary (turn comps into a plain-English seller summary), investor-outreach-list (scrape and classify investors in a parish, like Nick's dentist scrape).
- Every skill that produces outreach or posts ends with a STOP step. Sending, posting, or paid scraping services need Caleb's approval before running.
- Build in one session, test in a fresh one on a real listing or lead, iterate three times before trusting it.

## Verification

- `/context` shows the new skill at under 100 tokens.
- A fresh session triggers the skill from a natural phrase in the description without naming it.
- Scripts run on the sample input without manual fixes by the second iteration.
- The STOP step actually stops and shows output for approval.
