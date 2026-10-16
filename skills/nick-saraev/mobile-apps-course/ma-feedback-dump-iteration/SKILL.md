---
name: ma-feedback-dump-iteration
description: Runs Nick Saraev's build-then-walk-through loop: test the app in Chrome, voice-dump every issue into one batched prompt, ask for developer test controls and seed data, queue follow-up messages while Claude works, and stop at the 80/20. Use when Caleb says "walk through the app and fix what's broken", "here's a list of things I noticed", "add a dev mode so I can test this", "fill it with fake data", "do the whole thing not just phase one", or is iterating on any AIRE or KW app after the first build.
---

# Walkthrough, Voice Dump, and Batched Iteration

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 12-13 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=2269s), chapters 27-28 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=8329s), and the "meta loop" in chapter 32 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10762s)

## What Nick teaches

After the first build, Nick never fixes one thing at a time. He walks the whole app, narrates every issue by voice, and sends one wall of text. This is the technique that produced most of the three apps in the course.

### The loop

1. **Test in Chrome first.** Ask Claude to "open it in Chrome, not Expo, so I can test locally." Shrink the window to phone width and zoom to 150-200% so you can see it. Chrome is faster for catching layout bugs. The phone comes later.
2. **Walk every screen and narrate.** Nick uses a voice transcription tool and talks through what he sees: invisible text, wrapping, misaligned cards, buttons that do nothing, math that looks wrong ("exercise is 3% after one day, that looks like a 30-day window not 7"), missing confirmation on a reminder, no way to create a custom challenge.
3. **End with the 80/20 line and a single instruction:** "I'd say that's probably the 80/20. Go through everything top to bottom, implement those changes, then open it in another Chrome tab. I'll test it."
4. **Always ask for a developer testing view.** Nick's first request after any build with time-based logic: "I need some sort of testing view for a developer so I can modify the day of the challenge or trigger the event that occurs when we hit 3 days." Claude added buttons: simulate full challenge completion, force complete challenge, reset onboarding, clear all data. For the Pomodoro app he asked for a dev mode that triggers every tree growth state. For CalTracker: "add a bunch of entries to the database so I can see what this app would look like fully populated."
5. **Queue messages while Claude works.** "I don't have to wait for Claude to finish the previous thing to start something new, especially if it's unrelated." Design tweaks go in while a feature is still building. He also uses `/btw` to ask a side question (like "describe this app as an image-generation prompt") without interrupting the build.
6. **Repeat two or three times** until the app is at the 80/20, then move to the phone (`ma-three-tier-testing-loop`).
7. **The meta loop (chapter 32):** once the app works, tell Claude to "open up every individual page of the app and ideate small improvements to usability and load speed, then implement them." Claude does both ideation and implementation. You review at the end. Nick ran this for about 6 minutes and 24,000 tokens.

### Prompt style Nick uses

- Plain, spoken English, specific about where and what: "the Remind At text spills over into two lines", "the habit type selectors have the same font color problem", "capitalize the R in Morning run".
- Guesses at the cause when he can: "there may be a div behind it with the same background color."
- Praise first, then the list ("Excellent job. This looks fantastic. The first thing I want to change is...").
- Explicit about intent: "make sure I 100% know what I'm about to say before I direct this AI, because I am spending tokens."
- When Claude "fundamentally misunderstands" a layout problem after two tries, he switches to a screenshot loop with Chrome DevTools MCP instead of describing it again (see `ma-design-upgrade-loop`).

### When Claude proposes phases
"Claude is going to try and conserve tokens and not try as hard as it realistically can." Reply: "I'd like us to do all of it, including phases 1 through 4."

## Step by step

1. Ask Claude to open the app in Chrome. Resize to phone width.
2. Reset state first (reset onboarding, clear all data) so you test as a new user.
3. Walk every screen. Dictate or type one line per issue: screen, element, what is wrong, what you want instead.
4. Add requests for a dev/testing panel and seed data if time, streaks, or history are involved.
5. Close with "that's the 80/20, implement top to bottom, then open a new Chrome tab."
6. While it works, queue unrelated small fixes as separate messages.
7. When it finishes, refresh, re-walk, repeat. Stop when the remaining issues are cosmetic.
8. Run the meta loop prompt once before moving to phone testing.

## Templates / prompts

Walkthrough dump (Nick's structure):

```
Excellent job, this looks fantastic. Here's what I want changed:

1. I need a developer testing view so I can [advance the day / force-complete the challenge / trigger the end state]. Right now I just have to trust it works.
2. [Screen]: the font color matches the background so the [checkmark / habit type selector / habit name] is invisible.
3. [Screen]: [stat] shows 3% after one day. Double-check the math, it looks like a 30-day window labelled 7-day.
4. [Screen]: "[text]" wraps onto two lines and left-aligns when it wraps. Keep it on one line or center it.
5. [Screen]: there's no way to confirm the reminder. Add a Set button and round the section's borders so it's seamless.
6. Onboarding: add one more screen that explains how the app works in plain words.

That's the 80/20. Go through everything top to bottom, implement those changes, then open it in another Chrome tab. I'll test it.
```

Dev tools and seed data:

```
Add a developer section at the bottom of Settings with buttons to: simulate 30 days of history (some habits at 100%, some at 50%, some mixed), force-complete the current challenge, reset onboarding, and clear all data. Then add a bunch of entries so I can see the app fully populated.
```

Meta improvement loop:

```
Open every individual page of the app in your own Chrome window, screenshot each one, and ideate small improvements to usability and the speed at which the app loads and works. Implement all of them, then give me a short list of what changed.
```

Phases pushback:

```
No, I'd like us to do all of it, phases 1 through 4. Once done, open in Chrome, not Expo, so I can test locally.
```

## Pitfalls Nick calls out

- Fixing one bug per message. Batch them.
- Trusting time-based logic without a dev panel to fast-forward it.
- Testing with an empty database. Layouts only break once there is real data.
- Describing the same layout bug three times. After two misses, switch to screenshots.
- Chrome cannot show push notifications, haptics, or sound, so the phone pass is still mandatory.
- Spending tokens on unclear requests. Decide what you want before you dictate.

## How Caleb should use this

- Walk the AIRE buyer app as a first-time buyer would: onboarding, saved homes, a showing confirmation. Dictate the list in the truck with voice-to-text and paste it in one go.
- Always ask for a dev panel that fakes "30 days of showings and feedback" so the seller dashboard charts can be checked before a single real showing exists.
- Queue copy fixes (KW First Choice wording, St. Francisville and Baton Rouge spelling, Caleb's phone number) while bigger features build.
- Run the meta loop once per app before showing it to a client. It is the cheapest polish pass.
- Nothing here sends messages or costs money beyond tokens. Any "send a follow-up text" feature that gets added during iteration still needs Caleb's approval before it goes live.

## Verification

- Each walkthrough message lists at least three to ten specific issues with screen names.
- A dev/testing panel exists and can reset state, fast-forward time, and seed data.
- After the loop, a fresh reset-and-walkthrough finds only cosmetic issues.
- Claude confirms "all phases" were built, not just the first.
