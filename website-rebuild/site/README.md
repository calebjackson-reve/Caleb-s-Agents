# Stage 3 build: calebjackson.org rebuild

Static site. Edit pages in `src/`, shared head and scripts in `_head.html` and `_scripts.html`, then run:

```
python3 scripts/build.py
```

Built pages land in this folder. Media is referenced from `../media/`. Preview locally with `python3 -m http.server 8787` from `website-rebuild/` and open `http://localhost:8787/site/index.html`.

Verify with `NODE_PATH=/opt/node-tools/node_modules node scripts/verify.js` (Playwright) and Lighthouse. Results are in `verification.json` and `verification/`.

`_head.html` carries `noindex,nofollow` on purpose while this is a prototype. Remove it at launch (see `../LAUNCH-OPTIONS.md`).

## Compliance check, October 19, 2026 (skills/ai-compliance-check)

Compliance: PASS, with two lines flagged for Caleb's call.

- Identity: Caleb Jackson, Keller Williams First Choice, 17111 Commerce Centre Drive, license 995709547, (225) 747-0303, aire@calebjackson.org and Equal Housing Opportunity appear in the footer of every page. No Rêve branding.
- Guarantees: none on price, value or timing. "Your call gets returned today" is a service promise.
- Fair housing: neighborhood copy describes places, not people. Flag 1: "Faith first, family always" (Home lead, About) is Caleb's own values line from the brand package, not a description of who should live anywhere. Unknown whether the broker wants it on the site, ask the broker. Flag 2: "Listed Tuesday, under contract Friday isn't a slogan. Some weeks it's just a Tuesday" (About) reads as past experience, not a promise. Keep or cut at Caleb's call.
- Numbers: 81 deals and $25.1M carry "as of October 7, 2026". Templates mark every number "[needs source]" style with a source line.
- Texting: the contact form consent line includes STOP opt-out.
- AI disclosure: no AI images on the site today. The four still animations are camera motion added to Caleb's own photos and are labeled in `../media/MEDIA-LIBRARY.md`; add a credit line in the footer if any ships.

## Compliance check, October 20, 2026 (skills/ai-compliance-check)

Pages: Home (new cards and Meet Caleb), CMA, Commercial, Tools, Sell (pyramid and listing book), About.

Compliance: FIX, three lines fixed, four left for Caleb's call.

Fixed:
- Guarantees: Sell pyramid "Closed on your timeline, at the number we planned for" read as an outcome promise. Now "The goal the other four are built for: a closing that fits your timeline."
- Unverified service claim: Sell listing book "Every listing gets a book like this one" is now "This is how Basil Lane was shown."
- Numbers: Commercial "Many lenders look for a DSCR of at least 1.2 to 1.25" had no source. The number is gone, the advice to ask your lender stays.

Passed:
- Identity: footer on every page carries Caleb Jackson, Keller Williams First Choice, 17111 Commerce Centre Drive, Prairieville, LA 70769, license 995709547, Equal Housing Opportunity. Phone (225) 747-0303 and aire@calebjackson.org. No Rêve.
- Texting: CMA, Commercial and Sell forms each have a consent box with STOP opt-out.
- Valuations: CMA and Commercial value requests say an agent's opinion, not an appraisal. Nothing says an AI produced a value.
- Calculators start on example numbers and say so. Rates are entered by the visitor, not stated.
- Production line 81 deals, $25.1M carries "as of October 7, 2026".
- Tax list: every item links a source, ends with a CPA disclaimer.

Caleb's call:
1. Tax list: the $40,000 SALT cap and the 2026 return of the mortgage insurance deduction rest on IRS news and NAHB, not a final IRS publication. Have a CPA read the list before calebjackson.org goes live.
2. AI disclosure: the home hero video is an AI animation of the Basil Lane photo (media/MEDIA-LIBRARY.md). No label on the page yet. Suggested footer line: "Some video on this site is camera motion added to Caleb's own photos with AI."
3. Older Home copy, not changed today: "Top schools, steady growth" on a community card has no source and leans on schools as a selling point (fair housing caution), and "Sell fast, sell high" reads as an outcome promise.
4. Brokerage AI policy: unknown, ask the broker.
