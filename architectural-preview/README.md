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
