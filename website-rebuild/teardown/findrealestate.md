# Teardown: findrealestate.com (Cuberto, Awwwards Honorable Mention, March 18 2026)

Measured October 19, 2026 in headless Chromium at 1440x900 and 390x844 (iPhone user agent). Every number below is labeled: **measured** (read from computed styles or layout in the browser), **source** (read from the site's CSS or JS), **inferred** (a reasonable read of what the measurements show), or **not verified**. Raw data: `findrealestate/desktop.json`, `mobile.json`, `css-facts.json`, `scrub.json`, `scrub-summary.txt`, contact sheets `CONTACT-*.jpg`, hero frames `desktop-hero.png`, `mobile-hero.png`, entrance video `entrance/entrance.webm`.

## Blueprint

1. **One fluid scale for the whole site.** The root font size is a fraction of the viewport width, so every rem value, and therefore every type size, padding and gap, grows with the window. The design was drawn at 1920 wide where 1rem is 10px. At 1440 everything renders at 75%. Above 1920 it stops growing. Below 768 it switches to a steeper phone scale.
2. **Two typefaces, both free.** Instrument Sans for everything, Lora (a serif) only for the testimonial quotes. Headlines are tight (negative letter spacing around 2%) and set at line height 1.0.
3. **Monochrome palette with one surface change.** Near-black ink, white, a pale gray band, and 40% white for secondary text on dark sections. No accent color at all.
4. **Pill buttons everywhere.** 100px radius, dark fill, white text, arrow icon, 0.3s transform on hover.
5. **A very tall sticky hero that tells a story on scroll.** The hero section is five viewports tall. The stage stays pinned while the clouds and the smoke layer drift at different speeds, the headline sweeps light to dark across the letters, the building fades up, then the "FIND Real Estate" wordmark appears with the photo showing through the letters as a text mask.
6. **Header that gets out of the way.** Sticky, transparent on the hero, hides when scrolling down, returns with a white background when scrolling up.
7. **Sections alternate white, pale gray, and near-black** with a constant 150 design-px top padding and a 100 design-px side gutter.
8. **Entrances are clip reveals and stagger.** Images reveal through clip-path, list rows slide up with opacity, headline words get a gray-to-black color sweep. One spring easing is reused everywhere for the reveals.
9. **Content is a normal brokerage page**: why us, three-step process, agent recruiting, testimonials carousel, services grid, support, blog posts, outro CTA, neighborhood directory, footer with giant wordmark.

## Proof

### Stack (source and measured)

| Layer | Finding | Label |
| --- | --- | --- |
| Framework | Next.js (`/_next/static/` chunks, `main-app`, `webpack` chunks, deployed on Vercel per `dpl_` query strings) | source |
| Smooth scroll | Lenis (`html.lenis` class present) | measured |
| Carousel | Swiper (`swiper-icons` font, `.swiper-slide` in testimonials) | measured |
| GSAP | Not detected as a global. Reveals use CSS transitions with cubic-bezier easings, and scroll effects are driven by JS setting transforms. | measured, inferred |
| Cookie banner | iubenda | source |
| Analytics | GTM, Facebook pixel, reCAPTCHA | source |
| Page weight on load | images 7.7MB, video 7.3MB, JS 1.1MB, fonts 102KB. Load to network idle 10.5s desktop, 8.2s mobile | measured |

### Fluid root sizing (source)

```
html            { font-size: 2.66667vw }     /* phones: 390px wide gives 10.4px */
@media (min-width: 768px)  { html { font-size: 0.520833vw } }   /* 1440 gives 7.5px, 1920 gives 10px */
@media (min-width: 1920px) { html { font-size: 10px } }          /* cap */
```

Computed root at 1440: 7.5px (measured). Computed root at 390: 10.4px (measured). Max container width 1920px (measured, 17 elements).

Because of this, the table below gives both the rendered value at 1440 and the design value at 1920 (rendered x 1.333). Build to the design value in rem.

### Type scale (measured at 1440, design value at 1920 in brackets)

| Role | Family | Size | Line height | Weight | Letter spacing | Case |
| --- | --- | --- | --- | --- | --- | --- |
| Hero h1 | Instrument Sans | 105px [140] | 1.0 | 700 | -2% | sentence |
| Section h2 | Instrument Sans | 54px [72] | 1.0 to 1.05 | 500 | -3% to -4% | sentence |
| Blog h2 | Instrument Sans | 60px [80] | 1.0 | 500 | -4% | sentence |
| Step title (span) | Instrument Sans | 33px [44] | 1.15 | 500 | -3% | sentence |
| Service card h3 | Instrument Sans | 33px [44] | 1.15 | 500 | -2% | sentence |
| Lead paragraph | Instrument Sans | 24px [32] | 1.3 | 500 | -1% | sentence |
| Testimonial quote | Lora | 24px [32] | 1.15 | 400 | -2% | sentence |
| Body | Instrument Sans | 15px [20] | 1.5 | 400 | 0 | sentence |
| Eyebrow label (h2 "Why FIND") | Instrument Sans | 15px [20] | 1.4 | 600 | 0 | sentence |
| Button | Instrument Sans | 13.5px [18] | 1.4 | 500 | 0 | sentence |
| Nav link | Instrument Sans | 15px [20] | 1.25 | 500 | 0 | sentence |
| Footer small | Instrument Sans | 12px [16] | 1.5 | 400 to 500 | 0 | sentence |
| Footer big links | Instrument Sans | 24px [32] | 1.1 | 500 | -1% | sentence |

Mobile at 390 (measured): h1 56px line 1.0, h2 45.8px line 1.05, step title 22.9px, body 16.6px line 1.5, button 16.6px. Phone type is bigger relative to the viewport than desktop type is.

Secondary words inside headlines are rendered in `rgb(179,179,179)` spans (measured, 8 occurrences on mobile): the "about real estate" half of "This isn't just about real estate" starts gray and sweeps to black on scroll.

### Color (measured, counts of elements using each)

| Token | Value | Where |
| --- | --- | --- |
| Ink | `#151717` (rgb 21,23,23) | dark sections, text, buttons. 258 uses |
| Pure black | `#000000` | hero headline, h2 on light |
| White | `#ffffff` | 442 uses |
| Pale gray surface | `#f1f1f1` | testimonials and blog bands |
| Mid gray text | `#b3b3b3` | secondary headline words |
| White 40% | `rgba(255,255,255,0.4)` | footer small links on dark |
| Hairlines | `rgba(21,23,23,0.1)` and `rgba(255,255,255,0.5)` | 1px borders |

No accent color anywhere on the home page (measured: top 16 colors are all grays, blacks, whites). The only chroma is in photos and the blue "Privacy Policy" link in the cookie bar.

### Spacing and layout (measured at 1440, design value in brackets)

- Side gutter: 75px [100] on 15 wide elements. Mobile 26px.
- Section top padding: 112.5px [150] on 9 sections. Mobile 62.4px. Secondary sections 45px [60] and 22.5px [30].
- Header height 59px desktop, 87px mobile. Sticky. White background once scrolled; transparent over the hero.
- Max width 1920px, then centered.
- Border radius: 100px (pills, 15 elements), 50% (dots), 1.5 to 2px on cards. Images have 0 radius.
- Borders: 1px hairlines only.

### Page skeleton at 1440x900 (measured, section top and height)

| Top | Height | Section | Background | What it does |
| --- | --- | --- | --- | --- |
| 0 | 4500 | hero | transparent over sky photo | Sticky stage, 5 viewports of scroll (see choreography) |
| 3585 | 1225 | why-us | white | Eyebrow "Why FIND", h2, three-item list, preview image with clip reveal |
| 4810 | 823 | arrows-section | transparent | "This isn't just about real estate" with four chevron-shaped image slices that slide in |
| 5633 | 645 | rewired | transparent | "Real Estate, Rewired." three numbered steps, rows slide up staggered |
| 6278 | 1247 | for agents | transparent | Recruiting block with a 1290x732 cover video and two photos |
| 7525 | 870 | testimonials | `#f1f1f1` | Lora quotes in a Swiper carousel, 260x330 portrait thumbnails |
| 8395 | 1547 | services | `#151717` | "How FIND Can Help You", Buy / Sell / Rent with giant words and arrows |
| 9942 | 815 | features | `#151717` | Three image cards 1.42:1 with titles and "Learn More" pills |
| 10756 | 1588 | latest-posts | `#f1f1f1` | Blog list, thumbnails reveal with clip-path |
| 12344 | 675 | outro | photo | "Find You. We'll Help You Get There." over a family photo, title clip reveal |
| 13019 | 253 | listing-discovery | white | Neighborhood link columns |
| after | footer | footer | `#151717` | Newsletter field, link columns, giant FIND wordmark cut off at the bottom |

Mobile skeleton keeps the same order, hero 2954px tall (3.5 viewports).

### Scroll choreography (measured with `scrub.js`, 300px steps at 1440x900)

| Scroll range | Element | What changes | Label |
| --- | --- | --- | --- |
| 588 to 5365 | `hero_top` | position sticky, stays pinned for the hero's length | measured |
| 588 to 4767 | `hero_cloud` | transform changes on every step (parallax drift) | measured |
| 588 to 4767 | `hero_smoke` | transform changes on 16 steps (second parallax layer, slower) | measured |
| 588 to 2376 | `hero_logo` | opacity, fades out over the first two viewports | measured |
| 1487 to 2104 | `hero_composite` | opacity, the "FIND Real Estate" wordmark composite fades in | measured |
| 5064 to 5665 | `hero_house` | opacity, then one transform at 4767 | measured |
| 588 | header | transform, hides on first scroll down (`header_-hidden`) | measured |
| 3268 | header | background becomes white, class `header_-fixed` | measured |
| 3268 to 4185 | `why-us_preview` | clip-path reveal, 4 steps (about 900px of scroll) | measured |
| 4185 to 6267 | `arrows-section_arrow` x4 | transform and opacity, chevrons slide in | measured |
| 5064 to 6865 | `rewired_list-item` x3 | transform and opacity, staggered | measured |
| 5665 to 7460 | `assymetric-image-split_image` and `small-img` | clip-path reveal | measured |
| 7165 to 8365 | `testimonials_preview` | clip-path reveal | measured |
| 10465 to 11968 | `post-entry_thumbnail` | clip-path reveal per post | measured |
| 10765 to 11669 | lazy images | opacity 0 to 1 on load | measured |
| 11968 to 13111 | `outro_title` | clip-path reveal | measured |

Headline letter sweep: in `desktop-hero.png` the first two letters "Fi" and the last two "ou" are lighter than the middle. This is a gradient mask moving across the h1 as it enters (inferred from the frame, the mask itself was not read from source).

Hero wordmark: `desktop-scroll-01.png` and `-02.png` show "FIND Real Estate" in giant letters with the building photo visible inside the letterforms, sky around. This is the photo masked by the text (inferred, consistent with `hero_composite` fading in at 1487 to 2104).

### Easing and durations (source, from stylesheet rules)

| Easing | Uses | Used for |
| --- | --- | --- |
| `cubic-bezier(0.16, 1, 0.3, 1)` | 29 | the main reveal curve (an "expo out"), also on `grid-template-columns 1s` for the accordion |
| `ease-out` | 16 | opacity fades |
| `cubic-bezier(0.5, 1, 0.89, 1)` | 9 | transform in the 3-part reveal transition |
| `cubic-bezier(0.34, 5.56, 0.64, 1)` | 6 | a heavy overshoot spring (icons, arrows) |
| `cubic-bezier(0.34, 3.56, 0.64, 1)` | 2 | lighter overshoot |
| `cubic-bezier(0.4, 0, 0.2, 1)` | 3 | material standard, modals |

Most common transition on hover: `transform 0.3s ease` (19 elements, measured). The reveal transition on images reads as `opacity 0.4s ease, transform 4s cubic-bezier(0.5,1,0.89,1), clip-path 1s cubic-bezier(0.16,1,0.3,1)` (measured on 3 elements): a one-second clip reveal with a four-second slow drift of the image underneath.

`prefers-reduced-motion: reduce` has one rule (source). `(pointer: fine)` and `(hover: hover)` gate hover effects (source, 21 and 7 rules).

### Images (measured)

| Slot | Rendered at 1440 | Ratio | Natural file | Fit |
| --- | --- | --- | --- | --- |
| Hero sky | 1440x900 | 1.6 (fills viewport) | 1920x1306 | cover |
| Hero building composite | 1872x1665 | 1.12 | 700x622 (upscaled, soft by design) | contain |
| Chevron slices | 843x358, 702x298 | 2.36 | 475x201 | cover |
| Wide strips | 1440x465 | 3.1 | 475x153 | cover |
| Agents video | 1290x732 | 1.76 | video | cover |
| Testimonial portraits | 260x330 | 0.79 | 346x440 | cover |
| Feature cards | 732x516 | 1.42 | 475x334 and 976x688 | cover |
| Outro | 1512x314 | 4.82 | 1440x309 | cover |

Image treatment: no overlays, no grain, no rounded corners, no filters (measured: filter none on all). The photography is bright, blue-sky, warm-light, slightly dreamlike (the hero building is an AI-style render composited into real sky, inferred from the 700px source and the soft edges).

People photography: lifestyle, candid, two people laughing over coffee, a father with a child. Portraits for testimonials at 0.79 ratio, tight crops. No studio headshots on the home page.

### Navigation, cursor, footer (measured)

- Nav: logo left, seven text links centered, "Sign In" pill right. Mobile: logo and hamburger only, `burger-menu_slideDown` keyframe (source).
- Cursor: default. No custom cursor element.
- Footer: newsletter input with arrow, three link columns, address and phone, then the wordmark at roughly 300px cap height cropped by the page bottom (`desktop-scroll-13.png`).
- Loader: none. The page paints the hero directly (entrance video, first frame at 924ms shows nav only, hero in by 6s on this slow connection).

## Unknowns

- The exact hero timeline function (which scroll fraction drives which layer) is inside minified Next.js chunks and was not read. The ranges above come from observation at 300px steps, so the real start and end points may be up to 300px off.
- The headline gradient sweep: inferred from frames, the mask CSS was not isolated.
- Whether Lenis is configured with the default lerp or a custom value. Not read from source.
- The hover state of the pill buttons beyond `transform 0.3s ease`: the hover rules found are for dropdown items and the cookie banner, not the pills. Likely a slight scale or arrow slide. Not verified.
- Page transitions between routes: not tested, only the home page was loaded.
- The agents video codec and whether it autoplays muted on mobile: not verified (Playwright Chromium cannot decode H.264).
- Lighthouse scores: not run.

## What to take from this site

- The fluid rem scale (0.52vw per rem from 768 up, capped at 1920) is the cleanest way to get "same proportions at every width". Adopt it.
- The hero as a sticky five-viewport story with parallax layers, a logo fade, and a photo-through-text wordmark. This is the most distinctive thing on the page.
- Clip-path reveals with the expo-out curve `cubic-bezier(0.16,1,0.3,1)` at 1s, with the image drifting 4s underneath.
- Header hide-on-down, show-on-up with a surface change.
- Gray-to-black word sweep on headlines.
