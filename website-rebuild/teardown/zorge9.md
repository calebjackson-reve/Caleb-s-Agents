# Teardown: zorge9.estate (Vide Infra, Awwwards Honorable Mention, June 10 2026)

Measured October 19, 2026 in headless Chromium at 1440x900 and 390x844. Labels: **measured**, **source**, **inferred**, **not verified**. Raw data: `zorge9/desktop.json`, `desktop-attop.json`, `mobile.json`, `css-facts.json`, `scrub.json`, `scrub-summary.txt`, `CONTACT-*.jpg`, `desktop-hero.png`, `diag/shared.js` and `diag/landing.js`, `entrance/entrance.webm`.

Same studio as Sobha Privy Collection and the same engine (virtual scroll, Barba, keen-slider, one easing). What differs is the design language: one grotesk, uppercase everywhere, black and white with a single copper accent, and a hero built from a giant display wordmark plus a fashion portrait cut out over an architectural render.

## Blueprint

1. **One typeface, one weight, all caps.** Gilroy SemiBold is the only font file loaded. Every heading, label, paragraph and button is uppercase. Hierarchy comes from size alone: 56, 36, 24, 14, 12px. Body copy is 14px with 3% tracking.
2. **Black, white, copper.** `#000` and `#fff` surfaces flip per section, with `#a0725b` (a muted copper) as the only accent, used for the hero wordmark, links and underlines. The palette also defines turquoise and pink but they do not appear on the home page.
3. **A hero of three layers.** Black panel left with the tagline, architectural render right, a cut-out fashion portrait straddling the seam, and the "ZORGE N°9" wordmark at roughly 200px cap height in copper along the bottom edge, overlapping the photo. The hero is `sticky--under-next`: the about section slides up over it.
4. **Thin hairline rules and no radius.** 1px white at 30% and 20% opacity, 8 and 3 uses. Zero rounded corners except one circle.
5. **The same virtual scroll and house curve as Sobha.** Lerp 0.1, `cubic-bezier(0.7, 0, 0.3, 1)`, but slower: 0.8s is the default here (48 color transitions at 0.8s), 0.4s for small UI, 1.6s for the intro.
6. **Word-level reveals, not character-level.** Text is split into `span.word-wrap > span.word`; words translate and fade inside line masks. 708 word-wrap transform changes were logged across one scroll, versus Sobha's character splits.
7. **Pinned feature runways.** Advantages (6,840px), Fitness (8,924px), Services (4,500px) and the closing penthouse section (4,855px) hold a sticky layer while images cross-fade (`#ns27`, `#ns28` opacity), clip-reveal (`background--cover` clip), or slide (`sticky-slider__sticky`).
8. **Photography does the luxury work.** Full-bleed renders at 1.6 and 1.91, a 1440x1536 portrait-orientation panel, square 690px lifestyle cards, 1.43 ratio gallery frames. People are models in evening wear, a man on a concierge call, a swimmer, a yoga pose, a doorman in a red cape. Warm dusk grade on exteriors, dark interiors with brass light.
9. **Numbers as display type.** "26-30 м²" at 56px, the daily schedule "07:00" list, "25m swimming pool". Specs are treated as headlines.
10. **Ends on a penthouse render with a scroll-up arrow and a tiny footer line.** No giant footer, no newsletter.

## Proof

### Stack (source and measured)

| Layer | Finding | Label |
| --- | --- | --- |
| Builder | Custom. `assets/js/shared.js` 326KB, `landing.js` 197KB, `global.css` 967 rules, `landing.css` 607 rules | source |
| jQuery 3.7.1 | global | measured |
| Virtual scroll | same engine as Sobha: `has-scroll-init has-scroll-smooth`, `lerp:.1`, wheel, touchmove and keydown listeners | source |
| Page transitions | Barba, 28 references | source |
| Video | Kinescope player (Shaka, HLS, DRM). Fails in Playwright with `ERR-DRM-UNSUPPORTED`, so the gallery video shows a "Protected playback is unavailable" card here | measured |
| Map | `map.6cdcb83b.js` plus an `intl.locale` chunk, a custom map section | source |
| Carousels | keen-slider, `Duration:500` and `1200` | source |
| GSAP | not a global; `ScrollTrigger` string appears 4 times in landing.js, their own helper | source, inferred |
| Fonts | one file, `Gilroy-SemiBold.woff2`, 44KB | source, measured |
| Page weight | images 5.9MB on load, JS tiny (6.7KB application type counted, the two bundles are cached as text) | measured |
| Load | 5.0s to network idle desktop, 4.5s mobile | measured |
| Loader | `.preloader` card "The Luxury of Experience" at 937ms, hero in by 12.4s on this connection | measured (entrance frames) |

### Root sizing (source)

`html { font-size: 62.5% }`, 1rem = 10px fixed (measured 10px at both widths). Breakpoints combine width, height and aspect ratio exactly like Sobha, with extra tiers at `(min-width: 1920px) and (min-height: 700px)` (198 rules) and `(min-width: 2400px)` (158 rules). The design has explicit large-screen variants.

### Type scale (measured at 1440)

| Role | Size | Line height | Weight | Tracking | Case | Color |
| --- | --- | --- | --- | --- | --- | --- |
| h1, section titles ("GALLERY", "LOCATION") | 56px | 1.04 | 600 | 0 | upper | white or black per section |
| Big numbers ("26-30") | 56px | 1.04 | 600 | 0 | upper | white |
| Statement h2 and lead p ("Life on your own terms", "Premium residence") | 36px | 1.06 | 600 | 0 | upper | white |
| Sub-heads ("Special Offers", "Fitness club with a 25m pool") | 24px | 1.08 | 600 | 0 | upper | black or white |
| Body and list items | 14px | 1.29 (18px) | 600 | 3% (0.42px) | upper | per section |
| Eyebrow, nav, buttons ("About the Project", "Choose an Apartment") | 12px | 1.33 (16px) | 600 | 3% (0.36px) | upper | white, links copper |

Mobile at 390 (measured): h1 24px, statements 24px, "GALLERY" 36px, big numbers stay 56px, body 12px, header 68px, gutter 20px.

The hero wordmark "ZORGE N°9" is not live text in the h1 (the h1 reads "Zorge 9 - House with Privileges" at 56px, inferred to be visually hidden). The wordmark is an SVG or image in copper, about 200px tall at 1440, spanning the full width (inferred from `desktop-hero.png`).

### Color (source variables, measured counts)

| Token | Value | Use |
| --- | --- | --- |
| `--c-white` | `#fff` | 4676 uses |
| `--c-black` | `#000` | 1484 uses, dark surfaces |
| `--c-brown` | `#a0725b` | 92 uses: wordmark, links, underlines, "Watch" and "Accept" |
| white 30% and 40% | `rgba(255,255,255,0.3)`, `0.4` | hairlines and secondary text |
| `--c-gray` `#666`, `--c-gray-light` `#aaa`, `--c-black-light` `#555` | defined, 12 uses of `#808080` measured | minor |
| `--c-turquoise` `#25c2a0`, `--c-pink` `#a65db4` | defined, not used on the home page | source |
| `--c-error` | `#c60000` | forms |

### Spacing and layout (measured at 1440)

- Side gutter 30px (11 elements). Mobile 20px.
- Section top padding: 293px (architecture), 229.8px, 174px (improvement), 72px, 30px. The large values are visual headroom for a pinned title rather than ordinary padding.
- Header fixed, 145px tall at 1440 (it holds the wordmark lockup once scrolled), 68px on mobile, transparent. Nav is one link, "Choose an Apartment", plus a two-line hamburger.
- Grid: 12 columns (`col--md-4`, `col--md-6`, `col--md-8`, `col--md-12`), 4 columns on phones.
- Radius: one 50% circle. Borders: 1px white at 30% (8) and 20% (3).

### Page skeleton at 1440x900 (measured at top)

| Top | Height | Section | Surface | What it is |
| --- | --- | --- | --- | --- |
| 0 | 901 | hero `section--full-height ui-dark` | `#000` | Tagline top left, render and portrait, copper wordmark along the bottom. Sticky under next |
| 1 | 2997 | about | `#000` | "Life on your own terms", two cards (About the Project with a video, Special Offers white card), sticky background and content layers |
| 2098 | 1767 | location `ui-light` | white | "Privilege of location", horizontal carousel of 822x576 location cards (1.43), a woman in a car, city at night |
| 3864 | 960 | map | `#000` | Dark line map with numbered points, pinned |
| 4823 | 1280 | panorama | `#000` | "It's a world that adapts to you", pinned panorama render |
| 6102 | 3594 | style `ui-light` | white | "Architecture: three buildings in the style of elegant New York", 1440x1536 facade panel, mirrored decor picture |
| 9694 | 900 | gallery `section--full-height` | `#000` | "Gallery /11 photos", 1380x721 frames (1.91), eight of them cycling |
| 9694 | 2700 | time | `#000` | "Daily schedule" 07:00 to night, sticky under next |
| 10594 | 2997 | lobby | `#000` | Lobby image with content, a shadow layer that fades |
| 11791 | 6840 | advantages | `#000` | Pinned runway: lobby, concierge, courtyard lounge, pool. Square 690 and 680 cards, cross-fades `#ns291`, `#ns292` |
| 16291 | 8924 | fitness `ui-light` | white | Pinned horizontal slider: sauna, boxing, yoga, with 360x480, 480x320, 300x360, 480x480, 360x300 image set |
| 22875 | 3537 | infrastructure | transparent | Street-level render with "Infrastructure", `content-animation--cover`, shadow layer |
| 26411 | 2367 | improvement `ui-light` | white | "Rustling tree crowns" courtyard render, mortgage terms |
| 27878 | 2700 | apartments | transparent | Studios to penthouse tabs, "26-30 м²" 56px, floor plan, elevator close-up |
| 28778 | 4500 | services | `#000` | "Technologies and services" with the doorman, concierge, bellman cards, sticky layer |
| 31478 | 4855 | penthouse closing | transparent | "Sunbeams light up the transparent windows", evening-dress portrait, white dining render, scroll-up arrow, copyright line |

### Scroll choreography (measured with `scrub.js`, 125 keyboard steps)

| Steps | Element | Change | Reading |
| --- | --- | --- | --- |
| 1 to 5 | `sticky--under-next`, `intro sticky__layer--sticky` | transform | hero pinned, about slides over it |
| 1 to 9 | `about__background`, `about__content` sticky layers | transform | two layers at different speeds |
| 1 to 118 | `#ns28` background cover | opacity, 20 changes | a crossfading full-bleed background used across the page |
| 6 to 18 | `location-card__image` x4, carousel items | transform, 36 changes | the location carousel scrubs horizontally with scroll |
| 10 to 111 | `#ns27` background | opacity | second crossfade layer |
| 17 to 20 | `#map.sticky`, `panorama__sticky` | transform | pinned map and panorama |
| 28 to 124 | `picture.background--cover` | transform, 83 changes | parallax on every full-bleed |
| 31 to 38 | `style__decor-mirror` | transform | the mirrored facade decor moves against the main image |
| 37 to 45 | `js-gallery-image` | height, 14 changes | gallery frames resize as they cycle |
| 41 to 48 | `time__sticky.sticky--under-next` | transform | schedule pinned under the lobby |
| 46 to 68 | `content-animation--bottom` | height | rising reveals |
| 48 to 119 | `background--cover` | clip, 6 changes | clip-path image reveals |
| 49 to 58 | `lobby__shadow` | opacity | gradient shadow fades in |
| 49 to 74 | `advantages__container` sticky | transform | pinned runway |
| 56 to 64 | `#ns291`, `#ns292` | opacity | card images cross-fade in sequence |
| 64 to 108 | `section.fitness`, `fitness__container.row`, `sticky-slider__sticky` | transform, 45, 34, 33 changes | vertical to horizontal slider |
| 109 to 111 | `content-animation--cover`, `infrastructure__shadow` | transform, opacity | cover reveal with shadow |
| 115 to 124 | section#services, sticky layer | transform, height | |
| 120 to 124 | `li` and `card__lb` | opacity, height | service cards fade in |
| throughout | `span.word-wrap` | transform and opacity, 708 changes; color 192 | word-level masked entrances with a color change on arrival |
| throughout | `svg` and `use` | color, 97 each | icons recolor as sections flip light and dark |

The header is `header--sticky`, fixed, `ui-dark` (measured). The "Choose an Apartment" link is a `.btn--cloned`: on hover the label slides up `translateY(-175%)` behind a clip-path polygon while a clone rises into place (source, the same mechanic as Sobha with different distances).

### Easing and durations (source and measured)

| Value | Uses | For |
| --- | --- | --- |
| `cubic-bezier(0.7, 0, 0.3, 1)` 0.8s | 48 on color, 5 on opacity, 1 on background and transform | the default here, twice Sobha's 0.4s |
| same curve 0.4s | 14 color, 12 opacity, 12 color and background, 8 visibility and opacity, 8 transform | small UI |
| same curve 1.6s | `.animation--intro-*` elements | the intro (logo, back, decor, menu) |
| `cubic-bezier(0.47, 0.04, 0.5, -0.06)` | 1 | an anticipation curve (dips negative), one element |
| keen-slider 500ms and 1200ms | carousels | |
| JS `duration:.3`, `.4`, `.8`, `1`, `Stagger:.01`, `.04` | landing.js | word stagger 10 to 40ms |
| virtual scroll `lerp:.1` | | |

No `@keyframes` at all in the stylesheets (source). All motion is transitions plus JS-driven transforms.

### Images (measured at top)

| Slot | Rendered | Ratio | Natural | Fit |
| --- | --- | --- | --- | --- |
| Hero render | 960x900 | 1.07 | 1344x1092 | cover |
| Hero portrait cut-out | 720x900 | 0.8 | 1008x1092 (transparent PNG, inferred) | contain |
| Full-bleed renders | 1440x900 | 1.6 | 2016x1131 | cover |
| About video poster | 1080x780 | 1.38 | 1922x1388 | cover |
| Location cards | 822x576 | 1.43 | 959x672 | cover |
| Architecture panel | 1440x1536 | 0.94 | 2016x1792 | cover |
| Gallery frames | 1380x721 | 1.91 | 1932x1010 | cover |
| Lifestyle squares | 690x690, 680x690 | 1.0 | 966x966 | cover |
| Fitness set | 360x480, 480x320, 300x360, 480x480, 360x300 | mixed | 1.4x natural | fill |
| Card thumbnail | 350x420 | 0.83 | 490x588 | cover |

Served at exactly 1.4x the rendered size throughout (measured: 2016 for 1440, 959 for 822, 966 for 690). No filters, no radius.

People photography: fashion-editorial. A model in a black strapless gown in the hero and the closing section, a model in a car at night, a man on the phone in the lobby lounge, three friends with drinks in the courtyard, a swimmer, a woman in a sauna, a boxer, a yoga pose, a doorman in a red cape beside a woman in black. All shot or composited into the renders, warm practical lighting, dark backgrounds. Portraits are tall crops (0.75 to 0.8) placed beside or across type, never behind body copy.

## Unknowns

- The Kinescope videos (about section, gallery) could not play: DRM is unsupported in Playwright's Chromium. Only the posters were measured.
- Absolute scroll positions per effect: step counts only, as with Sobha.
- Whether the hero wordmark is SVG text or an image, and its exact size: not read from the DOM in this pass.
- Hover states beyond the cloned-button mechanic.
- The map section's data source and interaction.
- Mobile scroll frames captured with touch swipes (`CONTACT-mobile.jpg`, 33 frames): single column, header 68px, gutter 20px, 24px headlines, one image per beat, the wordmark lockup in the header once scrolled, closing "Private Terraces" with a scroll-up arrow and the wordmark.
- Lighthouse: not run.

## What to take from this site

- The restraint: one font file, one weight, uppercase, size-only hierarchy, one accent color. It reads expensive because nothing competes.
- The hero construction: tagline block, render, cut-out portrait across the seam, wordmark along the bottom edge overlapping the photo, sticky under the next section.
- Word-level masked reveals with a color change on arrival, slower default timing (0.8s) than Sobha.
- Cross-fading full-bleed backgrounds inside pinned runways, with clip reveals and shadow layers.
- Specs and numbers set as display type.
- Serving images at exactly 1.4x.
