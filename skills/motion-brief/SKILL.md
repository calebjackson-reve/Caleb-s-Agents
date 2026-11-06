---
name: motion-brief
description: Writes a ready-to-paste Claude Motion prompt (an 8-part motion brief plus the scene) for a real estate motion graphic, reel B-roll or explainer, in Caleb's Keller Williams First Choice look, so the build comes out looking premium instead of like a slideshow. Use when Caleb says "make a motion graphic", "motion video", "Claude Motion", "animate this", "just listed / just sold / open house video", "B-roll for my reel", "turn this into an animation", "write the scene", or hands over a reference video or website screenshots and wants a Motion prompt.
---

# Motion brief

Source: Charlie Hills, "Claude /motion" (X article, 2026-10-12, https://x.com/charliejhills/status/2109665544857403871). Method below is his, adapted for Caleb. Plan details are from the source as of that date, not verified since.

## What Claude Motion is (from the source)
- Lives in claude.ai chat (app and website), not Claude Code. You don't type /motion. You ask for an animation in a normal chat.
- Team and Enterprise plans at the time of the article. Check Caleb's plan in `aire/STACK.md` before assuming he has it.
- Motion usage is limited, so this skill writes the prompt in a normal chat or Claude Code, and only the final prompt goes into Motion.

## Workflow

1. **Get the facts.** Ask for the real words and numbers only: address or area, price, beds and baths, date and time, the one result or stat, the call to action. Never invent a number. Every market stat carries its source and date on screen or in the caption (repo rule).
2. **Pick the format.** Platform and size: reel 9:16 1080x1920, feed 4:5 1080x1350, square 1080x1080, YouTube 16:9. Length: 6 to 8 s for a loop, 15 to 20 s for a launch, longer only for B-roll timed to a voiceover. Default muted: every point reads as words on screen.
3. **Pick the look.** Default is `motion-brief-template.md` (Caleb's look). If Caleb sends website screenshots, run the "website to Look" prompt below and swap the Look section. Never Rêve fonts, colors or language.
4. **Write The scene.** One moment, two or three sentences, with real motion moves (see "Moves that work"). For B-roll, write it as timestamped beats that match the script.
5. **Assemble.** Output one code block: `Make me a motion graphic. Follow this motion brief exactly:` then the filled template then the scene. Nothing for Caleb to edit except what you flagged.
6. **Compliance pass.** Run `ai-compliance-check` on the on-screen words before handing it over (Louisiana advertising rules, brokerage name, fair housing, no unsourced stats).
7. **Hand off.** Tell Caleb: paste into a new claude.ai chat, pick a style when asked, then tweak and export (steps below). Caleb approves before anything is posted.

## Moves that work (from the source)
"Make it nice" gets nothing. Name moves Motion can build: masked text reveals, lines that draw themselves, shapes that morph into the next scene, numbers counting to their real value, spring easing that slides, scales and settles, elements overlapping slightly as they arrive, soft shadows, gentle parallax, slow camera drift. Ban plain fades and clip art.

Quick add-on when Caleb wants a one-off without the full brief (paste at the end of any Motion prompt):

> Make it look like a premium brand film, not a slideshow. [LOOK: background, text colour, one accent colour], big confident type. Every element moves with smooth, springy easing: it slides, scales and settles, and elements overlap slightly as they arrive. Add depth with soft shadows, gentle parallax between layers and a slow camera drift. Use real motion design moves: masked text reveals, lines that draw themselves, shapes that morph into the next scene. Show every number at its real value. No plain fades and no clip art.

## Quick launch brief (from the source, adapted)
> Make a [15]-second [listing / announcement] video for [Instagram, Facebook or LinkedIn] from this text. It plays muted in the feed, so every point has to read as words on screen. Use only what's in the text and end on the call to action. Text: "[paste]" Call to action: "[CTA]"

## Website to Look
Attach two or three screenshots of the site and paste:
> These are screenshots of my website. Pull my brand out of them for a motion graphic: background, text and accent colours as hex codes, the fonts (or the closest Google Fonts), and how it should feel and move. Write it as the Look section of my motion brief, under 100 words.

## From a reference video
Caleb keeps reels that stop his scroll. Take the pace and the one idea, never the look or the words. Break the reference into timed beats from 6 to 8 screenshots, then rewrite each beat in Caleb's brand and facts.

## Real estate scene starters
- **Just listed.** A frosted glass listing card rises with a spring, the photo reveals through a mask, price counts up to its real value, beds and baths tick in, then "Just Listed" lands big with the address under it.
- **Just sold.** A "For Sale" sign flips on its post into "Sold", a line draws from list date to close date and the days-on-market number lands huge.
- **Open house.** A calendar tile flips to the date, a clock hand sweeps to the start time, a pin drops on a simple drawn map, "Open House Sunday 1 to 3" holds.
- **Market stat.** One line draws itself across a clean chart, the key number grows to full size, the source and month fade in small under it and stay.
- **Process explainer.** Five steps as glass tiles in a row, a light runs from one to the next and each lights in the accent colour as it passes.

## After the build (from the source)
- **Tweaks tab:** per scene name, length, speed (0.5x or 2x) and every line of on-screen text. Use it for wording and timing.
- **Layout changes go in the chat**, scene by scene ("give each card a title big enough to read on a phone").
- **Style tab:** swap palettes and fonts for the whole video. Hit Duplicate before any big change.
- **Export:** Share, Export, Video. MP4 for socials, GIF for email or slides, 1080p at 30 fps, Sharper text on for anything with words. Can also hand off to invideo, Higgsfield, Descript, Runway and others.

## Rules
- Real facts only, from Caleb or the listing. Made-up people and places only in tests.
- No client names or addresses in this repo. Briefs with client details stay in `out/`.
- Drafts only. Nothing is posted, scheduled or sent without Caleb's yes.
