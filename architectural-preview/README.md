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
