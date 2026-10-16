---
name: cx-variant-sampling-prompting
description: Nick Saraev's prompting habits for AI coding agents, generate many variants and pick the best instead of judging one output, dictate long context-rich prompts instead of carefully worded short ones, and remind the model it has the capability when it says it cannot. Use when Caleb says "the AI output was bad", "try again", "give me a few options", "it says it can't do that", or is about to type a short prompt for a listing description, email, proposal, landing page or any creative asset.
---

# Generate many, pick the best, and dictate your context

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapters 2 and 5 (https://www.youtube.com/watch?v=DJZISqryDfw&t=2017s), with the "you do have access" note from chapter 7 (https://www.youtube.com/watch?v=DJZISqryDfw&t=5284s)

## What Nick teaches

### 1. It is all about odds

Nick's coin analogy: if you flip a coin a few times and get heads every time, you draw conclusions about the coin from limited experience. People do the same with AI. They generate one, two or three outputs, hit a bad draw, and conclude "AI sucks."

AI output quality is distributed, not fixed. Most outputs are a B. A's are less common, C's and D's happen, F's are rare. If you only ever see trials four and six (the bad ones) you think the tool is bad. Zoom out across six trials and the average is a B, which is better than most humans.

So Nick never generates once. On camera he asks for 3 (for time). Normally he generates 20 or 30, lets the statistics play, then picks the A or A+ when one shows up. Example from the course: "build me three high-quality HTML proposal templates, fundamentally different in tone, shape, length, sections and style."

### 2. Dictate, do not type

Nick dictates most prompts (the Codex built-in dictation runs Whisper locally, he also uses a separate dictation tool that pastes into any text box). People speak 150 to 200 words per minute and type 50 to 75. Dictation gets two to three times more context out.

The old rule was that prompt structure mattered most. Now what matters most is **context**: as much as possible about what you actually want. Wording can be inefficient, a few transcribed words can be wrong, and he does not even reread the transcript. Looked at in aggregate the model understands the point. He talks to it "like a colleague in my company," the same way he managed a team of 18 or 19 people.

Typical dictated prompt ingredients: the goal, why, what it is for, examples of what good looks like, what to avoid, what to do when done ("then check with me," "then open the files so I can verify," "then test it yourself").

### 3. Add stakes and effort cues

"I want you to think really hard about this and give it your all. I'm going to be showing this to an audience of over 500,000 people. Go for it."

### 4. Remind it that it can

In chapter 7 the model said twice it did not have access to set up a cloud task. Nick replied "Yes, you do. Just proceed," and it did. A model only knows what is in its context window. If it believes it lacks a capability, tell it that it has it and point it to the docs or tool so it loads that into context.

### 5. Have it test its own work

Append "test this yourself" and "open the files so I can verify" rather than waiting for you to find the bug. Nick says this is faster every time.

## Step by step

1. Before prompting, decide how many variants you want. Default 3 for speed, 10 to 30 when the asset matters (proposal template, landing page, listing campaign).
2. Dictate the prompt. Cover goal, audience, examples, constraints, what to do when done. Do not polish it.
3. Add the stakes line and an effort cue if the task is important.
4. Ask for the variants to be fundamentally different, not minor edits of each other.
5. Review all variants side by side. Pick the best, or combine the best parts.
6. Give feedback as a dictated list of changes while looking at the output. Nick's chapter 5 example asked for a signature canvas, a simulated payment page and a contrast fix in one message.
7. If the model says it cannot, reply that it can and tell it where to look.
8. Close with "test it yourself and open the result for me."

## Templates / prompts

Variant request:

```
My goal is [goal]. Build me [N] versions of [asset].
Make each one fundamentally different in tone, shape, length, sections and style.
First generate hypothetical examples, later we will turn the winner into a template.
Think really hard about this. This will go in front of [audience]. Go for it.
When done, open the files so I can verify them.
```

Revision pass (dictate while looking at the outputs):

```
These are fantastic. I want [N] changes.
First, [change one with the reason].
Second, [change two].
Finally, [small fix you noticed, e.g. the green text on the green circle is hard to read, fix the contrast].
Then test it yourself before telling me it is done.
```

Capability nudge:

```
Yes, you do have access to that. Read the [tool/docs] and proceed. Do not ask me again unless you hit a credential you need from me.
```

## Pitfalls Nick calls out

- Judging the tool from one or two draws.
- Writing short, carefully structured prompts that are low on context.
- Rereading and correcting dictation transcripts. Not worth the time.
- Accepting "I can't do that" from the model at face value.
- Waiting for the model to finish instead of parallelizing (see `cx-parallel-subagents`).

## How Caleb should use this

- Listing descriptions: ask for 10 variants in different voices (luxury, family, investor, first-time buyer), pick one, keep the rest as a tone library.
- Seller outreach letters and expired or FSBO scripts: 20 variants, pick 3 to A/B test. Sending them needs Caleb's approval.
- AIRE landing pages and client dashboard layouts: 3 to 5 fundamentally different designs before committing to one.
- Dictate client context after every showing or consult and paste it in. More context beats better wording.
- When Claude Code says it cannot reach a connector or MCP, tell it that it can and have it check the tool list.

## Verification

- At least 3 variants exist before any decision is made.
- The chosen variant is better than the first one generated (if it is always the first, the sampling is not real).
- Feedback messages are lists of concrete changes, not "make it better."
