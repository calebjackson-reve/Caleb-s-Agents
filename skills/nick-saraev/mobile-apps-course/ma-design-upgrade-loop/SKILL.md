---
name: ma-design-upgrade-loop
description: Upgrades a working app's look after the functionality is done and before the database is added, using Nick Saraev's design loop: screenshot a reference app or Dribbble shot into Claude, set a palette from a color-scale generator, make icons monochrome, pick fonts and corner radius, harmonize every page, then have Claude screenshot-loop its own Chrome window until spacing and alignment are clean. Use when Caleb says "make this look professional", "it looks like a default app", "match the look of this app", "pick a color palette", "the pages look inconsistent", or wants an AIRE or KW-branded app to feel high-end.
---

# The Design Upgrade Loop

**Source:** Nick Saraev, "How to Build Mobile Apps with Claude Code: Full Course (2026)", chapter 25 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=7689s), chapters 28-30 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=8912s through https://www.youtube.com/watch?v=BMMcmmnjrM8&t=9558s), and the sign-in page in chapter 31 (https://www.youtube.com/watch?v=BMMcmmnjrM8&t=10566s)

## What Nick teaches

### Design is its own step, after build and before database
Nick added "Design" between Build and Test in his framework after the habit tracker, where he never expressed opinions and got a plain app. "Once you have the core functionality built, it's very easy to say: take the same layout but apply different styles. Make it thematically different, make it look like this other app, give it the feel of Apple or Google." Do it while data is still local: after a live database, every design change that touches data means a new Supabase schema and deprecated rows.

### Start from a reference
"Images and screenshots are a very important part of any design loop nowadays." Nick screenshotted Cal AI's screens and said: "I love the design of the app I just screenshotted. Start by emulating that design. Upgrade ours so it more or less looks exactly like this app, just without the logo. Call it Cal Tracker, not Cal AI. After we've built a reasonable library of components I'll modify the design so the end result looks different." Use references for padding, corner radius, outlines, layout, not to clone. For the sign-in page he searched Dribbble, picked one, and said "build me something kind of like this." For the Pomodoro app he searched Dribbble for "time tracker app" and "tracker app" looking for a warm, youthful feel.

### Then make it yours
Nick's CalTracker adjustments, in order:
1. **Palette**: used the UI Colors generator (uicolors.app), pressed spacebar until he found a dark blue-gray he liked, copied the full color scale, pasted it in: "Update color scheme so it looks like this. Make sure all icons and emojis are monochrome, the same color as the palette. Important we stick to that palette from now on."
2. **Fonts**: tried "high-end lux serif fonts for display/headings," decided they looked "kind of lame," switched to "a really good common sans serif font typically associated with high-end clean designs." Serif on the chart x-axis had to be swapped back too.
3. **Corner radius**: "reduce the corner rounding just a tad to make it feel higher end."
4. **Harmonize**: "the homepage has an outline around each card, the profile page doesn't. Remove outlines around all cards and favor clean minimalistic design over busy design."
5. **Spacing**: "the homepage is very compressed and stacked up top. Distribute each element more organically."
6. **Off-palette elements**: "the green toggle next to meal reminders looks weird. Make it align with the rest of the palette." (Took two asks.)
7. **Text**: "modify the AI prompt so output food titles are shorter, and fix truncation so it wraps. On very small displays show calories and macros on two lines max using abbreviations and smaller text."
8. **Tab icons**: "add way cleaner icons for the home, progress, and profile tabs. Those look low-end."

### Let Claude self-loop with screenshots
When Nick described the same alignment bug twice and Claude "fundamentally misunderstood," he switched: "Open up in your own Chrome window and screenshot through the app. Enumerate all of the minor incongruencies in design, spacing, margins, alignment on left and right sides, etc., then fix each in turn." And: "Go through the design page by page and itemize a list of all possible improvements to make it higher-end, sleeker, more lux. Self-loop as many times as you need." Claude used the Chrome DevTools MCP to screenshot and iterate. Nick opened a second Chrome window to keep testing while Claude worked in its own.

### Keep testing as you go
Nick dumps design changes while earlier ones build, and keeps checking in Chrome at phone width. The final phone pass still found alignment issues "I just couldn't see until I was actually on my phone."

## Step by step

1. Confirm functionality is done and data is still local.
2. Collect one to three reference screenshots (a competitor app, Dribbble shots). Paste them with "emulate this, then we'll make it our own."
3. Pick a palette from a color-scale generator. Paste the whole scale. Declare it the only palette.
4. Decide fonts (one display, one body), icon style (monochrome), corner radius.
5. Harmonize: one card style, one outline rule, one spacing rhythm across every page.
6. Dump remaining issues per screen (`ma-feedback-dump-iteration`).
7. Run the self-loop prompt and let Claude screenshot its own Chrome window.
8. Chrome pass, then phone pass. Fix the phone-only alignment issues.
9. Only now add the database (`ma-supabase-database-auth`).

## Templates / prompts

Reference emulation:

```
I love the design of the app in the screenshots I just attached. Right now our design is weak. Start by emulating that design so ours looks more or less like it, minus the logo and name. After we have a reasonable component library I'll change things so the end result looks different.
```

Palette and style:

```
Update the color scheme to this palette:
50 #f3f6fb, 100 #e4eaf5, 200 #c9d5ea, 300 #9fb3d6, 400 #6f8cbd, 500 #4b6ba3, 600 #3a5488, 700 #30446e, 800 #2b3b5c, 900 #27334d, 950 #1a2234
Make all icons and emojis monochrome in palette colors. We stick to this palette from now on. Use one clean, common sans-serif associated with high-end design. Reduce corner rounding a touch for a higher-end feel.
```

Harmonize:

```
The design differs page to page: outlines on Home cards, none on Profile. Remove outlines on all cards and favor clean minimal design over busy. Home is compressed up top, so distribute elements organically. The green toggle on Profile is off-palette, so make it a palette blue. Go through one final time and make everything align with the palette.
```

Self-loop:

```
Open the app in your own Chrome window at phone width and screenshot every page. Enumerate every incongruency: spacing, margins, left/right alignment, truncation, off-palette colors, stacked text. Then fix each in turn and re-screenshot. Self-loop as many times as needed until it's clean. The calories and macros section is still out of alignment, so make it mobile-responsive.
```

## Pitfalls Nick calls out

- Designing after the database is live multiplies the cost of every change.
- Cloning a competitor outright. Emulate for structure, then diverge.
- Palette drift: unless you say "stick to this palette from now on," new elements come in random colors (the green toggle).
- Serif headings sounded luxurious and looked lame in practice. Test it, then change it.
- Claude changing colors "without fully screenshotting all the pages" leaves pages inconsistent. Ask for a page-by-page pass.
- Describing a layout bug more than twice. Switch to the screenshot loop.
- Dark mode by default is "kind of annoying nowadays" in Nick's view. Choose a scheme deliberately.
- Tool names (UI Colors, Dribbble, Chrome DevTools MCP) are as Nick used them and may have changed.

## How Caleb should use this

- Reference: screenshot the Keller Williams app or a top real estate app (Zillow, Redfin, Compass) for structure, then diverge with Caleb's own palette.
- Palette: build a scale around KW red and a deep charcoal, or Caleb's AIRE brand color, and declare it the only palette so every AIRE screen matches his listing marketing.
- Monochrome icons and a clean sans-serif keep a seller dashboard looking like a professional report, not a hobby app.
- Run the self-loop before any listing presentation. Alignment issues are what a seller notices.
- No cost here beyond tokens. Paid font licenses or a paid color tool plan need Caleb's approval.

## Verification

- Every page uses only the declared palette (spot-check toggles, charts, tab icons).
- One font family for display, one for body, nothing else.
- Card style, outlines, and spacing are identical across pages.
- Claude's self-loop report lists zero remaining incongruencies.
- Phone pass finds only minor alignment tweaks, fixed in one round.
