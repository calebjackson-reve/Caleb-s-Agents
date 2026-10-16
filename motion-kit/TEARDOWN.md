# heronaiapp.com motion teardown

What the site is built with and exactly how each motion effect works, taken
from the live page on 2026-10-13. "Confirmed" means it was read from the
site's own code or measured in a headless browser. "Inferred" means a
reasonable read of obfuscated code that could not be fully verified.

## Stack (confirmed)

| Layer | What | Notes |
| --- | --- | --- |
| Builder | Webflow | Static export, Webflow IX2 is loaded but every effect below is custom code |
| Smooth scroll | Lenis 1.1.5 | Wrapper is `div.main-inner.lenis`, not the window |
| Animation | GSAP 3.12.5 + ScrollTrigger + SplitText 3.13 + TextPlugin | `ScrollTrigger.update` is called from the Lenis scroll event, `lenis.raf` runs on `gsap.ticker` |
| Page transitions | @barba/core + @barba/prefetch | `sync: true`, one default transition, every page re-inits Webflow modules after enter |
| Carousels | Swiper 11 | Partner logo row: `slidesPerView: auto`, `loop`, `freeMode`, `speed 600`, `autoplay 3000` |
| Custom code | `https://heronai-bp.netlify.app/main.js` | 290 KB, three layers of javascript-obfuscator string tables; loaded by a tiny `config.js` that prefers a local Vite dev server when `?dev` is in the URL |
| Fonts | BT Grotesk (headings and body), Geist Mono (labels, coordinates) | 1rem = 10px base |
| Palette | paper `#f5f5ef`-ish, ink `#282828`, border `#b3b3af`, brand `#fa3600`, highlight `#FF6B30` | All as CSS variables on `:root` (`--content--brand`, `--content--primary`, ...) |

## Page skeleton (confirmed)

Home sections in order and height at 1440x900: `home-hero` 887px,
`home-intro` 723px, `home-problem` 743px, `home-map` 6300px (the sticky
sequence), `home-platform` 710px, `home-why` 681px, `home-usecase` 887px,
`cta` 698px, footer. Total scroll height 12338px.

Forty one ScrollTriggers are registered on the home page. Twenty nine of
them are one-shot section reveals, one is the scrubbed text in the intro,
one is the sticky sequence timeline, the rest are "wrap" triggers with
`clamp(top bottom+=50%)` to `bottom top-=50%` that only set up and tear
down the heavier modules as they come near the viewport.

## Effect by effect

### 1. Loader (confirmed)

Fixed panel inset 0.8rem. A hairline progress bar at the top uses
`clip-path: inset(0 100% 0 0)` driven by GSAP. Live X and Y pointer
coordinates print into `[data-loading-control="x|y"]` from the same ruler
controller used in the hero. The headline is split with SplitText
(`type: "lines, words"`, `mask: "lines"`) and rises from `yPercent: 100,
opacity: 0`. On exit two hairlines (`.loading-progress-item.item-top` and
`.item-bot`) travel to where the header and hero bottom will sit
(`duration 0.8`, `cubic-bezier(1, 0, 0.44, 1)`, color fades to the border
gray), the content fades (`0.4s power2.out`), the panel hides. A
`sessionStorage.isLoaded` flag shortens repeat visits. Non-home pages use a
different, shorter version driven by two CSS variables
`--trans-percent` and `--mask-percent` (0% to 50% to 100%).

### 2. Smooth scroll (confirmed)

```js
new Lenis({ wrapper: document.querySelector('.main-inner'), content: ..., syncTouch: true, smoothWheel: true, smoothTouch: false, infinite: false })
```
Every ScrollTrigger uses `.main-inner` as its `scroller`. Scroll height is
re-measured with a ResizeObserver on the content (200ms debounce) and both
`lenis.resize()` and `ScrollTrigger.refresh()` are called when it changes.
`scrollRestoration` is set to `manual` and the page always starts at 0.
The header toggles an `on-hide` class by scroll direction.

### 3. Custom cursor (confirmed from code, read in the clear)

Two layers:

- A full screen `<canvas id="canvas-cursor">`, DPR capped at 2. The
  position eases toward the pointer at factor 0.18 per frame. A trail of
  the last 34 positions is stroked at 1.4px with alpha
  `t² × 0.7 × visibility × speedFactor` where `speedFactor` is
  `clamp((speed - 1.5) / 6, 0, 1)`, so the line only shows when you move
  fast. A 9px filled square is drawn at the pointer only while hovering an
  interactive element (`hoverProgress > 0.99`) or while pressed.
- A DOM "hover square" that scales from 6/14 to 1 over interactive
  elements (eased 0.15), gets a lighter border while pressed, and uses a
  textured background with `mix-blend-mode: saturation`.

Interactive selector: `a, button, ... [data-cursor]:not([data-cursor="hidden"])`.
Anything inside `[data-cursor="hidden"]` hides both layers (the hero image
and the loader use this so only the ruler shows). The cursor is only
created when `(hover: hover) and (pointer: fine)` matches and
`prefers-reduced-motion` does not. Accent color is read from a CSS variable.
An older DOM cursor (`.cursor > .cursor-main > .cursor-inner`, 0.6rem accent
dot) is still in the markup but its dot stays at opacity 0.

### 4. Hero ruler, coordinates and drag-select (confirmed)

A `RulerController` class takes selectors for a vertical line, a horizontal
line, a plus marker, a coordinates box, an optional tooltip, and a group of
elements to fade on hover. Each frame:

- target = pointer position relative to the wrapper
- current = `lerp(current, target, 0.3)` clamped 16px inside the wrapper
- vertical line `x = current.x`, horizontal line `y = current.y`
- line opacity eases (0.1) to 0.16, or to 0 when the pointer is clamped at an edge
- plus marker scale eases (0.08) to 1.2 at the edges and its color alpha fades out there
- coordinates box and tooltip are placed on whichever side of the pointer keeps them inside, with a 4rem gap, flipping near the edges
- the readout writes `targetX.toFixed(0)` and `targetY.toFixed(0)` into `[data-control="x|y"]`
- the hover group fades in over 0.25s on `mouseenter` and out on `mouseleave`; the RAF loop pauses while the pointer is outside

Lines are `mix-blend-mode: difference` at opacity 0.2 over the hero image.

Drag-select: on `mousedown` a `div` with `1px solid #F15534` is prepended
at the pointer. On move, width, height, left and top are set from the drag
delta once it exceeds 2px and a gradient is chosen by quadrant:
right+down `315deg`, right+up `225deg`, left+down `45deg`, left+up
`135deg`, from `rgba(241,85,52,0.64)` at 0% to transparent at 67%. Every
`.home-hero-img-deco` whose rect overlaps the box gets `.active` (its
`.home-hero-img-deco-bg` square grows from 1.6rem to full size with a
0.4s transition on top, right, width and height, and its detail panel fades
in). The "click and drag" tooltip gets `.hidden` on first hit. Clicking a
marker clears it. `mouseup` removes the box. The two little accent squares
pulse with `data-anim="fade-loop"`.

### 5. Text reveals (confirmed)

Four SplitText classes:

- **Word color sweep** (`Tt`, `Ht`): `SplitText.create(el, { type: "lines, words" })`.
  Words start at `rgba(29,29,29,0)` (or transparent white on dark) and
  tween through a `keyframes` array `[from, "#FF6B30", to]` with
  `easeEach: "power2.in"`, `ease: "power1.out"`, duration 1 (0.8 when
  `isFast`), stagger 0.08 (0.03 fast). Words inside `.txt-highlight` end on
  `#FF6B30` instead of the body color. The split reverts on complete. On
  mobile it re-arms when scrolled back above (`onLeaveBack`) with a faint
  `rgba(29,29,29,.1)` resting color.
- **Heading rise** (`p`): lines masked, words from `yPercent: 100,
  autoAlpha: 0` to `0 / 1`, duration 0.8, `power2.out`, stagger 0.02.
- **Typewriter** (`qt`): GSAP TextPlugin `text: { value: "", speed: 3 }`
  played in reverse from empty.
- **Scrubbed intro**: `.home-intro-content-title` words tween color from the
  disabled gray to the primary ink with stagger 0.03 and duration 0.5,
  `scrub: true`, `start: "center bottom+=10%"`, `end: "center top+=40%"`.

### 6. Section reveals (confirmed)

Generic `X` class: `opacity 0` plus a 32px offset in the chosen direction
(`bottom`, `top`, `left`, `right`, `none`) to `opacity 1, 0`, duration 1,
ease `power3`, `clearProps: "all"`. Images (`s0`): `autoAlpha 0` and a
slight scale to `scale 1`, duration 1.6, `expo.out`. Each section builds one
paused timeline with its tweens placed 0.05s apart and plays it once from a
ScrollTrigger at `top+=40% bottom` (some use 45%, 55%, 65% depending on
how tall the section is).

### 7. Sticky scroll sequence, the "map" section (confirmed)

`.home-map-main` is `height: 700dvh`. Inside it `.home-map-inner` is
`position: sticky; top: 0; height: calc(100dvh - 1.6rem)`. One timeline
with `scrub: true` runs from `top top` to `bottom-=30vh bottom`. For each
of the stacked frames (`.home-map-main-img`, all in the same grid cell):

```js
tl.fromTo(img, { autoAlpha: i === 0 ? 1 : 0, y: "3rem", scale: i === 0 ? 1 : 1.04 }, { autoAlpha: 1, y: 0, scale: 1 })
  .fromTo(img, { autoAlpha: 1, y: 0, scale: 1 }, { autoAlpha: 0, y: "-3rem", scale: 0.96 });
```
The frames are the big headline "Right there with you", "For the whole
design" and three increasingly detailed floor plans whose SVG paths start
at `opacity 0, scale 1.1`. A small "Introduction" card at bottom left
(`.home-map-intro`) toggles `.active` while a given frame is between 0 and 1
progress and its content height animates. A second scrubbed timeline from
`top bottom` to `top top` slides the sticky inner up by its own height so
the section appears to push in. When progress reaches 1 the section gets
`.expanded`, the right-hand content column animates its width from 0 and a
content timeline plays. Numbered hotspots (`.home-map-number`) open
`.home-map-main-img-sub-hover[data-hover]` panels on hover and click.

### 8. Pixel-dissolve button fill (confirmed)

Markup: `.btn-fill > .btn-fill-bg + .btn-fill-label (top and bottom copies) + .btn-fill-icon`.
The `.btn-fill-bg` layer is masked with
`https://heronai-bp.netlify.app/assets/pixel-mask.svg`, a 20 frame sprite of
a 24 by 6 cell grid (`viewBox="480 0 4800 60"`, each frame 240 units) where
cells switch on left to right with noise and a few cells at 0.05 to 0.3
opacity for a dithered edge. The bg is sized so the cells stay square:
`cell = max((w + 2) / 24, (h + 2) / 6)`, width `cell × 24`, height
`cell × 6`.

Enter: timeline tweens `maskPosition` from `0% 0` to `100% 0` in 580ms with
`ease: "steps(19)"` while the label color tweens to the active color in
150ms, class `is-fill-active` is added. Leave: if the enter finished, class
`is-fill-exiting` (bg painted in the resting color) and the same dissolve
plays again so the fill appears to erase; then classes and inline styles
are cleared with a 250ms `is-fill-resetting` guard. Touch pointers are
ignored. Reduced motion jumps straight to the end state. The label does the
usual two-copy slide (`label-top` out, `label-bot` in) and the arrow icon
slides right.

### 9. Marquee (confirmed)

A class clones the row `ceil(viewportWidth / itemWidth) + 1` times and sets
`animation-duration` to `ceil(itemWidth / 40)` seconds, so 40px per second
regardless of width, direction left or right.

### 10. Ink reveal on images (confirmed)

`.ink-mask` wraps a base image (`.ink-mask-img.main`) and an overlay
(`.ink-mask-img.sub`) that is an SVG `<image>` masked by a `<circle>`. The
circle has a filter: `feTurbulence baseFrequency="0.028 0.04"
numOctaves="3"`, `feDisplacementMap scale = min(150, radius × 0.7)`,
`feGaussianBlur`, and `feComponentTransfer` with `feFuncA slope 5
intercept -2.15` which hardens the blurred edge into an ink blob. The
viewBox is 1000 wide with height from the aspect ratio, radius is 45% of
the smaller side. On `pointerenter` the radius tweens up, on move the
center lerps toward the pointer, on leave it shrinks. A second cloned
circle (`data-pointer-ink-pulse`) is used for a click pulse. Safari and
Firefox strip the filter and get a plain circle. Some ink masks also scrub
with scroll between `data-start` and `data-end` percentages of the
viewport, and one morphs its mask path to
`M 0 1000 Q 500 1250 1000 1000 L 1000 0 L 0 0 Z` (a curved bottom edge).

### 11. Small CSS hovers (confirmed)

- Problem cards: four plus-shaped corners scale from 0 to 1 (0.4s), an
  accent dot fades in, the line-art color goes from border gray to ink.
- Header menu items: color transition 0.4s, a small arrow icon swaps corner
  with `cubic-bezier(0.23, 1, 0.32, 1)`.
- Dashed hairlines are repeating SVG backgrounds (`border.svg`, 1.6rem
  period) and get a darker variant on hover with an opacity fade.
- FAQ rows use jQuery `slideDown` / `slideUp`.

### 12. Page transitions (inferred, not reproduced)

Barba `leave` awaits a transition module's `play()`, `once` runs the
loader, then each page view's `initEnter` builds its modules. The non-home
transition uses the `--trans-percent` and `--mask-percent` variables to
wipe a mask across and grow a vertical `--size--line`. Rebuilding this
needs a multi-page site, so the kit documents it instead of shipping it.

## Where the numbers came from

- `main.js` was decoded by evaluating its three string tables in Node and
  inlining the results (the decoder script is in the session scratchpad,
  not in this repo).
- Runtime values (ScrollTrigger starts and ends, Swiper params, computed
  styles, section heights, listener targets) were read from the live page
  in headless Chromium at 1440 by 900.
