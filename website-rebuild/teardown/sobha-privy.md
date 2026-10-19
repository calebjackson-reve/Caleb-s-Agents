# Teardown: sobha-privy-collection.com (Vide Infra, Awwwards Site of the Day, September 23 2026)

Measured October 19, 2026 in headless Chromium at 1440x900 and 390x844. Labels: **measured** (computed styles or layout), **source** (CSS or JS read from the site), **inferred**, **not verified**. Raw data: `sobha-privy/desktop.json`, `desktop-attop.json`, `mobile.json`, `css-facts.json`, `scrub.json`, `scrub-summary.txt`, `CONTACT-*.jpg`, `desktop-hero.png`, `mobile-hero.png`, `diag/shared.js` and `diag/landing.js` (the site's own bundles), `entrance/entrance.webm`.

One limitation up front: the hero plays a looping video (`uploads/ribbons.mp4`, flowing black silk ribbons, inferred from the file name and the ribbon imagery elsewhere on the page) over the title, and a WebGL "three worlds" scene lower down. Playwright's Chromium cannot decode H.264, so the hero video was replaced by a flat dark stub during measurement. Frames of the hero therefore show a plain `#222` background. Everything else rendered.

## Blueprint

1. **A black-and-ivory luxury magazine, 48 viewports long.** The home page is 42,936px tall at 1440x900. Sections are sized in whole viewports (900, 1800, 2700, 5850px) and most of the length is pinned scroll where the content moves while the stage stays.
2. **Three typefaces with strict roles.** A script display face (Altesse Std, from Adobe Fonts) for the one emotional word ("The art", "Sublime", "Iconic", "Extraordinary"), a light high-contrast serif (TT Ramillas Light) in uppercase with 2% tracking for every headline, and a grotesk (TT Commons Pro Medium and DemiBold) at 13px for all body copy and 11px uppercase with 8% tracking for labels. Headlines are huge: 80px standard, 114px for section titles.
3. **Two colors and a gray.** Brand black `#1a1919`, white, and gray `#717170` for secondary headlines. Sections alternate `ui-dark` and `ui-light`, and the header and cursor flip color per section.
4. **Custom virtual scroll with lerp 0.1.** The body never scrolls. A Locomotive-style engine intercepts wheel, touch and keyboard, eases the position with a 0.1 lerp, and translates the sections. Every pinned effect is driven from that position.
5. **One easing for the whole site.** `cubic-bezier(0.7, 0, 0.3, 1)` at 0.4s for color and opacity, 1s for transforms. Nothing else is used for UI. Carousels use a 500ms and 1200ms custom ease.
6. **Text enters letter by letter.** Headlines are split into words and characters (`span.word-wrap > span.word > span.char`). Each character translates, fades and changes color as it enters, inside a line mask whose height animates.
7. **Images enter under a parallax and a mask.** Pictures carry `parallax-image-move` and shift on scroll. Full-bleed backgrounds use `background--cover` or `background--top` with their own transform. The hero is a `sticky--under-next` layer: the next section slides over it.
8. **Pinned set pieces.** A pinned "Three Worlds" WebGL stage with a clip reveal and a sticky title, a 16,284px "Tenets" section that turns vertical scroll into a horizontal slider (`l-expansive-slider`), a "Finesse" image wall, a pinned map with a dim layer and location cards.
9. **Interface is minimal and typographic.** Hamburger "Menu" top left, wordmark centered, "3D Map" top right, a circular plus button for the map, a circular arrow for scroll. Buttons are text with a clone that slides up through a clip-path on hover. Radius only 15px on two elements and 50% on the circles. No borders at all.
10. **Ends with a gradient-filled statement.** "The feeling that can only be captured by calling it sublime" fills from gray to white as the scroll completes (`footerText` keyframe), then the register form.

## Proof

### Stack (source and measured)

| Layer | Finding | Label |
| --- | --- | --- |
| Builder | Custom, no framework. `assets/js/shared.js` (357KB) and `landing.js` (221KB), `global.css` 948 rules and `landing.css` 391 rules | source |
| jQuery 3.7.1 | present as a global | measured |
| Virtual scroll | Locomotive-style engine: `has-scroll-init has-scroll-smooth` on html, options `direction:"vertical", lerp:.1, class:"is-inview", scrollbarClass:"c-scrollbar"`, listens to `wheel`, `touchmove`, `keydown` | source |
| Page transitions | Barba (`data-barba="wrapper"`, `data-barba-namespace="page"`, 28 references) | source |
| 3D | Three.js (`THREE` references in shared.js, `l-three-worlds-webgl` element) | source, measured |
| ScrollTrigger | 4 references in landing.js, likely their own helper named the same, GSAP is not a global | source, inferred |
| Carousels | keen-slider (`keen-slider__slide`, `Duration:500`, `Duration:1200`, `easing:"easeFreeCarousel"`) | source |
| Fonts | Adobe Fonts kit `use.typekit.net/ksy5uvi.css` (Altesse Std 24pt and 64pt optical sizes), self-hosted TT Commons Pro Md and Db, TT Ramillas Light as woff2 | source |
| Page weight | images 20.5MB on the home page alone, JS 560KB | measured |
| Load | 7.8s to network idle desktop | measured |

### Root sizing (source)

`html { font-size: 62.5% }` so 1rem = 10px at every width (measured 10px at 1440 and 390). There is no fluid scale. Breakpoints are unusual: they combine width with aspect ratio, for example `(min-width: 1440px) and (min-height: 700px)` (198 rules) and `(min-width: 980px) and (min-aspect-ratio: 10/11)` (197 rules). Phones are `(max-width: 567px) and (max-aspect-ratio: 13/9)`.

### Type scale (measured at 1440)

| Role | Family | Size | Line height | Weight | Tracking | Case |
| --- | --- | --- | --- | --- | --- | --- |
| Script word ("The art", "Sublime") | altesse-std-64pt | 100px | 1.0 | 400 | 0 | as written |
| Hero h1 ("OF THE SUBLIME") | TT Ramillas | 80px | 1.06 | 300 | 2% | uppercase |
| Section title ("Tenets", "Expansive Spaces", "Penthouses") | TT Ramillas | 114px | 0.96 | 300 | 2% | uppercase |
| Standard h2 and h3 | TT Ramillas | 80px | 1.06 | 300 | 2% | uppercase |
| Gray statement h2 ("Evoking a sensation") | TT Ramillas, `#717170` | 80px | 1.06 | 300 | 2% | uppercase |
| Secondary h2 ("of the rarest luxury homes") | TT Ramillas | 50px | 1.0 | 300 | 2% | uppercase |
| Small serif label ("Iconic Addresses", "Privy Collection") | TT Ramillas | 28px | 1.25 | 300 | 2% | uppercase |
| Body | TT Commons Pro | 13px | 1.23 (16px) | 500 | 0 | sentence |
| Eyebrow and buttons | TT Commons Pro | 11px | 1.36 (15px) | 600 | 8% (0.88px) | uppercase |
| Nav ("Menu", "3D Map") | TT Commons Pro | 13px | 1.23 | 500 | 0 | sentence |

Mobile at 390 (measured): h1 60px, section titles 60px, secondary 40px, body 13px, labels 11px. The script word drops to 80px.

Body copy is deliberately tiny (13px) against 80 to 114px headlines, a ratio of about 1:7. Lines are short: body columns sit in a 12-column grid (`col--md-2`, `col--md-3`, `col--xs-4`) and rarely exceed 300px wide.

### Color (source variables and measured use)

| Token | Value | Use |
| --- | --- | --- |
| `--c-brand-black` | `#1a1919` | text on light, 3550 uses; dark section surfaces |
| `--c-total-black` | `#000` | hero and a few full-bleed sections |
| `--c-white` | `#fff` | 3249 uses |
| white 50% | `rgba(255,255,255,0.5)` | 996 uses, secondary text on dark |
| `--c-gray` | `#717170` | gray headline statements, 490 uses |
| `--c-error` | `#930000` | forms only |

Surfaces alternate per section: hero `#000`, about white, merit `#1a1919`, evoking `#000`, sublime `#1a1919`, collection `#000`, tenets white, expansive transparent over white, selection `#1a1919`, locations `#000`, the idea white, contact white (measured, `desktop-attop.json`). The header carries `ui-dark` or `ui-light` to flip its own color to match (measured: `header ui-light` at the top, `ui-dark ui-gradient ui-intro` after).

### Spacing and layout (measured at 1440)

- Side gutter 30px. That is all. Content width is governed by the 12-column grid, not a max-width (`--container-max-width: 100vw`, `--grid-gutter: 0vw`).
- Section top padding: 180px on three sections, 90px, 60px, 30px. Pinned sections use padding equal to whole viewports: 900px and 1800px (that padding is the scroll runway while the sticky layer holds).
- Spacing tokens: `--spacing` resolves to 40px / 30px / 20px steps (source).
- Header: fixed, 91px tall at 1440, transparent, no blur.
- Radius: 15px on two elements, 50% on circles. Borders: none.
- Images: no radius, no filter, object-fit cover. Natural sizes are served at 1.4x the rendered size (2016px for a 1440 slot).

### Page skeleton at 1440x900 (measured at top of page)

| Top | Height | Section | Surface | What it is |
| --- | --- | --- | --- | --- |
| 0 | 901 | hero `section--top section--full-height` | `#000` + ribbon video | Script "The art" over "OF THE SUBLIME", 3D Map plus button bottom right, arrow bottom left. `sticky--under-next`: the next section slides up over it |
| 900 | 2724 | about `ui-light` | white | "A handpicked collection of the rarest luxury homes", interior photos at 0.73 and 0.7 ratio sliding with parallax, eyebrow label |
| 3623 | 900 | merit `section--full-height ui-dark` | `#1a1919` | Full-bleed background with content layer, both translate |
| 4522 | 1424 | evoking `ui-dark` | `#000` | Gray 80px statement "EVOKING A SENSATION CHASED BY SO MANY, ATTAINED BY SO FEW" with a 720x900 photo (0.8 ratio) sliding beside it |
| 5945 | 900 | sublime `section--full-height` | `#1a1919` | Black-and-white portrait of a woman with "Sublime" in script |
| 6844 | 4772 | collection | `#000` | "The Three Worlds" WebGL stage (clip reveal and sticky title), then Mansions, Villas, Penthouses cards full-bleed with 114px titles |
| 11615 | 2700 | tenets `ui-light` | white | Title "Tenets" 114px, background image parallax |
| 12515 | 16284 | expansive section | transparent | Pinned horizontal slider: Expansive Spaces, Iconic Addresses, Uncompromising Finesse, Exclusive Amenities, Extraordinary Privacy, A Cut Above. Each with a script word plus serif title, a photo wall, body column |
| 28798 | 2760 | selection `ui-dark` | `#1a1919` | "The process of making the Privy Collection" with a handpicked carousel |
| 31557 | 5850 | locations `ui-dark` | `#000` | Dubai map line drawing, pinned, dim layer fades, location cards (The S, Sobha Seahaven, Sobha Hartland) slide in from the right |
| 37406 | 3711 | the idea `ui-light` | white | "If you must journey, make it towards the pursuit of the rare and the exceptional" with a black-and-white portrait, ribbon imagery, two short statements |
| 41116 | 1081 | contact / register | white | Gradient-fill statement over a chandelier photo, then the form and footer |

### Scroll choreography (measured with `scrub.js`, one ArrowDown per step, 140 steps)

The probe could not read an absolute scroll position on this site (the body never moves), so ranges are given in probe steps. One step is one keyboard arrow, about 40 to 60px of virtual travel after lerp settles.

| Steps | Element | What changes | Reading |
| --- | --- | --- | --- |
| 1 to 6 | hero section, `sticky--under-next`, `intro sticky__layer--sticky` | transform | hero is pinned while the about section slides over it |
| 1 to 17 | section#about | transform | the section itself is translated (the virtual scroll) |
| 1 to 11 | `picture.parallax-image-move` | transform, 20 changes | interior photos move slower than the page |
| 2 to 124 | `img` | transform, 213 changes | nearly every image carries parallax |
| 11 to 20 | `l-merit-background` and `l-merit-content` | transform | background and content move at different rates |
| 15 to 47 | `picture.background--top` | transform, 35 changes | long parallax on the evoking and sublime backgrounds |
| 25 to 139 | `sticky__layer--sticky` | transform, 33 and 74 changes | the pinned layers that hold while content passes |
| 27 to 53 | `circle` | opacity | SVG rings in the collection section fade in and out |
| 28 to 30 | `l-three-worlds-webgl` | transform, then clip 34 to 38 | the WebGL stage slides in then is revealed through a clip-path |
| 28 to 38 | `l-three-worlds-sticky__title.h0` | transform | the title stays pinned while the three cards pass |
| 28 to 52 | `div.line-wrap` and `div.line` | height | line masks opening on split text |
| 46 to 61 | section#tenets, `l-tenets-background` | transform | title section with background parallax |
| 53 to 124 | `l-expansive-section` | transform, 72 changes | the pinned runway (16,284px) |
| 56 to 117 | `l-expansive-slider`, `sticky-slider__sticky` | transform, 62 and 61 changes | vertical scroll turned into horizontal travel |
| 71 to 80 | `l-expansive-finesse-images__iframe` | transform | an image wall inside the slider moves on its own |
| 125 to 135 | section#selection, `l-handpicked-carousel-title` | transform | |
| 127 to 139 | section#locations, `l-location__map-inner` | transform; `l-location__map-dim` and `l-location-intro` opacity | map pans, dims, intro fades out, cards come in |
| throughout | `span.char` | transform, opacity, color (561 color changes, 236 transform and opacity) | character-level entrances on every headline |
| throughout | `span.word-wrap`, `span.word` | height (287 and 196) | line masks |

Header behavior: `header--sticky`, position fixed, class flips between `ui-light` and `ui-dark` by section (measured).

### Easing and durations (source)

| Easing | Uses | For |
| --- | --- | --- |
| `cubic-bezier(0.7, 0, 0.3, 1)` | 28 rules, 17 computed transitions at 0.4s on color, 8 at 0.4s on opacity, 5 at 1s on opacity, 4 at 1s on transform and opacity | the house curve, everything |
| `cubic-bezier(0.29, 0.52, 0.5, 1)` | 5 | softer out, probably the cursor or the map |
| `cubic-bezier(0.6, 0, 0.4, 1)` | 1 | opacity with color |
| keen-slider `Duration:500` and `Duration:1200`, `easing:"easeFreeCarousel"` | carousels | source |
| JS tweens | `duration:.3`, `.8`, `1`, `Stagger:.01`, `.02`, `.04` in landing.js | character stagger of 10 to 40ms per character | source |
| virtual scroll | `lerp:.1` | one tenth of the remaining distance per frame | source |

Keyframes (source): `move-left` (0 to -40px and back, a nudge), `logoGradient` (background-position 200% to 50% while scale 1.25 to 1, the logo shimmer on load), `footerText` (background-position-y 0 to 200%, the gradient fill on the closing statement), `gradient-flow`.

Button hover (source): `.btn--cloned` has two copies of the label; on hover the first moves `translateY(-300%)` behind a clip-path polygon and the clone comes up from below into `translateY(0)`. All at the house curve.

### Images (measured at top)

| Slot | Rendered | Ratio | Natural | Fit |
| --- | --- | --- | --- | --- |
| Hero poster and video | 1440x900 | 1.6 | 2016x1092 and 1280x720 | cover |
| About interiors | 410x560, 600x860, 410x561 | 0.73, 0.70 | 574x784, 840x1204 | cover |
| Evoking photo | 720x900 | 0.8 | 1008x1260 | cover |
| Full-bleed backgrounds | 1440x900, 1440x780 | 1.6, 1.85 | 2016x1092 | cover or fill |
| Square and 1.2 panels | 1440x1440, 1440x1200 | 1, 1.2 | 2016x2016, 2016x1680 | fill |
| Map thumbnail | 300x200 | 1.5 | 2016x1134 | contain |
| Location card | 316x359 | 0.88 | 896x504 plus a video | cover |

Treatment: no filters, no radius, no overlays measured. Grade is warm neutral interiors on white sections, and on dark sections either black-and-white portraits or deep shadowed renders. Portrait crops are 0.7 to 0.8, tall and narrow.

People photography: one black-and-white portrait of a woman in profile ("Sublime" section), one black-and-white seated portrait of a man in a dark suit (the idea section), both desaturated, high contrast, lots of negative space, text set beside not over them.

### Navigation, cursor, loader (measured)

- Nav: three-line hamburger with the word "Menu" left, two-line wordmark centered ("THE PRIVY" serif over "COLLECTION" 8px tracked label), "3D Map" right. Fixed, 91px.
- Cursor: a custom cursor element exists (`customCursorEl: true`), body cursor auto. Behavior not captured.
- Loader: `.preloader` hidden at ready, then `.preloader--intro` 900px tall that holds until the hero video can play, then releases. With the stub video it released on its own.
- Scroll hint: a circular arrow bottom left.

## Unknowns

- The hero ribbon video itself and the WebGL "Three Worlds" scene: not rendered here (codec and software GL). What is known: file `uploads/ribbons.mp4` and a smaller `rubbons-xs.mp4` for phones, and a `l-three-worlds-webgl` element that gets a clip reveal.
- Absolute scroll positions for each effect. The engine never moves the window, and the probe only has step counts.
- Exact per-character stagger and distance values at runtime: `Stagger:.01` to `.04` and `duration:.8` are in the source but which applies to which element was not traced.
- Custom cursor behavior and the 3D map page.
- Mobile scroll captures: the mobile pass stopped after two frames because the document height reads as one viewport on this engine. Type and section data at 390 are valid; a re-run with the fixed height calculation is queued.
- Lighthouse: not run.

## What to take from this site

- The three-role type system: one script word, one light uppercase serif at 80 to 114px with 2% tracking, one 13px grotesk. This is the "luxury" signal, more than any effect.
- Section-by-section surface flips with the header following.
- Character-split entrances inside line masks, at 10 to 40ms stagger, on the single house curve `cubic-bezier(0.7,0,0.3,1)`.
- Sticky-under-next hero and pinned runways sized in whole viewports.
- The vertical-to-horizontal pinned slider for a long feature list.
- The gradient-fill closing statement.
