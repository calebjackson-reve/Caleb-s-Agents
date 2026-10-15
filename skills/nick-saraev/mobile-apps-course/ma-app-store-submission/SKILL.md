---
name: ma-app-store-submission
description: Takes a finished Expo app through Nick Saraev's production and submission flow: prepare app.json and eas.json (icons, splash, adaptive icon, permissions), build with EAS, set up Apple Developer and Google Play Console accounts, publish a privacy policy and support page on your own domain, run eas submit, fill App Store Connect (screenshots, description, reviewer login, pricing), and use TestFlight before public release. Use when Caleb says "put this on the App Store", "submit to Apple or Google Play", "build for production", "I need a privacy policy for the app", "TestFlight", or wants the AIRE client app installable without Expo Go.
---

# Preparing, Building, and Submitting to the App Store

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapters 34-35 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=13306s and https://www.youtube.com/watch?v=BMMcmmnjrM8&t=13502s)

## What Nick teaches

Nick compiled an end-to-end Google Doc guide (finished Expo app to submitted store listing) and recommends feeding it to Claude to automate most steps. "There's no guarantee you'll get your app onto the App Store. They have rigorous rules." He used CalTracker because it is the most complex. Expo exists to make this bearable: "submitting used to be even more of a pain before Expo."

### 1. Prepare for production
Generate and check:
- **app.json**: name, bundle identifier, version, icon, splash screen, permissions (CalTracker needed camera plus microphone/audio descriptions), runtime version policy.
- **eas.json**: Expo build profiles.
- **Icon** 1024x1024 (Nick's file was `public.png`), **splash screen**, and for Android an **adaptive icon** (foreground image on a colored background, for light and dark themes).
- Store description text ("Track your calories and macros effortlessly with Cal Tracker"), which Claude writes.
Prompt: paste the app.json/eas.json section of the guide and say "run through this configuration." Claude creates or fixes the files, applies permission fixes, and asks you to confirm your Apple ID.

### 2. Build for production
Development runs the app live through Expo. Production "crystallizes" it into a built package. Steps:
- "Okay, let's build it." Claude checks for the EAS CLI and asks you to log in.
- If your terminal is not in the project: "Give me the command with cd."
- `eas login` with your Expo account (same one as Expo Go, sign up at expo.dev/signup).
- The free tier build queue is slow. Paid tiers are faster.
- Builds appear at expo.dev under Builds (e.g. "iOS App Store build"), which produces the finished file for submission.

### 3. Developer accounts
- Apple Developer account (paid program) and App Store Connect.
- Google Play Console: sign up at play.google.com/console/signup. Nick's tip: use a business email on a Google Workspace domain (about $6-7/month) because Google's verification is already done. Also Google requires you to prove access to an Android device and test on it.
Both sign-up flows change often. Follow the current screens.

### 4. Privacy and compliance
Both stores require a web-accessible **privacy policy** and a **support page**, ideally on the same domain as your email. Nick fed Apple's submission guidelines to Claude: "I'm coming up with an app called Cal Tracker. Create a privacy policy and host it on my website." Claude wrote the policy, a support page (FAQ like "how accurate are the AI nutrition estimates? approximate, a guide, not the be-all"), and a contact method, in seconds.

### 5. Submit
- `eas submit --platform ios`. Choose "select a build from EAS," pick the build ID, log in to Apple (a stored key on the machine automated it), it attaches an App Store Connect API key and gives a link.
- 3 to 5 minutes later, App Store Connect shows the submission. Fill out, top to bottom:
  - Screenshots for 6.5-inch iPhone and for iPad (Claude opened the browser and took them, and iPad variants auto-generate).
  - Promotional text, description, keywords (all from Claude).
  - Support URL, marketing URL (your homepage), version 1.0, copyright.
  - Select the build.
  - **Sign-in for review**: a test account (email and password) the human reviewer uses to log in.
  - Release: "automatically release this version."
  - App information (name, category), age rating, content rights, app privacy (privacy policy URL, "user privacy choices URL" is optional), pricing (Nick set free), in-app purchases disclosure, not gambling.
  - Optional items are labelled. Skip them (product page preview, growth and marketing).
- Click **Submit for Review**. Reviewers reply with guidance if rejected.
- Play Store: same shapes, different form fields.

### 6. TestFlight first
"It's kind of weird to build the app and submit it immediately." TestFlight lets you give a private link to people in your network before public release. Nick skipped it for the video. Also noted earlier: Expo Go is the free, fastest test path. TestFlight is the step up for an icon-on-home-screen test.

### 7. Post-launch
Analytics, product page optimization, custom product pages, promo codes. Expo also supports over-the-air updates.

## Step by step

1. Finish the three-tier test and security audit. Push to GitHub.
2. Ask Claude to generate/verify app.json, eas.json, icon, splash, adaptive icon, permissions, and store copy.
3. Confirm Expo account, Apple Developer account, Google Play Console account exist (both cost money, so this needs Caleb's approval).
4. Have Claude write the privacy policy and support page. Publish them on Caleb's domain.
5. `eas login`, then `eas build --platform ios` (and `android`). Wait for the build.
6. `eas submit --platform ios`, pick the build.
7. In App Store Connect fill every required field. Add the reviewer login. Choose pricing and automatic release.
8. Prefer TestFlight to a few trusted users for a week or two before Submit for Review.
9. Submit. Respond to reviewer notes.

## Templates / prompts

```
Prepare this Expo app for production. Create or fix app.json and eas.json: app name "[Name]", bundle id com.[domain].[app], version 1.0.0, 1024x1024 icon, splash screen, Android adaptive icon, every permission string we actually use (camera, notifications), runtime version policy. Then write promotional text, a description, and keywords for the store listing.
```

```
Let's build it. Check whether EAS CLI is installed, tell me the exact commands including cd to this directory, and wait for me to confirm I'm logged in to EAS.
```

```
I'm building an app called [Name]. Here are Apple's App Store privacy and compliance requirements: [paste]. Write a privacy policy page and a support page with an FAQ and contact method, then host them at [domain]/[app]/privacy and [domain]/[app]/support.
```

```
Take App Store screenshots of every main screen at 6.5-inch iPhone size and iPad size, save them in store-assets/, and name them in order.
```

Reviewer login block (App Store Connect):

```
Sign-in required: yes
Username: reviewer+[app]@[domain]
Password: [strong test password]
Notes: Sign in, complete onboarding, add a sample entry. All features available without purchase.
```

## Pitfalls Nick calls out

- No privacy policy or support URL means no submission. Host them before you start.
- Screenshots must match the required device sizes exactly.
- Mismatched IDs between EAS and Apple produce errors. Paste them into Claude.
- Google Play needs a business email and a real Android device.
- Free EAS build queue is slow.
- Submitting without any real-user testing. Use TestFlight.
- The per-user API key field Nick left in CalTracker is not what you ship. The developer's key stays server-side and users pay a subscription.
- All store rules, fees, and form layouts are as of the recording and change often.

## How Caleb should use this

- The AIRE buyer/seller app is the one worth submitting. Internal KW First Choice tools can stay on Expo Go or TestFlight.
- Host the privacy policy and support page on Caleb's real estate site so the domain matches his business email.
- Reviewer login: create a demo client account with sample showings in Supabase so Apple can see the app work.
- Use TestFlight with a couple of past clients and a KW teammate for two weeks before public release.
- Apple Developer Program, Google Play Console, Google Workspace, and paid EAS tiers all cost money and need Caleb's approval. Submitting publishes externally and needs his explicit go-ahead.

## Verification

- app.json and eas.json exist with correct name, bundle id, version, icons, and permissions.
- A completed build shows in expo.dev > Builds for each platform.
- Privacy policy and support pages load publicly on Caleb's domain.
- App Store Connect shows status "Waiting for Review" after submit, with no missing-field warnings.
- A TestFlight tester installed and opened the app from a home screen icon.
