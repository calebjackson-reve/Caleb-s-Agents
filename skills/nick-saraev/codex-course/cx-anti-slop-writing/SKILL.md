---
name: cx-anti-slop-writing
description: Applies Nick Saraev's rules for removing AI-sounding writing from generated copy, minimum sentence length, lowercase for social, no hashtags, no bold-hook-blank-line pattern, no em dashes, cut adjectives and filler, one name per concept, and encodes Caleb's own rewrites as principles. Use when Caleb says "this sounds like AI", "make it sound like me", "too robotic", "fix the tone", or before any social post, email, listing description, Slack nudge or client message leaves Claude Code.
---

# Anti-slop writing rules

**Source:** Nick Saraev, "The Only Codex Course You Need in 2026 (4.5 Hours)", chapter 7 (https://www.youtube.com/watch?v=DJZISqryDfw&t=5284s) and chapter 8 Slack formatting notes (https://www.youtube.com/watch?v=DJZISqryDfw&t=8338s)

## What Nick teaches

Nick does not like AI writing. "It is stereotyped and the quality is poor." The slop problem is baked into the models and no rule set solves it, but rules make the post-generation edit much easier. Taste is the bottleneck. Content has to resonate and bear your signature tone.

### The tells he called out on his own outputs

- Strong bold hooks separated by an extra blank line. "A dead giveaway."
- Very short sentences used for punch: "Then they ghosted." "It was friction." Too short.
- Hashtags at the end of LinkedIn and Instagram posts. "Just do not work well."
- Em dashes. "Give away that it was an AI that messaged me."
- Information-dense compression that is "frankly near unreadable."
- Content that just points to a resource instead of saying the thing.
- Language that is not directly actionable ("fires act today" in a Slack nudge).

### The rules he dictated (became `playbook.md`)

1. Enforce a minimum sentence length.
2. Vary the case. For X, write all lowercase.
3. Drop punctuation at the end of a line on X.
4. X lines 70 to 100 characters, 3 to 4 lines per post (he first said 140 to 200, then corrected himself).
5. LinkedIn same idea, longer, no hashtags.
6. Instagram no hashtags.
7. Write like transcribed voice notes: natural, how he actually sounds.
8. Use one name for each concept. State each point once.
9. Cut adjectives, adverbs, intensifiers, filler, metaphors, cliches, rhetorical flourishes and marketing language.
10. Avoid idioms and multiple words for the same concept.

He also pointed to public "anti-slop" lists on X and an "anti-AI slop rating skill" that bans specific words, phrases, sentence openers, structural patterns, punctuation like em dashes, markdown leaking into plain text, and accuracy failures. He copied those in as well.

### What actually fixed it

Instructions got him to about 70%. The jump came from rewriting one X post himself and saying "encode that into principles and reapply." Provide examples of what you want. "Good copy today reads straightforward and matter of fact, in a way that would have raised an eyebrow a few years ago compared to the official LinkedIn voice."

### For operational messages (chapter 8)

One message per action, not a batch. Link the record at the start with a hyperlink, not pinned at the end. Speak plainly, directly actionable. Bold the company or record name on the first line. Add the dollar amount at stake. Say what kind of item it is (sales, fulfillment, internal). Use layout blocks for visual fidelity.

## Step by step

1. Collect 3 to 5 samples of Caleb's real writing (texts to clients, a listing description he wrote, a Facebook post that did well).
2. Save them as `references/voice-samples.md` and the rules below as `references/playbook.md`.
3. When generating copy, load both, generate, then run a tells check against the list.
4. If an output still reads as AI, rewrite one paragraph by hand and ask the agent to encode the difference as new principles in the playbook.
5. Repeat on the next three outputs. Stop when a 2-minute edit is all that is needed.

## Templates / prompts

`playbook.md`:

```
# Voice playbook (Caleb Jackson, Keller Williams First Choice)

Sound like a transcribed voice note from Caleb. Warm, direct, natural.
- Minimum sentence length: no fragments shorter than six words for effect
- No bold hook followed by a blank line
- No hashtags, anywhere
- No em dashes, no semicolons
- No idioms, metaphors, cliches, rhetorical questions, marketing words
- Cut adjectives, adverbs, intensifiers and filler
- One name per concept, say each point once
- Never just point to a resource, say the useful thing
- Numbers and specifics over claims
X: all lowercase, no end punctuation per line, 70 to 100 chars per line, 3 to 4 lines
LinkedIn: longer, plain, specific, no hashtags
Instagram: caption plain, carousel text at 80% of post detail
Slack or text nudges: one message per action, link first, bold the name, dollar amount, plain next step
```

Encode-from-example prompt:

```
I don't like this. Here is how I would have written it:
[Caleb's rewrite]
Compare yours to mine. Encode the differences as principles in playbook.md and reapply them to the LinkedIn and Instagram versions.
```

Tells check:

```
Scan this for AI tells: bold-hook-blank-line, fragments, hashtags, em dashes, intensifiers, idioms, repeated concepts with different names, markdown leaking into plain text. List each one found and fix it.
```

## Pitfalls Nick calls out

- Believing rules alone fix slop. They make editing easier, nothing more.
- Over-compressing for X until it is unreadable.
- Auto-posting generated copy with no human pass.
- Forgetting that operational messages are copy too. Em dashes in a Slack nudge still read as AI.

## How Caleb should use this

- Listing descriptions: plain and specific. Square footage, lot, year, what was updated, what is nearby. No "stunning" or "nestled."
- Lead follow-up texts and emails: short, warm, one ask, no hashtags, no em dashes. Sending needs Caleb's approval.
- Social posts for St. Francisville and Baton Rouge: build the voice samples from his best past posts first.
- AIRE system messages to Caleb (pipeline nudges): one per action, link first, dollar amount, bold the client name.
- Keep `playbook.md` and `voice-samples.md` in the repo so every skill loads the same voice.

## Verification

- The tells check returns zero hits on the final copy.
- Someone who knows Caleb reads it and does not flag it as AI.
- X posts measure 70 to 100 characters per line, 3 to 4 lines, all lowercase.
- No hashtags, em dashes or semicolons in any output.
