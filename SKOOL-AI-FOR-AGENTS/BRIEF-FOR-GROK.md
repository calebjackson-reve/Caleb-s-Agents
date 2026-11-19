# Brief for Grok bot: how a Skool lesson gets made, and how to command Claude Code to make one

Written 2026-11-19 by Claude Code. Sister file to `aire/video/BRIEF-FOR-GROK.md`.

**Who does what** (Caleb, 2026-11-19): Grok is the chief of staff. It takes Caleb's ask, checks the tools, writes the command and checks what comes back. Claude Code is the worker. It writes and builds, and reports what it checked. Caleb approves, films and posts.

If you only read one part, read "The lingo card" and "How to command Claude Code". The rest is the evidence.

## Read this first: what this audit can and cannot say

The video brief audited a job Claude Code did that same day, so every step had a number. This one is different.

- **Claude Code did not make a Skool lesson in the session that wrote this.** The audit is built from the repo's logs and from three finished lesson videos in Caleb's Drive.
- **There is no record of how the three finished videos were made.** Not who wrote the scripts, not which tool made the video. Caleb says the lingo came from ChatGPT. That is his word and it is not in any file Claude Code could find.
- So this brief has two halves. The Blueprint and Proof say what is on record. "How to command Claude Code" is a recommended process built from that record and from what worked on the video job.

## Blueprint

### What Claude Code did for Skool, from the repo's log

1. **Researched the market.** Scanned Skool groups and tore down two big AI communities to copy what works.
2. **Wrote the foundation.** Goal, mission, seven values, a five-question content check.
3. **Wrote ten lessons.** Each file has a teaching plan (goal, psychology idea, the one win, screen demo, rule on screen) and a word-for-word script marked `[On camera]` and `[Screen]`.
4. **Wrote the 7-day challenge.** Eight scripts, a launch post and a welcome message.
5. **Built a shot board.** One storyboard card per video: frames, time bar, shot list, on-screen text.
6. **Wrote the production playbook.** When to film, how to set up, how to edit in CapCut, upload and safety checklists.
7. **Wrote the group copy and a pinned post.** Everything paste-ready. Nothing was pasted into Skool by Claude Code.
8. **Stopped at the approval gate.** Caleb films, edits, approves and posts.

### What the finished lessons show, from their transcripts

Every finished lesson follows the same order:

1. **The promise, with a time on it.** What you will have by the end.
2. **Show it working first.** A quick demo before any setup.
3. **Setup, one click at a time.** Which page, which button, Mac or Windows.
4. **Money, with the date it was checked.**
5. **Safety.** Passwords, two-step sign in, what never goes in the chat.
6. **The core move.** Paste one starter prompt and let the AI interview you, one question at a time.
7. **What you made.** Two files: an agent profile and a stack list.
8. **The guardrail line.** The agent reviews and sends. Not legal advice. Broker and state rules win.
9. **One action and a Skool step.** Do the interview, post a screenshot in the wins section, no client info.
10. **Name the next lesson.**

Each lesson also points at a lesson PDF with the starter prompt and a setup checklist.

## Proof

### The repo record

| Step | Where | When |
|---|---|---|
| Skool research, 291 groups, two teardowns | `programs/ai-for-agents/skool-research.md`, `skool-teardown-ais-chase.md` | 2026-10-12 |
| Foundation, production playbook, challenge scripts | `FOUNDATION.md`, `PRODUCTION.md`, `challenge/` | 2026-10-12 |
| Ten lessons | `programs/ai-for-agents/lessons/01` to `10` | before 2026-10-12 |
| Shot board, 8 cards, rendered in a browser with no errors | `SKOOL-AI-FOR-AGENTS/shot-board.html` | 2026-10-12 |
| Group copy | `skool-group-copy.md` | 2026-10-14 |
| Roadmap check | `ROADMAP-CHECK-2026-10-15.md` | 2026-10-15 |
| Pinned post, compliance passed | `posts/ai-office-in-a-day.md` | 2026-10-19 |

Source for all rows: `SKOOL-AI-FOR-AGENTS/STATUS.md`. As of that log, nothing had been filmed.

### Skills and tools on record

| Used | For what |
|---|---|
| `ns-25k-roadmap` skill | Checking the project against Nick Saraev's 22 steps |
| `teardown` skill | The lesson built from a pasted video transcript |
| A compliance check | The pinned post. The log says "compliance passed" and does not name the skill. `ai-compliance-check` is the one in the repo (inference) |
| Live web fetch | Skool research. Skool blocked the server on the group's own page |
| A headless browser | Rendering the shot board to prove it loads |

Loaded and with no record of use on lessons: the HeyGen skill, HyperFrames, invideo, the social media skill pack (scripting, talking head, hooks), the brand voice plugin. Nobody tested whether they would help.

### The finished videos in Drive

| File | Uploaded (UTC) | What the transcript shows |
|---|---|---|
| "Lesson 1: Why I Built an AI Transaction Coordinator" | 2026-11-16 18:35 | No repeats found on a read-through. Roughly 600 words |
| "AI Setup Foundation: AGENT-PROFILE + STACK", first upload | 2026-11-17 18:22 | **A block of roughly 230 words appears twice** |
| "AI Setup Foundation: AGENT-PROFILE + STACK", second upload | 2026-11-17 19:05 | A different, rewritten script under the same title. Transcript is partial |
| "Avatar Video" | 2026-11-17 19:05 | A third take on the same lesson |

These belong to a course called AI TC Masterclass, taught on Grok bot. The repo's ten lessons belong to AI for Agents, taught on Claude and ChatGPT. **They are two different courses.** The Drive folder "AI TC Masterclass, Production Studio" has ten numbered subfolders and no files in them.

### Problems found while writing this brief

| Problem | Evidence |
|---|---|
| A passage repeats in a finished video | First upload of AI Setup Foundation: from "I tell it my CRM, email, calendar" through "Understand which platform you're using first" is in the transcript twice. A second, shorter passage about vibe coding also repeats. It could be an edit mistake or a transcript glitch. Someone has to watch it |
| Two videos with the same title and different scripts | The two AI Setup Foundation uploads. No record says which one is final |
| All ten repo lessons are far shorter than they claim | Each says 8 to 11 minutes. Each holds 358 to 510 words, about 2.5 to 3.5 minutes spoken. Screen demos add time, but not that much |
| A claim nobody verified | "Grok bot uses a Cursor account to sign in." It is in both versions. Claude Code could not check it |
| The repo lessons do not use the lingo below | The word "y'all" appears zero times in the ten scripts. Four of ten use the word "prompt" before explaining it |

## The lingo card

This is the "vibe code lingo". Every rule is taken from the three finished transcripts, in Caleb's own words. Any new lesson should pass every line.

| Rule | Straight from the lessons |
|---|---|
| Open with the payoff and a time | "In about 6 minutes, you'll have your AI app, your account, a safe login" |
| Or open on a moment they have lived | "Have you ever been driving down the road juggling three different deals?" |
| Talk to a room of friends | "y'all", "What's up, guys", "Let's get into it", "I'll see y'all there" |
| Explain every tech word the second you say it | "A prompt is just instructions you give AI" |
| Vibe coding gets one plain sentence | "Instead of writing computer code, you're explaining what you want in plain English" |
| The new assistant on day one is the main picture | "You wouldn't just hand them your laptop and hope for the best" |
| Use house pictures for safety | "Kind of like locking your front door and setting the alarm" |
| Lower the bar out loud | "No coding, no computer science degree, and I'm not a tech guy either" |
| One app at a time | "I don't want y'all bouncing between five different apps before we've even started" |
| Money gets a date and a warning | "When I checked on November 17th, 2026 ... Prices can change, so always check the official page" |
| Talk people out of overspending | "Don't buy the biggest toolbox when you haven't figured out which tools you need" |
| Be honest about what is not working | "I'd rather know what's missing than pretend everything works" |
| The agent stays in charge | "AI doesn't need to run your business. It needs to help you run your business better" |
| End on doing, not perfect | "Your setup doesn't have to be perfect. It just needs to be yours" |

**How it sounds.** Short sentences. One idea each. "Now," and "So," to move along. A question, then the answer. No hype words. No sentence a tech person would say to another tech person.

**What it never does.** It never asks for a password in the chat. It never marks something as connected unless it was checked. It never sends without the agent pressing send.

## Unknowns

- **Who wrote the finished scripts and what made the videos.** The folder names suggest HeyGen and an avatar. That is a guess from a title, not a fact.
- **What ChatGPT's original instructions were.** No prompt, no voice guide and no sample from ChatGPT is in the repo or Drive. The lingo card is rebuilt from the output.
- **Which AI Setup Foundation video is final.**
- **Whether the repeated passage is in the video or only in the transcript.**
- **The full lesson list for AI TC Masterclass.** Only Lesson 1 and the setup lesson were found, plus the name of the next one: "Make your account in 10 minutes".
- **Whether Claude Code can make the video itself.** It has never been asked to on record. On the listing video job it built from real footage with ffmpeg. An avatar or screen-recorded lesson is a different job.
- **What a lesson costs or how long one takes.** Nothing was timed.

## How to command Claude Code

### Before you send the command, check these

```bash
python3 SKOOL-AI-FOR-AGENTS/lesson_check.py programs/ai-for-agents/lessons/03-follow-ups-that-get-answered.md
```

It should print eight checks and end with a word count. Then confirm three things by asking Caleb or reading `SKOOL-AI-FOR-AGENTS/STATUS.md`:

- Which course the lesson is for. AI for Agents and AI TC Masterclass are not the same.
- Which app the lesson teaches on. The finished lessons use Grok bot.
- Where the last finished lesson is, so the new one can match it.

### What to put in the command

| Give this | Why |
|---|---|
| The course and the lesson number | Two courses exist and their voices differ |
| The one thing the agent will have at the end | Every finished lesson opens with it |
| The target length in minutes | Claude Code's ten scripts all ran about a third of their stated length |
| The app and the exact page to start on | Setup is taught one click at a time |
| Any price to mention, with the date you checked it | The lessons date every price |
| The starter prompt, or "write one" | The core move of each lesson is one prompt that interviews the agent |
| The files the agent ends up with | Agent profile and stack, in the setup lesson |
| The one action and where to post it in Skool | Every lesson ends on it |
| The name of the next lesson | Every lesson names it |
| "Use the lingo card in `SKOOL-AI-FOR-AGENTS/BRIEF-FOR-GROK.md`" | Without it Claude Code writes in the older, flatter voice |
| A transcript of the last finished lesson | The surest way to match the voice |

### Order of work to ask for

```
1. Read SKOOL-AI-FOR-AGENTS/STATUS.md and the transcript of the last finished lesson.
2. Write the teaching plan: goal, the one win, the demo, the rule on screen.
3. Write the script in the ten-part order from this brief, in the lingo card's voice.
4. Count the words. 150 words is about one minute spoken. Fix the length before anything else.
5. Write the lesson PDF text: the starter prompt and the setup checklist.
6. Write the Skool post for the lesson.
7. Run lesson_check.py on the script. Fix every flag or say why it stays.
8. Check every fact that can go stale: prices, page addresses, menu names. Date each one.
9. Hand Caleb the script, the PDF text, the post, the check output and a list of what was not verified.
10. After the video is made: get its transcript and run lesson_check.py on it with --spoken.
```

### What to demand back

- The `lesson_check.py` output, pasted, not summarized.
- The word count and the minutes it works out to.
- Every price and page address, with the date it was checked and where.
- A list of claims that were not verified.
- Which lingo card rules the script uses, and any it breaks on purpose.

Do not accept "sounds like Caleb". Ask which lines came from the card.

### What Claude Code will not do

- Post to Skool, or schedule or send anything. Caleb posts.
- Put a client's name, number, address or message in a lesson, a prompt or GitHub.
- State a price or a product fact without the date it was checked.
- Write a motivation question that touches a protected class. Timeline, money and goals only.
- Use the brokerage name beyond what Keller Williams First Choice allows.
- Call a script the right length without counting it.
