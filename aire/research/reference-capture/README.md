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

Popups and cookie banners are dismissed (Escape, close controls, accept buttons, then any surviving full-screen fixed overlay is removed) before the capture.

## Compare a paid face with a free one
```
node fontcompare.mjs sobha https://www.sobharealty.com/ h1 "Instrument Sans"
```
Crops the live element as the site renders it under its own license, then sets the same text in the named Google Font at the same size, weight, tracking and leading. Output `sobha/font-compare.png`. No paid font file is downloaded, copied or embedded.

## Rules
- Captures are evidence for the Blueprint, Proof, Unknowns report. Copy mechanics, never content.
- Reference screenshots and recordings stay out of anything public.
- A number not in `evidence.json` or visible in a capture stays in Unknowns.
