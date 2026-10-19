---
name: ma-five-step-app-design-framework
description: Turns a vague app idea into a scoped MVP using Nick Saraev's five-step framework (core function, core loop, accessory features, surface area check, retention hook) and produces the single voice-dump prompt that hands the scope to Claude Code. Use when Caleb says "scope this app", "what should the MVP be", "I have an idea for an app for my buyers/sellers", "design the AIRE client app", "too many screens", or wants to plan any mobile or web app before building it.
---

# The Five-Step App Design Framework (MVP Ideation)

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 10-11 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=1442s), reused for CalTracker in chapters 25-26 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=7689s) and the Pomodoro app in chapter 32 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10762s)

## What Nick teaches

"We can more or less do whatever we want. It's about taking all that power and orienting it in the right direction." Every good app passes through five steps, in order. When all five are written down, "you now basically have an MVP, at least the MVP you can give to Claude to turn into the actual thing. You have a scope."

### 1. Core function
The one thing that, if you stripped everything else away, would still make the app the app. Habit tracker: create a habit, tap it, it logs. CalTracker: take a photo of food, get calories and macros back. Pomodoro: an adjustable timer.

### 2. Core loop
Map one action to one reward, ideally in under 30 seconds. Games have tight, dopamine-heavy loops. A tracker's is slower, but the same idea applies. Reward stimuli Nick lists: a sound (chime) on tap, an animation on tap, confetti when a goal is hit, haptic vibration, a trophy screen at the end of a challenge. Opal (an app blocker Nick uses) grows a gem that gets shinier the longer you keep the streak. "Human beings are very tactile creatures." For the Pomodoro app the loop is: plant a seed, watch a tree grow in real time as the timer runs, phone vibrates at the end.

### 3. Accessory features
Things that wrap around the loop without changing it. Habit tracker: a log of past completions, a consistency chart, multiple habit types (daily yes/no versus counted, like eight glasses of water), optional social features. CalTracker: progress chart, calendar, history log, clean photo screen. Pomodoro: progress log, unlockable tree species, levels.

### 4. Surface area check
New builders do ten core functions, a hundred loops, a thousand features, and "before you know it your app has five million pages." Count screens. Target five to seven screens maximum (CalTracker aimed for three or four, Pomodoro two). The user should learn the app in one run-through with no explanation.

### 5. Retention hook
Create an unfinished state the user must return to. Examples: a 3-day challenge right after onboarding (you must open the app three days in a row to finish it), check-in push notifications a few hours later, "have you tracked your breakfast yet," streak congratulations, trees that wither if you do not come back within 72 hours. "Any app that tells you their goal is for you to use it once is lying to you."

### Then hand it to Claude
Nick dictates the whole thing with a voice transcription tool (he used Aqua) as one long prompt rather than typing. The pasted text shows as "pasted text #1 +8 lines." Claude maps the framework onto screens (habit tracker became six: onboarding, today, history, manage, challenges, settings) and proposes phases. Nick always replies: "No, I just want you to do the whole thing." Claude conserves tokens and effort by default, so tell it to do all phases.

### The repeatable "app design framework" diagram (chapter 25)
MVP ideation -> Build -> Design -> Test (Chrome, phone mirror, real phone) -> Add database + auth -> Test again -> Security audit -> Final end-to-end test -> Deploy. Same flow for a new app or a new feature. Nick notes you can automate most of it by putting the framework in CLAUDE.md and having Claude "just ask me all the questions."

## Step by step

1. Write the five headings and fill each in one to three sentences. Do not open Claude Code until step 4 has a screen count of seven or fewer.
2. For the core loop, name the specific reward stimuli (sound, animation, haptic, confetti, trophy).
3. For the retention hook, name the first thing the user is left unfinished with after onboarding.
4. Dictate or paste the whole thing as one prompt. End with "Build the whole thing, all phases. Once done, open it in Chrome (not Expo) so I can test locally."
5. If Claude answers with questions or plan mode (it did for the Pomodoro app: real-time growth or pre-made animation, SQLite or other persistence, default duration), answer them all at once. The recommended option is usually what you wanted.
6. If Claude proposes phases, reply that you want all of them done now.
7. Move to `ma-feedback-dump-iteration` for the walkthrough and fixes.

## Templates / prompts

Nick's habit tracker scope prompt (cleaned up):

```
I really like the app as it stands, but I'd like to level this up with an app design framework that high-quality app devs and designers use, where every app I build requires a core function, then a core loop, some accessory features, a surface area check to minimize the number of screens, and some sort of retention hook.

Core function: create and then track habits.
Core loop: every time a person creates a habit and tracks it, they need to be rewarded. Visually stimulating, haptic feedback, and ideally a sound like a chime. We also need challenges: a 3-day habit challenge immediately after onboarding, and a reward at the end of it.
Accessory features: logging so the user can see all prior habits tracked, a graph or chart of how consistent they've been, and multiple habit types (once-per-day versus volume-based like 3 or 4 times a day).
Surface area check: no more than five to seven screens. As simple as possible.
Retention hook: challenges, plus push notifications once or a couple of times a day checking whether they've done the habit.
```

Scope prompt shape for Caleb:

```
I'm using a five-step app framework: core function, core loop, accessory features, surface area check, retention hook.

Core function: [one sentence]
Core loop: [action] -> [reward: sound / animation / haptic / confetti]
Accessory features: [3 to 5 bullets that support the loop]
Surface area: [N] screens max: [list them]
Retention hook: [the unfinished state + the notification cadence]

Do it all locally to start. We'll migrate to a database later.
Build the whole thing, all phases. Once done, open it in Chrome, not Expo, so I can test locally.
```

## Pitfalls Nick calls out

- Skipping ideation: "If you don't at least have a rough idea of what you're building before you start building, you're probably not going to have a very good time."
- Letting Claude split the build into phases and stopping after phase one.
- Feature bloat that pushes past seven screens.
- A retention hook that is really just a feature. It has to leave something unfinished.
- Being over-opinionated about libraries on a first pass (Nick accepted expo-av, reanimated, and confetti even though "confetti particle bursts are very CPU heavy") because proof of concept comes first.

## How Caleb should use this

- **AIRE buyer app**: core function = see your showings and next steps. Loop = confirm a showing, get a checkmark animation and the agent gets notified. Accessory = documents, saved homes, timeline. Screens = home, showings, documents, profile. Hook = "3 homes to rate before Friday" or a weekly market update push.
- **Open house sign-in**: core function = capture a visitor in under 20 seconds. Loop = submit, confetti, "you're entered." Hook = a follow-up text 2 hours later (needs Caleb's approval before any message is sent).
- **Seller dashboard**: core function = how many showings and what feedback. Hook = weekly reflection push.
- Run the five steps on paper (or by voice in the truck between showings) before any build. Nick's whole point is scope first.
- Keep this framework in the AIRE workspace CLAUDE.md so new app sessions start by asking Caleb the five questions.

## Verification

- A written scope with all five headings exists before the build prompt is sent.
- Screen count is seven or fewer and each screen has a name.
- Claude's proposed screen map matches the scope and it confirmed it will build all phases, not just phase 1.
