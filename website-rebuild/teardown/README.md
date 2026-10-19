# Stage 1: teardown of the three reference sites

Done October 19, 2026 from a cloud session with headless Chromium (Playwright 1.56). One report per site, each in Blueprint, Proof, Unknowns form with every number labeled measured, source, inferred or not verified.

| Site | Studio | Report | Live URL | Awwwards |
| --- | --- | --- | --- | --- |
| FIND Real Estate | Cuberto | [findrealestate.md](findrealestate.md) | https://www.findrealestate.com/ | Honorable Mention, March 18 2026 |
| Sobha Privy Collection | Vide Infra | [sobha-privy.md](sobha-privy.md) | https://sobha-privy-collection.com/ | Site of the Day, September 23 2026 |
| Zorge 9 | Vide Infra | [zorge9.md](zorge9.md) | https://zorge9.estate/ | Honorable Mention, June 10 2026 |

## How it was measured

`scripts/measure.js` loads each site at 1440x900 (desktop Chrome user agent) and 390x844 (iPhone user agent, touch, 2x), waits for network idle and the intro, then records: libraries, scripts, font faces, root variables, computed type for every heading, paragraph, link, button and span (deduplicated by size, weight, tracking, case), section map with top, height, surface and padding, container widths, radii, borders, transitions, top colors, header, cursor, image slots with ratio and natural size, resource totals. It screenshots the first 3 seconds, the hero, then every half viewport down the page, plus a full-page capture.

`scripts/scrub.js` steps down the page and diffs every visible element's transform, opacity, clip-path, size and color between steps, so it can say which element moves where. `scripts/css.js` reads the stylesheets for root sizing rules, keyframes, hover rules, media queries and easing curves. `scripts/entrance.js` records the first seconds after navigation. `scripts/diagnose.js` was used to work out why the Vide Infra sites would not scroll (custom virtual scroll) and why Sobha's intro never released (H.264 video).

Two workarounds, both recorded in the reports: the Vide Infra sites are scrolled with keyboard arrows because their engine swallows synthetic wheel events, and `.mp4` requests on those sites are answered with a small VP9 stub so the intro can release (Playwright's Chromium has no H.264 decoder). Scroll positions on those two sites are therefore given in probe steps, not pixels.

Proof files per site: `desktop.json`, `mobile.json`, `*-attop.json` (section map before any scroll), `css-facts.json`, `scrub.json` and `scrub-summary.txt`, contact sheets `CONTACT-desktop.jpg`, `CONTACT-mobile.jpg`, `CONTACT-first3s.jpg`, `CONTACT-entrance.jpg`, hero frames `desktop-hero.png` and `mobile-hero.png`, `entrance/entrance.webm`. Raw scroll frames are not committed (see `.gitignore`); re-run the scripts to regenerate them.

## The three side by side

| | FIND | Sobha Privy | Zorge 9 |
| --- | --- | --- | --- |
| Page length at 1440x900 | 14,032px (15.6 viewports) | 42,936px (47.7 viewports) | 36,633px (40.7 viewports) |
| Root sizing | fluid, 0.52vw per rem from 768 up, capped at 1920 | fixed 10px | fixed 10px |
| Scroll | native with Lenis | custom virtual scroll, lerp 0.1 | custom virtual scroll, lerp 0.1 |
| Fonts | Instrument Sans + Lora (free) | Altesse Std script + TT Ramillas Light + TT Commons Pro (paid) | Gilroy SemiBold only (paid) |
| Headline size | 105px at 1440 (140 design) | 80 and 114px | 56px |
| Headline case | sentence, tight -2% | uppercase, +2% | uppercase, 0 |
| Body | 15px (20 design), 1.5 | 13px, 1.23 | 14px, 1.29, uppercase, +3% |
| Palette | ink `#151717`, white, `#f1f1f1`, gray `#b3b3b3`, no accent | `#1a1919`, white, gray `#717170`, no accent | `#000`, white, copper `#a0725b` |
| Surfaces | white / pale gray / ink bands | black and white flip per section, header follows | black and white flip, header follows |
| Gutter | 75px at 1440 (100 design) | 30px | 30px |
| Section padding | 112.5px (150 design) | 180px, pinned runways in whole viewports | 293, 230, 174px headroom for pinned titles |
| Radius | 100px pills, hairline borders | 15px twice, no borders | none, 1px white 30% hairlines |
| House easing | `cubic-bezier(0.16,1,0.3,1)` 1s reveals, `0.3s ease` hovers | `cubic-bezier(0.7,0,0.3,1)` 0.4s and 1s | same curve, 0.8s default, 1.6s intro |
| Text reveal | gray to black word sweep, clip-path on images | character split in line masks, 10 to 40ms stagger | word split in line masks, color on arrival |
| Hero | 5-viewport sticky story: parallax clouds, logo fade, photo through wordmark | script word over uppercase serif on a ribbon video, sticky under next | tagline, render, cut-out portrait, copper wordmark along the bottom, sticky under next |
| Pinned set pieces | hero only | Three Worlds WebGL, 16,284px horizontal Tenets slider, pinned map | Advantages 6,840px, Fitness 8,924px horizontal, Services, closing |
| Header | sticky, hides on down, white on up | fixed 91px, flips light and dark | fixed 145px, flips, one link |
| Cursor | default | custom element | custom element |
| Loader | none | intro held until hero video plays | "The Luxury of Experience" card, 1.6s intro |
| Images served at | 1x to 1.4x, one 700px upscaled composite | 1.4x | exactly 1.4x |
| People | lifestyle candid, no studio portraits | two black-and-white editorial portraits | fashion editorial, models in evening wear |
| Load to idle | 10.5s, 7.7MB images, 7.3MB video | 7.8s, 20.5MB images | 5.0s, 5.9MB images |

## What Stage 2 should pull from each

- From FIND: the fluid rem scale, the sticky multi-viewport hero story, clip reveals with image drift, header hide and return, the word sweep, free fonts.
- From Sobha: the three-role type system (script word, light uppercase serif, small grotesk), surfaces flipping per section with the header following, character-split entrances, sticky-under-next, the gradient-fill closing statement.
- From Zorge: the hero construction with a cut-out portrait across a seam and a wordmark along the bottom, one accent color, specs as display type, 0.8s timing, cross-fading backgrounds in pinned runways, 1.4x image serving.

What not to carry: the 40-plus viewport page lengths (both Vide Infra pages are a single-listing brochure, a brokerage home page has more jobs to do), paid fonts without a license (TT Ramillas, TT Commons Pro, Gilroy, Altesse), and virtual scroll on a site that needs IDX search to work.

## Unknowns that span all three

- Nothing here was measured in a real GPU browser. WebGL and H.264 effects (Sobha's ribbon video and Three Worlds, Zorge's Kinescope videos) were not rendered.
- Scroll positions on the Vide Infra sites are relative step counts.
- No Lighthouse runs. Load times are from one cloud connection on one day.
- Hover and cursor behavior was read from CSS, not exercised.
- Inner pages were not loaded; only the three home pages.
