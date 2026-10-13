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

## Production numbers: where they come from, and one gap to close

The stat row on the page reads 81 closed deals, $25.1M in volume, 27 in the last twelve months, and 0 paid leads. Those four figures are copied from Caleb's own published pages on the `claude/funny-gates-cducrq` branch (`homebrief-next/about.html`, and `build.py` where they are set as `NUMBERS = {"deals": 81, "volume": "$25.1M", "last12": 27, "zachary": 15}`). They are his stated figures, not derived here.

They do not reconcile with `homebrief-next/data/deals.json`, which is the ROAM MLS closed-sale export as of 2026-10-07:

| Source | Deals | Volume |
| --- | --- | --- |
| Published pages | 81 | $25.1M |
| deals.json itemized | 72 (+4 off-market not shown = 76) | $20,315,870 |

The gap is 5 deals and about $4.8M. That is plausible if the MLS export misses off-market or dual-side closings, but it is unverified. Reconcile before these numbers go on a public page or into the ad, since they are public claims about production. Until then they stay in the preview only.

The 32-unit St. Francisville sale shown elsewhere on the page is a separate, Caleb-confirmed fact and is unaffected.

## Tools on the page

The two calculators are self-contained and run in the browser. Nothing is sent anywhere and no field asks for contact details. The math is reused verbatim from the verified `homebrief-next/js/calc-core.js`: the same `roundMoney`, the same `log1p`/`expm1` amortization, and the same rounded line-item totals. Both open with a worked example and label their output as the user's own assumptions, not a quote or an offer.

Golf course descriptions come from `homebrief-next/golf.html`. Membership and HOA details change; the page says so in print.
