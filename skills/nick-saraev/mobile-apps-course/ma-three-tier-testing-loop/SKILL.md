---
name: ma-three-tier-testing-loop
description: Runs Nick Saraev's mandatory three-tier mobile test (Chrome at phone width, then a phone mirror, then the real phone via Expo Go) and catches the phone-only bugs he hit every time: cut-off emoji icons, no safe-area padding under the status bar, invisible status bar icons, slow database round-trips, Expo Go package mismatches. Use when Caleb says "test this on my phone", "it works in Chrome but not on my iPhone", "the app feels slow on my phone", "icons are cut off", "status bar is invisible", or is about to call any AIRE or KW app done.
---

# The Three-Tier Testing Loop (Chrome, Mirror, Real Phone)

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapter 14 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=3296s), chapter 19 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=4398s), chapter 25 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=7689s), chapter 30 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=9558s), and chapter 32 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10762s)

## What Nick teaches

"Unfortunately this testing loop is mandatory and you're just going to have to do this every time you design an app." Nick runs it after every build, again after adding the database, and once more after the security audit. He budgets an extra 10 to 15 minutes per pass.

### Tier 1: Chrome (localhost)
Fastest. Shrink the window to phone width, zoom in. Catches layout, color, text wrapping, and logic bugs. Nick does most iteration here. Chrome cannot show push notifications, haptics, sound, the camera flow, or the native status bar. For notifications he has Claude "simulate a modal or toast" so he can check the wording and look before the phone pass. "The cost of verifying it in a simulated way is way lower than doing it wrong the entire way through Chrome to Expo to mobile."

### Tier 2: Phone mirror
iPhone Mirroring on Mac (Android has equivalents). You swipe with the mouse and stay on one device, so it is quick. Still no haptics, and the camera bugs out in the mirror. Nick uses it mostly for screen recording.

### Tier 3: Real phone via Expo Go
Ask Claude for an Expo server in a new terminal window, scan the QR. "It's one thing to do it here in front of you, another thing on the phone itself." What only the phone reveals:
- **Thumb reach.** Major functionality must sit where the thumb lands. A mouse reaches everything equally. A thumb does not.
- **Scroll, pull, long-press, swipe behavior** and hidden gestures.
- **Emoji and icon heads cut off** halfway on iOS. Happened on every app, never in Chrome. Prompt: "The icons are cut off around halfway through vertically, like the heads are cut off. I think this is a mobile-specific issue."
- **No safe-area padding.** The time overlaid the date. Prompt: "Add padding up top to accommodate the iPhone's bar, the black notch, battery, time, etc."
- **Status bar icons invisible.** After going dark-blue, the white time/battery/Wi-Fi icons blended in. Prompt: "My iPhone's native top bar icons are white and blend into the background. How do I force the colors?"
- **Notification permission prompt** only appears on the phone, and the better UX is to ask when the user first sets a reminder, not at launch.
- **Camera flow** can only be tested here. Nick took a photo of food on his screen to test CalTracker.
- **Scheduled notifications**: ask Claude to schedule one for one minute from now and stare at the phone.
- **Package incompatibility**: AsyncStorage v3 did not work in Expo Go. Claude pinned v2.2.0.

### Speed on the phone (chapter 32)
"Whatever it feels like on your computer, it's going to feel twice as worse on your phone." Logging an entry took 700 ms to 1 s on cellular. Prompt: "What sorts of changes are currently contributing to the very long load times?" Claude collapsed multiple database calls into one, measured before and after (home screen average 254 ms to 219 ms, about 14% faster, and roughly 560 ms of LTE network latency down to about 80 ms). Then Nick had to re-run all three tiers because core code changed.

### After the database is added
Expect new failure modes: onboarding flicker, toggles that take a second to load because they wait on the database. Nick's fix request: cache locally so toggles read instantly, sync in the background.

## Step by step

1. Chrome pass: reset state, walk every screen at phone width. Fix via `ma-feedback-dump-iteration`.
2. Ask Claude to simulate any notification, toast, or modal in Chrome so you can read it.
3. Mirror pass (optional but fast): swipe through everything once.
4. Phone pass: `Open a fresh terminal on my computer and run the Expo server. I'll scan the QR.` Scan with Expo Go.
5. On the phone check, in order: safe-area padding, status bar icon color, icon/emoji clipping, thumb reach of primary buttons, scroll and long-press, notification permission timing, camera, haptics and sound.
6. Paste every error line from the Expo terminal or the phone's red bar into Claude verbatim.
7. If anything feels slow, run the load-time prompt and ask for before/after numbers.
8. If core code changed in step 7, repeat from step 1.
9. Schedule a push for one minute from now and confirm it arrives.

## Templates / prompts

Phone bug dump (Nick's actual list):

```
Great stuff, but on the phone:
1. The icons are cut off around halfway through vertically, like the heads are cut off. I'm seeing it on the star emoji, the confetti emoji on Today, and across other pages. Mobile-only, not in Chrome.
2. There's no vertical space at the top. The time overlays the date. Add padding to accommodate the iPhone's status bar and notch.
3. My iPhone's native top bar icons (time, battery, Wi-Fi) are white and blend into our dark background. Force them to the right color.
4. [Any error text from Expo]: [paste]
```

Simulated notification in Chrome:

```
Because I'm running locally in Chrome I can't see push notifications. Add a simulated toast or modal that shows exactly what the notification would say and look like, plus a button in the dev panel to trigger it.
```

Load-time pass:

```
On my phone every log takes 700ms to a second. What is contributing to the long load times? Measure each screen's load, fix the biggest offenders (fewer database round-trips, local cache first), then re-measure and give me before and after numbers.
```

Expo Go error:

```
Opening in Expo Go I get: [paste error]. Fix it, then restart the server in the same terminal so I can rescan.
```

## Pitfalls Nick calls out

- Declaring done after Chrome. The phone finds different bugs every single time.
- Testing only in the mirror: no haptics, camera breaks.
- Forgetting that fixing performance after the phone pass means re-running all three tiers.
- Expo Go has package constraints (AsyncStorage v3). Paste the error, let Claude pin the version.
- Tunnel errors may be the tunnel provider asking for email verification, not your code.
- "Keep a cool head. You are going to run into a bug. I am literally talking to intelligent sand."
- There is no automated phone testing yet (as of the course), so this part stays manual.

## How Caleb should use this

- Before any AIRE prototype goes in front of a buyer or the KW First Choice team, run all three tiers. A clipped icon or an invisible status bar reads as unprofessional in a listing presentation.
- Thumb reach matters for agents walking an open house with one hand: put "add visitor" and "next showing" at the bottom of the screen.
- Test notification timing on his actual phone (for example, "showing feedback reminder, 2 hours after a showing") before trusting the schedule.
- Run the load-time prompt on cellular from a rural listing near St. Francisville, where LTE latency is real.
- No external cost. Scheduling a test push to his own phone is fine. Pushing to clients' phones needs Caleb's approval.

## Verification

- A checklist for the phone pass (safe area, status bar, icons, thumb reach, gestures, permissions, camera, haptics, sound) is ticked.
- Expo terminal shows no red errors. The phone shows no red bar.
- A scheduled test push arrived on the phone at the expected minute.
- Load-time numbers were measured before and after any performance fix.
