# Reference capture rig

Gets the evidence the website teardowns could not: desktop 1440x900 and mobile 390x844, full-page screenshots, a numeric selector dump, font file URLs, and a short scroll recording. Plus a paid-font vs free-alternative render that copies no font files.

Built October 19, 2026 because the research browser in the website session could not resize and had no recorder. Runs anywhere Playwright and Chromium exist, including this repo's cloud sessions and Caleb's Mac.

## Setup (once)
```
cd aire/research/reference-capture
npm init -y >/dev/null && npm i playwright@1.49.1
npx playwright install chromium        # on the Mac. In the cloud, Chromium is preinstalled at /opt/pw-browsers.
```
On the Mac, change `executablePath` in both scripts to the Chromium path `npx playwright install` prints, or delete that option to use Playwright's default.

## Capture a reference
```
node capture.mjs sobha https://www.sobharealty.com/
```
Writes `sobha/desktop/` and `sobha/mobile/`, each with `viewport.png`, `fullpage.png`, `scroll.webm` (about 7 seconds of scrolling the whole page) and `evidence.json`:
- base font, size, line height, colors
- h1, h2, first paragraph, nav link and button: family, size, weight, line height, letter spacing, transform, color, position and size
- every section over 80 px tall: top, height, display, grid columns, padding, background
- every grid on the page: columns, gap, width
- container widths and max widths
- every @font-face rule and every font file the page requested
- stylesheets loaded

Popups and cookie banners are dismissed before the capture: Escape, accept links and buttons, hiding self-identified cookie or promo modals, then one scored click on a small top-right close control with a reload guard so the click can never leave the site in a different mode. Nothing is removed from the DOM.

Options: `ONLY=desktop` or `ONLY=mobile` runs one viewport. `TOUCH=1` gives the desktop viewport a touch screen, for sites that only scroll natively on touch devices (output goes to `desktop-touch/`).

Sites with a smooth-scroll library on desktop (Locomotive, Lenis) ignore synthetic wheel input. The rig waits for the library's ready class, then drives the page with PageDown and ArrowDown and stitches viewport shots, tracking the sections themselves because the wrapper and a fixed footer never move. Pinned sections stall the metric, so the stall tolerance is 8 steps. On zorge9.estate this reached the first half of the desktop page (20 slices, 18,000 of 36,633 px) before stopping at a long pinned run. The section table in evidence.json covers the whole page regardless.

## Summaries
```
python3 summarize.py zorge "Zorge 9" https://zorge9.estate/
```
Writes `zorge/ZORGE-measured.md`: the type table for both viewports, font families in use, section heights, grids, font faces and files, scroll model, Unknowns. This is the file that goes into the teardown. Captures do not.

## Compare a paid face with a free one
```
node fontcompare.mjs sobha https://www.sobharealty.com/ h1 "Instrument Sans"
```
Selector can be any Playwright locator, for example `h1`, `h2:visible` or `':text("PREMIUM RESIDENCE")'` when the h1 is a hidden one-pixel element. Optional fifth argument is the weight. Crops the live element as the site renders it under its own license, then sets the same text in the named Google Font at the same size, weight, tracking and leading. Output `sobha/font-compare.png`. No paid font file is downloaded, copied or embedded.

## Rules
- Captures are evidence for the Blueprint, Proof, Unknowns report. Copy mechanics, never content.
- Reference screenshots and recordings stay out of anything public.
- A number not in `evidence.json` or visible in a capture stays in Unknowns.
