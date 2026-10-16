---
name: ma-claude-md-context-hygiene
description: Keeps a Claude Code app project cheap and sharp by running /init after the first demo, updating CLAUDE.md whenever the app changes shape, and managing context with /clear, /compact at 200-300k tokens, Ctrl+O to inspect what Claude loaded, /btw for side questions, and queued messages. Use when Caleb says "Claude forgot how the app works", "the session is getting slow or dumb", "tokens are getting high", "set up the project brain", "/init this", or starts a new session on any AIRE or KW app repo.
---

# CLAUDE.md and Context Hygiene for App Projects

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapter 11 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=2025s), chapter 15 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=3639s), chapter 22 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=5532s), chapter 31 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10566s), and chapter 33 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=11909s)

## What Nick teaches

### /init right after the first demo build
Once a rough demo exists, run `/init`. It writes `CLAUDE.md`, "the system file," which "teaches Claude every time it's initialized what the app is without it having to go through every single file on its own." The generated file covers architecture, theme, state, paths, and how to run the app. Two benefits: fewer tokens per session (most people are billed by token or burn their plan with tokens) and Claude "just knows where all the files are."

### /clear after /init and after any big milestone
After CLAUDE.md is written, `/clear`. The token meter drops back to near zero and the next prompt starts clean with CLAUDE.md loaded. Nick also clears before the security audit so the auditor has no memory of the build.

### Update CLAUDE.md when the app is no longer the beta
After the MVP is done (chapter 15), "update that CLAUDE.md again," because the file is loaded into every conversation and should describe the full functionality, not the toy demo.

### Know the token floor and watch the meter
A fresh chat already sits around 20,000 tokens: CLAUDE.md, file reads, built-in tools. Everything above that is your spend. When Claude loaded the Supabase skill and Edge Functions docs, the meter went from about 20k to about 51k. "These features are not free. We are converting tokens and money to features."

### Ctrl+O to see under the hood
Hold Ctrl and press O to expand the detailed view of what Claude is reading (for example, the full Edge Functions documentation it pulled into context). Nick does not read it all. He confirms Claude "has all the context it needs."

### /compact at 200k to 300k tokens
"After about 200,000 tokens the performance of the model tends to decrease significantly and your ability to make minor granular changes goes down." Nick's rule: at 250k to 300k, run `/compact`. It rewrites the history at roughly 50 to 60% of the length ("Fixed: app asks for camera/photo perms before launching picker") with the same information. It takes a while, so do something else meanwhile (he set up Supabase during a compact).

### /btw for side questions
`/btw` lets you ask Claude something while it keeps working on the build (Nick used it to get an image-generation prompt describing the app).

### Queue messages
You can send the next message before the current task finishes, especially if unrelated. Claude picks them up in order.

### Put the framework in CLAUDE.md (chapter 33)
Nick's own app workspace has a big CLAUDE.md containing his design framework and preferences. A new app starts with "just ask me all the questions," Claude interviews him, they plan together, then it builds. The whole chain (build, design like the top apps, Chrome tests, Supabase setup, security audit) can be driven from that file.

## Step by step

1. After the first working demo: `/init`. Read the generated CLAUDE.md once. Add the stack decision and current stage (see `ma-mobile-framework-choice`).
2. `/clear`. Confirm the token meter is near the floor.
3. Build. Watch the meter in the bottom right.
4. At 200k+: `/compact`. Use the wait to do a manual task (Supabase setup, screenshots).
5. After the MVP and after every stage change (database added, AI added): ask Claude to update CLAUDE.md to reflect the new architecture.
6. Before the security audit: `/clear`, then paste the audit prompt.
7. For a side question mid-build: `/btw`.
8. For the AIRE workspace: add the five-step framework and preferences to CLAUDE.md so new apps start with an interview.

## Templates / prompts

CLAUDE.md skeleton Nick's `/init` produces, plus his additions:

```markdown
# CLAUDE.md
This file provides guidance to Claude Code when working with code in this repository.

## What this app is
[One paragraph: core function, core loop, retention hook]

## Architecture
- Expo + React Native, TypeScript, file-based routing (app/)
- Theme: [colors, fonts]
- State: [AsyncStorage local cache -> Supabase sync]
- Key paths: app/, components/, lib/supabase.ts, supabase/functions/

## Current stage
[1-5 per the local -> API -> DB -> auth -> ship progression]

## How to run
- Chrome: npx expo start --web (open localhost:8081)
- Phone: npx expo start in a NEW terminal window, scan QR in Expo Go

## Build preferences
- Build all phases in one go, don't stop after phase 1
- Open in Chrome (not Expo) after changes
- Always include a developer testing panel
- No em dashes in any AI-generated user-facing text
```

Update prompt:

```
The app is no longer the beta demo. Update CLAUDE.md so it describes the full current functionality, the Supabase tables, the edge functions, the auth flow, and how to run and test it. Keep it tight.
```

Workspace CLAUDE.md for new apps (Nick's approach):

```markdown
## New app protocol
When I say "new app", ask me the five framework questions (core function, core loop,
accessory features, screen count, retention hook) plus target platforms. Then propose a
plan, wait for my yes, then build all phases, open in Chrome, and hand me a walkthrough list.
```

## Pitfalls Nick calls out

- Skipping `/init` and paying for Claude to re-read the whole repo every session.
- Letting a session run past 300k tokens, then wondering why small edits get sloppy.
- Reopening a folder in the editor silently resets your session.
- Pasting secrets into chat: Claude stores conversation history locally, so the key ends up in more places than the .env (see `ma-ai-features-edge-functions`).
- Token and threshold numbers are Nick's rules of thumb at recording time and may differ by model.

## How Caleb should use this

- Every AIRE repo gets a CLAUDE.md on day one with the stack, the stage, and the "build all phases, open in Chrome, add a dev panel" preferences.
- Add Caleb's non-negotiables to the workspace CLAUDE.md: KW First Choice naming, Louisiana market context, no em dashes in any client-facing copy, no outbound messages without approval.
- Run `/compact` during long listing-app sessions before the quality drops, and use the wait to do non-Claude chores.
- Use `/btw` to ask for a listing description or a buyer email while the app build keeps running.
- No cost or external side effects here. This skill saves tokens.

## Verification

- CLAUDE.md exists, describes the current stage, and is under a couple hundred lines.
- After `/clear`, the token meter sits near the floor and Claude still knows how to run the app.
- A fresh session can answer "how do I run this on my phone?" from CLAUDE.md alone.
- No session exceeds roughly 300k tokens without a `/compact`.
