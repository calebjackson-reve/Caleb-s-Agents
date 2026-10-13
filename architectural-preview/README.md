# Caleb Jackson architectural motion preview

This is the current editable build from Codex, October 12, 2026. Start here rather than older previews or the neutral motion-kit demo.

## Review direction

Caleb selected heronaiapp.com as the architectural appearance, animation and scroll reference. The first photo/grid version was rejected. The current build keeps Caleb Jackson Real Estate prominent and uses original architectural art and conceptual vector scenes. Caleb said it was getting better and requested deeper motion. Final visual approval remains pending.

## Run and edit

Serve this directory with a local static web server. Open index.html. No build step or package installation is required. The supplied GSAP and ScrollTrigger files are vendored browser distributions with license headers. assets/motion.js is adapted from PR17's motion kit. index.html contains the site layout, brand styles and integration.

## Current features

Three crossfading process scenes, buyer/seller mode and step navigation, original architectural illustration, ruler and drag-selected annotations, pixel-mask button fills, section navigation, conceptual32unit sale graphic, Basil Lane listing link, city guides, data-center article and FAQs. Native document scrolling remains the single owner; Lenis, SplitText, custom cursor and loader are not enabled.

## Identity and factual constraints

Caleb Jackson / Keller Williams First Choice. License995709547. aire@calebjackson.org. (225)747-0303. Office17111CommerceCentreDrive,PrairievilleLA70769. Lead locations St.Francisville and BatonRouge. Caleb confirmed the32unit sale; no additional sale details have been supplied. BasilLane is featured as a current listing, not a sold property. Diagrams are conceptual, not actual floor plans or market statistics. Preserve live city/article URLs and LP native IDX, account, saved-search and lead functions in any eventual integration.

## Audit checks

Check desktop and phone layout, scene transitions forward/back, mode/step consistency, markers with mouse drag and keyboard/touch activation, close/reopen and focus return, button hover enter/exit, FAQ controls, reduced-motion preference toggling, JavaScript-disabled readability, image loading, console errors and performance. Existing native checks passed no overflow at390/937px,3scene states, drag/reopen and button mask/reset. Reduced-motion/static fallback paths were source-checked; browser emulation/full uninterrupted performance audit remains open.

## Authority

This branch is for Claude to edit and audit. Do not merge, change DNS, replace calebjackson.org, send support messages, accept costs or publish the redesigned homepage without Caleb's explicit approval. Luxury Presence implementation compatibility is pending. Keep Caleb's selected direction and current identity; do not treat pasted agent proposals as his approval.

## Follow-up to Claude’s audit

The audit reported a reduced-motion blank scene, heavy PNG and phone rail overlap. This revision corrects the selected-frame CSS specificity, serves a1440px WebP(202626bytes versus2587632bytes PNG), lazily loads the repeated detail image, and reserves a52px navigation strip below the phone header. The original PNG is retained as source but no longer referenced by the page.

Independent syntax, selector and HTTP asset checks passed. Browser automation timed out during this revision; reduced-motion rendered visibility and phone overlap must be retested before calling these visually verified. A forced reduced-motion fixture was prepared locally but its runtime checks did not complete. Prior native checks apply to the prior revision only. Typography, extra heading/word reveals, Lenis, cursor and loader remain proposals; the pasted audit was not approval to add them.

## Scroll performance correction

The progress bar now uses a direct scaleX transform on its own element, with a fixed100%layoutwidth. The render loop reads progress before writing scene styles and no longer writes --read-progress on html. The scene timeline uses scrub:0.6. The unused architecturalPNG is removed from this review branch; the original remains in local source/history.

Claude’s supplied e7f1969 retest reports reduced motion, WebP requests and phone rail passed, and a root-variable A/B scroll trace attributed371→55msstyle recalculation and671→306msmain-thread time to removing the old rootwrite. Those measurements are source-reported for the prior A/B trace. They are not measurements of this new commit. Re-run the same scroll trace before claiming measured improvement. The proposed pre-rendered inverted drawing has not been applied.

## Production numbers: reconciled October 13, 2026

The stat row reads 81 closed sides since 2022, $25.1M in closed volume, 27 sides closed in 2026, and 0 paid leads. Caleb identified the cause of the earlier gap: dual-agency closings. That checks out against `homebrief-next/data/deals.json` (ROAM MLS closed-sale export, as of 2026-10-07):

| Step | Count | Volume |
| --- | --- | --- |
| Itemized rows in the export | 72 | $20,315,870 |
| Plus the second side of 5 dual-agency closings | 77 | $24,125,270 |
| Plus 4 off-market closings not in the export | **81** | **$25.1M claimed** |

The count lands on 81 exactly. The volume requires those 4 off-market closings to average about $244,000, which sits below the $282,000 average of the itemized deals and is therefore plausible. The volume is consistent, not independently verified; the 4 off-market closings carry no prices in the file.

Two label corrections came out of the same check:

- "Closed deals" became **"Closed sides"**. Counting a dual-agency closing twice is standard MLS practice, but calling the result "deals" overstates the transaction count. There were 76 transactions. The page now says sides and prints the basis in small type under the row.
- "In the last twelve months" became **"Sides closed in 2026"**. The 27 figure is exactly the 2026 year-to-date side count (24 rows + 3 dual second sides). A true rolling twelve months would reach back into 2025 and be a different, larger number.

If a plainer claim is wanted instead, 76 closed transactions and $20.3M of itemized volume are both defensible without any explanation. The current wording keeps Caleb's published figures and makes the basis explicit.

The 32-unit St. Francisville sale shown elsewhere on the page is a separate, Caleb-confirmed fact and is unaffected.

## Tools on the page

The two calculators are self-contained and run in the browser. Nothing is sent anywhere and no field asks for contact details. The math is reused verbatim from the verified `homebrief-next/js/calc-core.js`: the same `roundMoney`, the same `log1p`/`expm1` amortization, and the same rounded line-item totals. Both open with a worked example and label their output as the user's own assumptions, not a quote or an offer.

Golf course descriptions come from `homebrief-next/golf.html`. Membership and HOA details change; the page says so in print.

## The water and course report (report.html)

A second page, and the first tool here that no listing portal offers. Type any Louisiana address and it reads FEMA's National Flood Hazard Layer at that exact point, explains the zone in plain words, and shows what Caleb has actually closed in that city alongside the golf and water near it.

**Why it is built this way.** It never republishes IDX listing records. Live listings stay on the Luxury Presence Home Search, which is where saved searches and leads belong; this page links out to it. Everything shown here is either public FEMA data, Caleb's own closed sales, or his own curated local knowledge. That keeps it clear of IDX display rules while still answering the question a portal cannot.

**Data sources.**

| Shown | Source | Live? |
| --- | --- | --- |
| Flood zone and subtype | FEMA NFHL layer 28, queried at the geocoded point | yes, per lookup |
| Address match | US Census geocoder, via JSONP because it sends no CORS header | yes, per lookup |
| Closings, median, range | Caleb's ROAM MLS export, as of 2026-10-07, cities with 3+ closings only | baked in, re-export to refresh |
| Golf and water nearby | Caleb's curated list from the golf page | baked in |

**Zone wording is reused verbatim** from the verified `homebrief-next/js/flood.js`, including the 2016 East Baton Rouge point that about half the homes that flooded sat outside the high-risk zone. Nothing was reworded.

**Known limits, all stated on the page.**

- It is screening, never a flood determination. A surveyor's elevation certificate is what a lender and insurer price from.
- A point lookup can differ from the zone across a whole parcel. When the point returns more than one zone the page says the parcel may straddle a boundary.
- The Census geocoder misses some rural addresses. The page says to add city and ZIP and try again.
- FEMA's endpoint drops connections intermittently, so each lookup retries once before reporting failure.
- Only 9 cities have 3 or more closings. Any other address shows no figures rather than a thin median. Neighborhood level is too thin everywhere and is deliberately not offered.
- St Francisville's range is skewed by a single $3,000,000 closing.

**To refresh the closing figures,** re-run the city aggregation over a newer ROAM export and replace the `CITY` object in the page script. The `as of` date in the note under the figures must be changed in the same edit.

**Not wired up.** Per-course flood zones are not pre-baked. That needs verified street addresses or coordinates for each course; guessing them would put wrong flood zones on a Louisiana real estate site, which is worse than omitting them.

## The four lanes (report.html)

Caleb's four categories: flood zone, waterfront, golf, and rural at 5 acres or more. Each lane opens his own Luxury Presence Home Search with the filter already applied, so no listing data is republished here and the live results, saved searches and leads all stay in his system.

**The IDX parameters were found by probing the live search**, not guessed. Each was verified by comparing the result count against the unfiltered baseline of 2,743 on October 13, 2026:

| Parameter | Effect | Verified |
| --- | --- | --- |
| `waterfront=true` | 402 results | yes |
| `min_lot_size=<sq ft>` | 43,560 → 504, 217,800 → 161, 435,600 → 94 | yes |
| `keyword=<text>` | golf → 71, Copper Mill → 67 | yes |
| `min_price=<n>` | 400000 → 632 | yes |
| Filters combine | waterfront + 5 acres → 49 | yes |

`lotSizeMin` is an accepted alias for `min_lot_size`. **Lot size is in square feet, not acres**, so 5 acres is 217,800. Passing `5` silently returns almost everything.

**Parameters that are ignored** and must not be used: `city`, `cities`, `location`, `q`, `search`, `zip`, `zip_code`, `postal_code`, `subdivision`, `keywords` (plural), `minLotSize` (camelCase), `minAcres`, `acreage`, `propertyType`. Each returned the full 2,743 baseline.

**Keyword matching is loose on common words.** `keyword=The Bluffs` returned 2,400, effectively no filter, because it matches on "the". Dropping the article gives `keyword=Bluffs` → 40. Every course keyword shipped on the page was individually checked and returns a sensible count. Test any new keyword against the baseline before adding it; reject anything above about half of it.

**The counts printed next to each link are a snapshot** taken October 13, 2026, labelled as such on the page. The links themselves always open live results. Re-check them when the market moves, or drop the numbers if keeping them current is a nuisance.

## The cursor

Rebuilt from the Heron teardown and now switched on. It was always in the motion kit; it just was not enabled here, which is why it never showed up.

Three layers, matching the reference:

1. **A full-screen canvas trail.** The last 34 positions, position eased 0.18 per frame, stroked at 1.4px. Alpha scales with pointer speed, so the trail only appears when you move fast and fades when you stop.
2. **A square dot** drawn at the pointer, 9px, only while hovering something clickable or while pressed.
3. **A crosshair that grows.** Scales from 6/14 to 1 over anything interactive. That growth is the "pop".

**One deviation from Heron, and why.** Heron blends its cursor with `mix-blend-mode: difference`. On this palette that failed: a coral crosshair sat on the coral buttons and disappeared entirely. The crosshair is ink with a thin paper outline, and a `mousemove` listener adds `.on-dark` over coral and ink surfaces to flip it to paper. Verified visible on the coral buttons, the paper links, the course cards and the form inputs.

**Where it steps aside.** The hero carries `data-cursor="hidden"` so its own ruler and coordinate readout own that zone, exactly as Heron does on its hero. The text caret is preserved over inputs and textareas, which Heron does not need because it has no forms.

**It never starts** on touch devices, on coarse pointers, or under `prefers-reduced-motion`. The kit checks `(hover: hover) and (pointer: fine)` before creating anything, so there is no canvas and no listener on a phone. Verified on iPhone 13 and with reduced motion forced.

## The fling on the golf section

The second Heron pointer mechanic, decoded from the `Ex` class in its bundle and documented in `motion-kit/TEARDOWN.md`. Move the pointer across the Living section and course cards are thrown out behind you.

**Why it is not a follower.** A card only spawns once the pointer has travelled 50px since the last one, so it reads as throwing things out, not trailing. Throw distance comes from pointer speed, `40 * (speed - 50) * 1.1`, capped at 330px. Travel is 0.5s `expo.out` from scale 0.8 to 1, then a 0.5s fade starting at 0.7s while the card sinks toward the bottom of the section. Twelve live at once; the oldest fades in 0.2s when a thirteenth arrives. Stand still inside the section and one drops every 650ms so it never goes dead.

**The scroll part.** Heron adds Lenis's scroll velocity into the vertical component of the throw, so scrolling through the band slings the cards harder downward. This page has no smooth scroller, so the kit falls back to the native scroll delta per frame and keeps the same behaviour. Measured: nine of nine throws during a scroll-and-move carried a non-zero scroll term, peaking at the full wheel step.

**What gets thrown.** Six drawn cards, one per course, each with the course number, parish and name. They are drawn, not photographed, because there is no licensed photography of these courses here and nothing on this site is invented. Swap `.fling-tile.mk-fling-src` for real images when the photography exists and the mechanic is unchanged.

**Where it is bounded.** The Living section clips its own clones, so nothing spills into the sections above or below. Clones are `pointer-events: none`, so the course cards stay clickable. Verified.

**It never starts** on touch, on coarse pointers, or under `prefers-reduced-motion`. In those cases zero instances are created, the six sources stay `display: none`, and the "move across the courses" hint is hidden so nothing promises an effect that will not run.
