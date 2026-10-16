---
name: cc-screenshot-loop-website-design
description: Builds a high-end website, landing page, dashboard or app front end by giving Claude Code a reference design screenshot plus copied CSS and letting it screenshot-compare-fix in a loop, the way Nick Saraev does with godly.website inspirations. Use when Caleb says "build me a listing page that looks like this site", "make a landing page for the open house", "redesign the AIRE dashboard like X", "copy this design but with my content", or wants three design variants to pick from.
---

# Reference Screenshot Loop for Website Design

**Source:** Nick Saraev, "CLAUDE CODE FULL COURSE 4 HOURS: Build & Sell (2026)", chapters 9, 10 and 11 (https://www.youtube.com/watch?v=QoQBzR1NIqI&t=1829s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=2080s, https://www.youtube.com/watch?v=QoQBzR1NIqI&t=2507s)

## What Nick teaches

Claude Code can now reproduce award-level designs from showcase sites like godly.website in under ten minutes. He lists the three ways people currently design with agents:

1. **Reference design plus screenshot loop (his preferred way).** Give Claude a full-page screenshot of a site you like and some of its CSS. The first pass is about 80% there. Claude screenshots its own output, compares to the source, lists differences, fixes, and repeats: 90%, 95%, up to roughly 99%. Then you swap in your own content. The end result is not a clone, it just borrows font sizes, colors, button shapes and spacing so you never have to think about them.
2. **Massive voice transcript dump.** Hold the dictation key and describe everything you want. Typing is 50 to 70 words a minute, speech is about 200, so it is a 2.5 to 3x speedup. It will not one-shot a site without a reference, but you go back and forth quickly.
3. **Components.** Services like 21st.dev let you click a component (background paths, button borders, sign-in card), hit "copy prompt", paste into Claude and say "install this at the top". Works, but he finds it easier to go straight to option 1.

Getting the reference in:

- Open the inspiration site, press Cmd+Shift+I (or right-click, Inspect). Set the viewport to full desktop width, 1920x1080 ("widescreen"). Press Cmd+Shift+P (Ctrl+Shift+P on Windows), type "screenshot", choose "Capture full size screenshot". It scrolls and captures the whole page.
- The file is too big to feed Claude (it eats tokens and he believes the API has a size limit). Resize it with a tool like iloveimg's resize PNG at 50% or 75% smaller until it is under roughly 4 to 5 MB while still readable. 50% worked for him, 75% got blurry.
- Paste the image into the chat (copy the image, paste into the Claude Code panel). In the DevTools Elements panel find the `<body>` tag, right-click, "Copy styles", and paste that in too. It carries button colors, gradients and background treatment.
- His CLAUDE.md for the design workspace (built by having Claude scrape X for current website-building best practices) literally says: "When the user provides a reference image screenshot and optionally some CSS classes or style notes, you should generate a website." So the paste alone kicks off the loop.
- Say "open index.html" when it reports done and it opens the result in a browser tab.

Then swap content with a prompt like the one below, give feedback by voice, and iterate on small things (logo size, serif vs sans-serif hero, cut-off headshots, dead buttons, copyright year). He designed desktop only in the demo and notes you do the same process with a mobile screenshot, and can just say "make sure this is nice and mobile optimized".

Scaling it: he opened a second Antigravity window and ran a second site build at the same time. His suggested CLAUDE.md extension: feed three inspirations and have Claude produce three versions, run the verify loop on each, then present all three for you to pick.

## Step by step

1. Pick one inspiration site (godly.website, dribbble, an app you like). Take the full-size screenshot via DevTools and resize to under 5 MB.
2. Copy the `<body>` styles from DevTools.
3. Make sure the workspace CLAUDE.md contains the reference-image instruction and permission to screenshot its own output (see template). Set bypass or accept-edits mode.
4. Paste the screenshot and the styles into the chat and send. Let it run the loop. Watch the Thinking tab if you want to see the section-by-section diff list.
5. When it says done: "open index.html". Check it in the browser.
6. Send the content-swap prompt with the real source (Caleb's site, a listing sheet, a bio).
7. Give feedback in short batches by voice. Check every button and link. Ask for mobile optimization last.
8. Optional: run two or three variants in parallel windows or ask for three versions and pick.

## Templates / prompts

CLAUDE.md snippet for a design workspace:

```markdown
# Website Design Workspace
- When the user provides a reference image screenshot and optionally some CSS classes or style notes, generate a website that mirrors the layout, type scale, colors, spacing and button styles.
- Output is a single index.html (plus assets/) that opens locally.
- After each build, screenshot the result at 1920 wide, compare to the reference, list every difference by section, fix, and repeat until differences are minor. Then stop and report.
- Use placeholders (160x100 boxes) for images you do not have.
- Mobile responsive is required. Check a 390 wide screenshot before reporting done.
```

Content swap prompt (cleaned from Nick's):

```text
This is looking solid. Check out [source site or document]. Take the information from it and insert it into this website. I don't want a clone, but keep it close. Use the formatting you've developed so far to place elements. Insert images as well and make sure every element looks good. Continue the screenshot loop until it looks high end, professional and minimalistic like what you've already built.
```

Feedback batch example (Caleb version):

```text
I like this. The logo top left is too big, make it smaller. Try a serif font for the hero header. The "Schedule a showing" button does nothing, link it to [calendar link]. My headshot is cut off at the forehead, move it down and zoom out so I'm centered. Change the footer to Keller Williams First Choice, 2026.
```

## Pitfalls Nick calls out

- Screenshotting only the hero. You need the full page or Claude only has the top section.
- Feeding a 20 MB image. Resize first.
- Skipping the verify loop. Task, do, task, do with no checking is why people are unhappy with the output.
- Faces cut off and duplicate logos happen often. Expect two or three feedback rounds.
- Too many parallel tabs. If Claude is waiting on you more than 10 to 20% of the time you have too many. He caps at three or four.

## How Caleb should use this

- Single-property listing pages: screenshot a luxury real estate site you admire, then swap in the MLS data, photos and the KW First Choice branding.
- Open house or neighborhood landing pages for St. Francisville and Baton Rouge with a lead capture form.
- AIRE client dashboard front end: use a SaaS dashboard screenshot as the reference, then wire real data later.
- Seller lead magnet: "What's my home worth" page styled after a reference.
- Publishing any of these live (Netlify or similar) and using real client photos needs Caleb's approval before running.

## Verification

- Claude's log shows at least two screenshot-compare-fix rounds before it reports done.
- `index.html` opens locally and visually matches the reference layout at 1920 wide.
- All buttons and links go somewhere. No placeholder text remains after the content swap.
- A 390 wide view has no horizontal scroll and no cut-off images.
