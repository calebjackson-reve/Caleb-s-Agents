# Course notes: How to Build Mobile Apps with Claude Code: Full Course (2026)

- **Instructor:** Nick Saraev
- **URL:** https://www.youtube.com/watch?v=BMMcmmnjrM8
- **Length:** 243 minutes, 36 chapters
- **Skill prefix:** `ma-`

## Nick's core thesis

Anyone who can type an English sentence into a terminal can ship a real iOS and Android app with Claude Code. Build it web-first in Expo + React Native, start with everything stored locally, and only then add an API, a database, and auth, in that order. Scope every app with five steps (core function, core loop, accessory features, surface area check, retention hook), then run one repeatable pipeline: ideate, build, design, test on Chrome then a phone mirror then the real phone, add Supabase, test again, run a security audit in a clean session two or three times, test once more, deploy. The habit tracker, CalTracker, and Pomodoro apps are means to an end. The pipeline is the lesson. You are "converting tokens and money to features," so manage context, batch your feedback, and let Claude run the terminal.

## Chapter-by-chapter

| # | Chapter | One line |
|---|---------|----------|
| 1 | Introduction | Promise: a real app on your phone plus store links, no prior mobile experience needed. |
| 2 | Showcasing the Habit Tracker | Demo of a habit tracker built in under 5 minutes. Same UI runs locally and on the phone. |
| 3 | Understanding the Development System | Build web-first, then port to phone. Progression from local app to API to database to auth. |
| 4 | Building the App from Scratch | The habit tracker is a means to an end. The end state matches the Cal AI style app. |
| 5 | Setting Up Claude Code | Sign up (Pro is enough), chat versus Claude Code, the "space invader." |
| 6 | Using the Claude Code Interface | Web, desktop, or an editor. Nick uses Antigravity with the Claude Code extension. Sanity-check build of a one-page site. |
| 7 | Transitioning to Mobile | Three paths: Expo/React Native (chosen), Flutter/Firebase, Capacitor. |
| 8 | Exploring Frameworks | Why not Flutter (Dart, opinionated Material UI) or Capacitor (website wrapper). |
| 9 | Getting Started with Expo | `/clear`, scaffold prompt, skip-permissions toggle, Expo Go, QR code, "do it for me in a new terminal window," test on the real phone. |
| 10 | Designing a Successful App | The five-step framework explained with the habit tracker. |
| 11 | Crafting the MVP | `/init` to write CLAUDE.md, `/clear`, voice-dump the five-step scope to Claude. |
| 12 | Implementing Features | Claude maps scope to six screens, "do all phases". Test in Chrome. First big feedback dump incl. a developer testing view. |
| 13 | Finalizing Design and Functionality | Second and third feedback passes. Icon count, reminder confirmation, checkbox styling. |
| 14 | Testing on Your Phone | Expo server in a new terminal, AsyncStorage v3 error, cut-off icons, safe-area padding, thumb reach, notification permission timing. |
| 15 | App Development Insights | Update CLAUDE.md after MVP. Push to GitHub for rollback. Rename folder and repo. |
| 16 | Transitioning to Cloud Storage | Why a database: data must outlive the device. Nick's first DB took weeks, now 30 seconds. |
| 17 | Database Integration with Supabase | App, device cache, cloud DB diagram. Auth needed to scope data per user. The database prompt. |
| 18 | Setting Up User Authentication | Claude's proposed architecture (email/password, Postgres tables, local-first cache, auth screen). Parallelize Supabase setup. |
| 19 | Implementing AI Features (actually DB finish) | Create Supabase project with automatic RLS, paste URL/keys/CLI commands, `supabase login` in own terminal, disable confirm email, verify tables live. |
| 20 | Enhancing User Experience | Two AI features defined: smart coaching nudges and reflection summaries. |
| 21 | Smart Coaching Implementation | Architecture: app, Supabase Edge Function on a schedule, DB read, Claude API, DB write, app, push. |
| 22 | Finalizing App Security Measures (mostly AI build) | Build the AI features, API key in .env, auto cadence, 10 sample outputs, no em dashes, simulated toast, tunnel email-verification bug, intro to why security matters. |
| 23 | Security Risks | The audit prompt, severity/CWE table, fix all, clear and re-run two or three times. TestFlight mention. |
| 24 | Transitioning to New App Features | Recap of capabilities. Next app is a Cal AI lookalike. |
| 25 | Building the CalTracker App | The standardized app design framework diagram (ideate, build, design, test x3, DB, test, audit, test, deploy). |
| 26 | Core Functionality of CalTracker | Five-step scope for CalTracker dictated as one prompt. |
| 27 | Designing the CalTracker Interface | New folder, scaffold, API key, first run. Fix fetch errors. Photo analysis works. Onboarding with goal and Mifflin-St Jeor plan. |
| 28 | Improving User Experience | Calendar, edit entries, image thumbnails, reminders per meal, back-date logging. Start the design upgrade from a Cal AI screenshot. |
| 29 | Finalizing the App Design | Palette from a color-scale tool, monochrome icons, serif test, corner radius. |
| 30 | Testing and Debugging | Harmonize pages, Chrome DevTools screenshot self-loop, weight tracking, truncation rules, phone pass. |
| 31 | Integrating the Database | `/compact` at 200-300k tokens, Supabase project with automatic RLS, Dribbble-inspired sign-in, cache-first fixes. |
| 32 | Enhancing App Functionality | Meta improvement loop, load-time optimization with before/after numbers, status bar icon color, security audit again. Pomodoro app scoped and scaffolded. Plan mode and subagent research. |
| 33 | App Performance Insights (Pomodoro design) | GPT Image mockups, images folder, crop assets, pixel-perfect loop, gradient masks, regenerate sprites individually, Supabase, security audit passes. |
| 34 | Security Audits and Final Touches | Final Pomodoro pass. The simplest apps with a strong loop win. Intro to the submission guide. |
| 35 | Preparing for App Submission | app.json/eas.json, EAS build, developer accounts, privacy and support pages, eas submit, App Store Connect fields, TestFlight, post-launch. |
| 36 | Monetizing Your Skills | Pitch for Maker School community and Nick's other Claude Code courses. |

## Skills created

| Skill | What it does | Trigger phrases |
|-------|--------------|-----------------|
| `ma-mobile-framework-choice` | Pick Expo/RN vs Flutter vs Capacitor and set the local-to-cloud stage plan | "should this be an app or a website", "what framework", "App Store and Play Store" |
| `ma-expo-workspace-setup` | Claude Code in an editor, scaffold Expo, Expo Go QR loop, new terminal window | "start a new mobile app", "get this on my phone", "QR code isn't showing" |
| `ma-five-step-app-design-framework` | Scope an MVP: core function, core loop, accessory, surface area, retention hook. One voice-dump prompt | "scope this app", "what should the MVP be", "too many screens" |
| `ma-feedback-dump-iteration` | Chrome walkthrough, batched issue list, dev testing panel, seed data, queued messages, meta loop | "walk through and fix", "add a dev mode", "fill it with fake data", "do the whole thing" |
| `ma-three-tier-testing-loop` | Chrome, mirror, real phone. Phone-only bugs. Load-time pass | "test on my phone", "works in Chrome not iPhone", "icons cut off", "feels slow" |
| `ma-claude-md-context-hygiene` | /init, update CLAUDE.md, /clear, /compact, Ctrl+O, /btw, queue messages | "Claude forgot how the app works", "tokens are high", "/init this" |
| `ma-github-checkpoint` | Repo + README + push, naming, rollback | "back this up", "push to GitHub", "can we go back" |
| `ma-supabase-database-auth` | Supabase project with automatic RLS, hand-off of keys, login, email confirm off, local-first cache, verify tables | "add a database", "add login", "sync across devices" |
| `ma-ai-features-edge-functions` | Scheduled Edge Function to Claude API, .env key, sample outputs, no em dashes, simulated toast, push | "add AI to the app", "weekly summary for sellers", "where do I put the API key" |
| `ma-security-audit-loop` | Clean-session audit prompt, severity/CWE table, fix, re-run 2-3 times | "is this app secure", "before we launch", "check the Supabase policies" |
| `ma-design-upgrade-loop` | Reference screenshots, palette scale, monochrome icons, fonts, harmonize, Chrome screenshot self-loop | "make this look professional", "match the look of this app", "pick a palette" |
| `ma-ai-generated-visual-assets` | Image-model mockups, images folder, crop assets, pixel-perfect loop, gradient masks, single sprites | "custom illustrations", "generate the icons", "sprites are cut off" |
| `ma-app-store-submission` | app.json/eas.json, EAS build, developer accounts, privacy and support pages, eas submit, App Store Connect, TestFlight | "put this on the App Store", "privacy policy for the app", "TestFlight" |

## Top 5 takeaways for Caleb

1. **Scope before you build.** Five lines (core function, loop, accessories, screen count, retention hook) dictated in one voice message is the whole spec. For AIRE: the buyer app's one thing is "see my showings and what's next". Everything else is accessory.
2. **Local first, then API, then database, then auth.** Design the screens while data is still on the device. Adding Supabase before the design settles means re-migrating every change.
3. **Let Claude drive the terminal, and batch your feedback.** "Do this for me in a new terminal window." Walk every screen, dictate every issue, send one message, ask for a developer panel and fake data, and queue the next request while it works.
4. **The phone test is not optional.** Chrome misses cut-off icons, safe-area padding, status bar color, haptics, notifications, camera, and cellular latency. Run Chrome, mirror, real phone after every stage.
5. **Audit in a clean session, two or three times, before anyone real uses it.** Client names, phone numbers, and showing feedback are exactly the data that leaks from vibe-coded apps. Automatic RLS on, secrets in .env only, AI endpoints rate-limited, and nothing goes to a seller's phone without Caleb's approval.

## Deliberately not turned into skills

- Chapters 1, 2, 4, 24, 36: intro, demo showcase, transitions, and the Maker School pitch. No technique to capture.
- Chapters 7-8 framework comparison is folded into `ma-mobile-framework-choice` rather than a standalone "Flutter vs Capacitor" skill.
- The long demo builds (habit tracker chapters 12-13, CalTracker chapters 27-30, Pomodoro chapters 32-34) are merged into the technique skills (feedback dump, testing loop, design loop, visual assets) instead of one skill per app.
- Nick's exact security audit prompt and his submission Google Doc are course assets not shown in full. The skills reconstruct their categories and steps from what he displayed on screen and say so.
