# Home landing prototype, October 19, 2026

Caleb's direction for the calebjackson.org home page, in one static page with no build step, now on the brand tokens from `website-rebuild/DESIGN-SYSTEM.md` (ink and ivory surfaces that flip, ember once per view, Instrument Serif italic word over an uppercase line, Instrument Sans body standing in for Hauora). Structure: FIND's command bar, pinned hero over the Basil Lane drone loop and quick call to action, Zorge's sticky split panels, Sobha's curved gallery with a Curve switch.

## Caleb's answers to the five design system questions, October 19

1. Hero line: "The dream is the easy part."
2. Hero portrait: show both. The Portrait switch (bottom right) turns the balcony cut-out on and off. Background removal was done locally with rembg, no credits spent. Cut-out is `assets/caleb-hero-cutout.png`.
3. Target areas: the eight from the brand package stay.
4. Testimonials: not yet. The band is built empty and says so. Nothing invented.
5. Blush band: show both. The Blush switch flips the testimonial band between blush and ivory.

The Compare panel is for Caleb only and comes out before anything ships.

Open `index.html` from any static server (`python3 -m http.server`). GSAP and ScrollTrigger load from cdnjs. Native scrolling only, no Lenis, so it drops into Luxury Presence the same way `lp-integration/` does.

## What came from where

| Piece | Reference | Measured source | What the prototype does |
|---|---|---|---|
| Command bar | FIND | `aire/research/reference-teardowns/FIND-measured.md`, header grid 187.5 / 915 / 187.5 at 1290 wide | Wordmark left, centred uppercase links, one pill action right. Hides on scroll down, goes glassy after 40 px. |
| Hero | FIND | FIND hero section 4500 px tall at 1440, h1 105 px / 700 / letter-spacing -2.1 px | Pinned 320vh. Headline with a soft right edge, subline, two pills. The house rises and grows, the copy lifts and blurs, then the name is cut out of the photo the way FIND cuts its logo. |
| Statement with chevrons | FIND | "This isn't just about real estate" section in the FIND scroll recording | Same shape, Caleb's words. |
| Split panels | Zorge | `ZORGE-measured.md`, sticky--under-next sections, Gilroy 600 uppercase, p 12 px / 600 / ls 0.36 px | Three 100vh panels (Buy, Sell, Explore) that stick under the next one. Urbanist stands in for Gilroy. |
| Curved gallery | Sobha, "The three worlds" | Caleb's screenshot of October 19 and `SOBHA-measured.md` | Two panels rotated 34 degrees in perspective that flatten as you scroll. The Curve switch turns the effect off and remembers the choice in the browser. |
| Quick call to action | FIND outro | FIND recording | Paper band, one line, Text and Call pills, number and email as plain text. |

Motion easing and durations for the references were never measured as numbers (see each teardown's Unknowns). The values here are a first pass to tune by eye.

## Photos and identity

Photos are Caleb's Basil Lane listing images from the calebjackson.org repo, used as placeholders for the layout. Footer carries Keller Williams First Choice, Louisiana license 995709547, the Prairieville office and Equal Housing Opportunity. Nothing Rêve.

## Proof

Screenshots at 1440x900 and 390x844 at twelve scroll depths, the Curve switch on and off at both sizes, and a scroll recording at each size were taken on October 19, 2026 with Playwright. No console errors. Page scroll width equals the viewport at both sizes. Private artifact link is in `aire/STATUS.md`.

## Not done here

- Hooking Search, Buy, Sell and Explore to the real pages (compare, sell, explore in calebjackson.org).
- Phone menu button opens nothing yet.
- Fitting into the Luxury Presence section editor. See `lp-integration/README.md` for the route.
- Final font picks. The website session's documented choices win where they differ.
