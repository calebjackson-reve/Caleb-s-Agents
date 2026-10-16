---
name: vc-model-handoff-context-backup
description: Protects a long AI build against rate limits and context exhaustion the way Nick Saraev does, by checkpointing progress into GEMINI.md, logging every change in updates.md, and when Gemini or Claude runs out of usage, asking the current model to write a comprehensive handoff prompt so the other model (or a fresh instance) can pick up without re-traversing failed paths. Use when Caleb says "I hit the usage limit", "Gemini is rate limited", "switch this to Claude Code", "save where we are", "the model forgot what we did", "context window is full", or before any AIRE build that will run longer than an hour.
---

# Model handoff and context backup

**Source:** Nick Saraev, "VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)", chapters 19, 34, 45 (https://www.youtube.com/watch?v=gcuR_-rzlDw&t=4015s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=10933s, https://www.youtube.com/watch?v=gcuR_-rzlDw&t=17772s)

## What Nick teaches

Two things kill long builds: **context windows** (Opus 4.6 had 200k with a 1M option, Gemini 3.1 Pro similar, and most of it gets eaten by the model's own thinking) and **rate limits** (Gemini 3.1 Pro High cut him off roughly an hour into autonomous work on three of the four apps, resetting every 2 to 3 hours by his estimate). He ran out of Claude budget too and raised his spend limit. So he builds in checkpoints.

### Checkpoint 1: GEMINI.md snapshot
Before moving from local to Supabase on the client dashboard: "I'm going to ask it to save everything it's done so far into a GEMINI.md that effectively encapsulates what this app is, everything we've done so far, and then provides instructions for future models in case we need to pass this off." A high-level summary of where you are, what is done, and what to do next. "Almost like a backup of where we are right now... my fallback."

### Checkpoint 2: updates.md running log
For Splinter: "Along the way, document each update in an updates.md file so that we have a history of tracked changes in case something occurs or I need to feed this into another version of the model." It logs technical decisions, feature implementations and significant changes. "This is almost like a GitHub repo before I get all the pushing logic in, but it gets to take advantage of AI summarization so I'm not going to have to load the codebase every time." He also imagined feeding `updates.md` to both models so they "debate which features are better," a cheaper version of agent teams.

### The handoff when the limit hits
On the lead scraper, after Gemini died an hour into an Apify bug:
1. In the same Antigravity chat, switch the model picker to **Claude Opus 4.6** (it still has the conversation context).
2. Prompt: "**First generate a comprehensive prompt that includes everything we've talked about so far so I can paste it into another version of CC.**"
3. Copy that prompt. Open Claude Code (fast mode on if speed matters), paste, say "**proceed**."
4. Claude fixed the remaining bug and finished the migration. "We were 99% of the way there right before I ran out of tokens. Just needed another model to get it over the line."
Going the other direction: "I asked Claude to give me a detailed project description of everything currently occurring and all of its current context so I could immediately segue that into the conversation with Gemini."

On Splinter, after 40 minutes: "I've exported our conversation history and that updates file," then continued in Claude Code with the Anthropic key wired up.

### When not to switch
"You don't really want to jump around between one model and the next unless you can either fully export the conversation history or do some sort of midway summary." And: "I don't like combining multiple models while I'm in the middle of a development session... this thing has processed so many tokens, it has so much history of past design decisions that it inherently gets what I'm trying to say. If I had Gemini pick up where Claude left off, it would basically have to redo the entire job of retraversing all of those failed paths." So: finish the current phase (for example the Supabase migration) in the model that has the context, then hand off at a phase boundary.

### Cost levers
- Claude: usage settings > extra usage > monthly spend limit (he moved it from $600 to $700 with 86% used). Fast mode roughly 2.5x speed for 3x price at the time.
- Gemini: free but limited, wait for the reset.
- The pairing is also a feature: when one is throttled, the other works, and the second model becomes an unbiased reviewer of the first.

## Step by step

1. At the start of a big build, add to the prompt: "Document each update in updates.md as you go."
2. At every phase boundary (functionality done, design done, DB wired, deployed), ask for a `GEMINI.md` (or `CLAUDE.md`) snapshot: what the app is, what is done, what is next, how to run it.
3. If a limit hits mid-phase: switch the model in the same chat and ask for a comprehensive handoff prompt. Paste into the other tool. Say "proceed." Finish the phase there.
4. If a limit hits at a boundary: open the other tool fresh with `GEMINI.md` + `updates.md` attached.
5. Note the reset time the rate-limit message gives you. Plan the next phase around it.
6. Before raising spend limits or enabling fast mode, decide the budget for this build.

## Templates / prompts

Snapshot request:
```
Before we proceed, save everything we've done so far into GEMINI.md: what
this app is, the stack, the pages and their status, every design decision
(fonts, colors, sentence case, borders not shadows), what is working, what
is not, and step-by-step instructions for a future model to continue from
here. Keep it high level, no code.
```

Handoff prompt request (same chat, after switching model):
```
First, generate a comprehensive prompt that includes everything we've
talked about so far: the goal, the stack, what's built, what's broken, the
exact error we're on, what we've already tried and ruled out, the .env key
names, and the next three steps. I'm going to paste it into another model
to continue.
```

Receiving side:
```
[paste handoff prompt]
Also read @GEMINI.md and @updates.md. Proceed.
```

GEMINI.md snapshot layout:
```
# <App> status snapshot (<date>)
## What it is
## Stack and how to run
## Done
## In progress / known issues
## Design rules
## Next steps (in order)
## Keys live in .env as: ...
```

## Pitfalls Nick calls out

- Switching models mid-bug without a summary makes the new model repeat every failed path.
- Context full with no snapshot means the model "barely remembers what we talked about initially."
- Usage resets are on the provider's clock, not yours.
- Fast mode and raised limits add up fast ($70 in a session).

## How Caleb should use this

- Every AIRE repo gets a `GEMINI.md` or `CLAUDE.md` snapshot plus an `updates.md` so Caleb can pause for a showing and resume days later without re-explaining.
- When Gemini throttles during a listing-site build, hand off to Claude Code with the generated prompt rather than waiting.
- The snapshot doubles as documentation for any developer or KW tech partner Caleb brings in later.
- Raising Claude's spend limit or turning on fast mode: needs Caleb's approval before running.

## Verification

- `GEMINI.md` and `updates.md` exist in the project root and the latest entries match the current state of the app.
- A fresh chat given only those two files plus the handoff prompt can correctly describe the next step before touching code.
- After a handoff, the second model does not re-attempt approaches already listed as ruled out.
