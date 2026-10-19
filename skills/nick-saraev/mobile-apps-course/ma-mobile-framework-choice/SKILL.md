---
name: ma-mobile-framework-choice
description: Picks the right mobile app stack (Expo + React Native by default, versus Flutter/Firebase or Capacitor) and lays out Nick Saraev's web-first, local-to-cloud build progression so the app grows in safe stages. Use when Caleb says "I want to build a mobile app", "should this be an app or a website", "what framework should AIRE's client app use", "can I put this on the App Store and Play Store", or asks whether a buyer/seller portal, open house check-in app, or showing-feedback app should be native, web, or both.
---

# Choosing a Mobile Stack and the Local-to-Cloud Progression

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 3-4 and 7-8 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=131s and https://www.youtube.com/watch?v=BMMcmmnjrM8&t=652s)

## What Nick teaches

Nick's whole course runs on one opinionated stack and one build order. Decide both before writing any code.

### The three ways apps get built today

1. **Expo + React Native** (Nick's pick and the one the course uses)
   - Languages: JavaScript and TypeScript.
   - One codebase ships to iOS, Android, and the web (so the same app can live on a website too).
   - Cloud builds go through Expo's build system (EAS), which offloads the packaging and store-prep work to a standardized tool.
   - Huge ecosystem of supported libraries.
   - Hot reload on the device, which matters because you reload the app constantly while testing.
   - You design the look yourself (serif fonts, custom corner radius, custom animations, whatever you want).

2. **Flutter + Firebase** (what "everybody else" uses)
   - Language: Dart, Google's own language for its ecosystem.
   - Opinionated Material Design widgets: fast to assemble, but everything looks like a Google app and you are limited in design.
   - Tightly optimized for Firebase as the backend (fast reads and writes at enterprise scale).
   - Compiles to native ARM, so performance is excellent.
   - Nick skips it because he does not want students learning a less common language, locked into Google's UI, or worrying about high-level performance optimization before they have shipped anything.

3. **Capacitor**
   - You literally build a website (HTML, CSS, JavaScript) and wrap it so it can be exported to the app stores.
   - Device APIs (camera, haptics) come through plugins, which adds a layer between the device and your code.
   - Very easy to migrate an existing site. Nick says "you're here to learn apps first, not websites" and that optimizing for everything at once means being good at nothing in particular.

His summary: Expo/React Native "strikes a really good balance between hyper-optimized app dev in a specific language and really general website stuff."

### The development system: web-first, then phone

Build it as a web application first (something that opens in a browser), then port and optimize for phones and tablets. The benefit is that you can push the same thing out to a website and to the phone.

### The progression (left to right)

Nick draws this on a whiteboard and insists everyone understands it before building:

1. **Local app, no API, no database.** Everything stored on the device (local storage). This is the habit tracker demo.
2. **Add an API.** Wrap functionality somebody else built (an AI model, for instance) inside your app.
3. **Add a database.** Move from device storage to cloud storage so data survives devices and can be shared.
4. **Add authentication.** A login screen so the database knows whose data is whose.
5. **Cloud + API + auth + database together.** This is the shape of the app that "sold for $50 to $100 million" (Cal AI, bought by MyFitnessPal according to Nick).

The demo app is deliberately boring: "The habit tracker app is the means to an end. It's not the actual end itself." Most apps people want have the same skeleton: a database, a way to read and write to it, a front end that interacts with it, auth, and one piece of "cute little functionality."

## Step by step

1. Ask what the app must do on a phone that a website cannot (camera, push notifications, haptics, home screen icon, store listing). If the answer is "nothing," a responsive web app may be enough, but Expo still gives you the web build for free.
2. Default to Expo + React Native unless there is a hard reason otherwise (an existing Flutter team, or a finished website that only needs wrapping, which points to Capacitor).
3. Write down which stage of the progression the first version stops at. Nick starts every app at stage 1 (local only) even when he knows a database is coming.
4. Only move to the next stage after the current one is tested on a real phone (see `ma-three-tier-testing-loop`).
5. Record the choice and the stage in CLAUDE.md so every future session knows the stack (see `ma-claude-md-context-hygiene`).

## Templates / prompts

Stack decision note for CLAUDE.md:

```markdown
## Stack decision
- Framework: Expo + React Native (TypeScript, file-based routing)
- Targets: iOS, Android, web
- Current stage: 1 of 5 (local only, no API, no DB, no auth)
- Planned stages: 2 add Claude API -> 3 add Supabase DB -> 4 add Supabase auth -> 5 ship
- Why not Flutter/Capacitor: want custom design, JS/TS, single codebase, EAS builds
```

Kickoff question set to ask Caleb before scaffolding:

```
1. What is the one thing this app does that a web page cannot?
2. Who installs it: Caleb only, his clients, his team, or the public?
3. Does it need camera, push notifications, or offline use?
4. Does data need to follow the user across devices? (If yes, a DB and auth are coming, but still start local.)
5. Store listing needed, or is Expo Go / TestFlight enough?
```

## Pitfalls Nick calls out

- Picking Flutter means learning Dart and living inside Google's design system. Fine for some, but not for a first app.
- Capacitor is "even easier" but you are building a website with a wrapper, and plugins sit between you and the device.
- Trying to optimize for everything at once (native performance, perfect web, every database) means you ship nothing.
- Starting with a database on day one slows everything down. Nick's first app took three weeks, two and a half of which were "fiddling with the database." Start local.
- Tool and product details (Expo features, Cal AI sale price, Flutter specifics) are as Nick stated them in the video and may have changed.

## How Caleb should use this

- **AIRE client app**: a buyer/seller portal that shows showings, documents, and next steps is stage 3-5 material (DB + auth). Start it at stage 1 as a local demo to nail the screens, then add Supabase.
- **Open house check-in app**: camera and offline use argue for a real Expo app. Stage 1 local, stage 3 sync to Supabase so sign-ins land in the CRM later.
- **Listing marketing**: if it is just a page per listing, a web build is enough. Expo still gives that for free from the same codebase.
- **Showing feedback or team tools for Keller Williams First Choice**: stage 1 local first, then auth so each agent sees their own data.
- Any App Store or Play Store submission, and any paid developer account, needs Caleb's approval before running.

## Verification

- A one-paragraph stack decision exists in CLAUDE.md with framework, targets, and current stage.
- The first scaffold runs in a browser at localhost and in Expo Go on a phone from the same codebase.
- No database or auth code exists until the stage 1 app has passed a real-phone test.
