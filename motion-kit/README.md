# Motion Kit

A drop-in set of the scroll, cursor and hover effects from heronaiapp.com,
rebuilt from scratch so you can use them on your own site. Read
[TEARDOWN.md](TEARDOWN.md) for how the original does each one.

Open `index.html` to see every effect on a demo page with placeholder
real-estate content. Colors, fonts and the accent are CSS tokens at the top
of `motion.css`.

## What is in the box

| Module | Call | Markup |
| --- | --- | --- |
| Smooth scroll (Lenis on the GSAP ticker, ScrollTrigger synced) | `MotionKit.scroll.init()` | none |
| Hide-on-scroll header | `MotionKit.header.init('.mk-header')` | `.mk-header > .mk-header-inner` |
| Canvas cursor with speed trail, hover square and press state | `MotionKit.cursor.init()` | none; add `data-cursor="hidden"` to areas that should show the OS cursor only |
| Crosshair ruler with live coordinates and drag-select | `MotionKit.ruler.init({ wrapper: '#stage', select: true })` | `.mk-ruler` block inside the stage (see demo), `.mk-select-item` for selectable things |
| Word color sweep | `MotionKit.text.words(el)` or `data-reveal="words"` | wrap emphasised words in `.mk-highlight` |
| Heading rise with line masks | `MotionKit.text.heading(el)` or `data-reveal="heading"` | any heading |
| Scroll-scrubbed text color | `MotionKit.text.scrub(el)` | any paragraph |
| Fade and image reveals, grouped per section | `MotionKit.reveal.init()` | `data-reveal="fade-up|fade-down|fade-left|fade-right|fade|image"`, group with `data-reveal-group` |
| Sticky scroll sequence with caption cards | `MotionKit.sequence.init()` | `.mk-sequence[data-sequence] > .mk-sequence-stick > .mk-sequence-frame[data-frame]` plus `.mk-sequence-caption[data-frame-caption="0"]` |
| Pixel-dissolve button fill | `MotionKit.btnFill.init()` | `.mk-btn` with `.mk-btn-label` (two copies of the text) |
| Marquee | `MotionKit.marquee.init()` | `.mk-marquee[data-marquee][data-speed="40"] > .mk-marquee-track` |
| Loader with progress line and coordinates | `MotionKit.loader.play()` | `.mk-loader` block (see demo) |
| Ink reveal on images | `MotionKit.ink.init()` | `.mk-ink > img + img[data-ink-over]` |
| Pulsing accent square | automatic | `data-anim="fade-loop"` |
| Card hover corners and dot, underline links | CSS only | `.mk-card`, `.mk-card-corner`, `.mk-card-dot`, `.mk-underline` |

`MotionKit.init({...})` runs all of it in the right order after fonts load
and after the loader finishes. Pass `false` for any module you do not want.

## Install

```html
<link rel="stylesheet" href="motion.css">
...
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.5/dist/lenis.min.js"></script>
<script src="motion.js"></script>
<script>
  MotionKit.init({
    header: '.mk-header',
    loader: true,
    onReady: function () {
      MotionKit.ruler.init({ wrapper: '#hero-stage', select: true });
      document.querySelectorAll('[data-scrub-text]').forEach(function (el) { MotionKit.text.scrub(el); });
    }
  });
</script>
```

GSAP 3.13 made SplitText free, which is why the kit pins 3.13.0 rather
than the 3.12.5 the reference site uses.

### On Webflow

1. Paste the `<link>` into Project settings, Custom code, Head.
2. Paste the four `<script>` tags and the init call into Footer code. Host
   `motion.css` and `motion.js` on any static host (Netlify, GitHub Pages,
   Cloudflare Pages) or inline them.
3. Add the class names and `data-reveal` attributes in the Designer. The
   reference site does exactly this: Webflow for layout, one external
   script for motion.

### Reduced motion and touch

The cursor and the ruler only start on devices with a fine pointer and
hover. Everything respects `prefers-reduced-motion: reduce`: the cursor is
skipped, the marquee stops, button fills jump to their end state, the
loader shortens.

## Tokens to change first

```css
:root {
  --mk-paper: #f6f5f0;   /* page */
  --mk-ink: #282828;     /* text */
  --mk-accent: #0f5c4c;  /* cursor, lines, fills, highlights */
  --mk-accent-rgb: 15, 92, 76;
  --mk-font: "Inter", system-ui, sans-serif;
  --mk-mono: "JetBrains Mono", monospace;
}
```

The demo accent is a placeholder green chosen to be different from the
reference site's orange. Swap it for your brand color and keep the RGB
triplet in sync (the drag-select gradient uses it).

## Not included

- Barba page transitions. They need a multi-page setup; the teardown
  describes the mechanic.
- Swiper carousels. Use Swiper directly with the params listed in the
  teardown.
- The reference site's fonts, images, SVG artwork and copy. Nothing from
  the site is copied; the demo uses its own line drawings.
