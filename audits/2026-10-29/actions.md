# Actions taken on the 2026-10-29 SEO audit

All drafts and code in this repo. Nothing touches the live site until Caleb applies the snippet or sends the LP cases. Mapping each audit recommendation to where it landed:

1. Two 404s (/profile, /contact-us)
   - Client-side: `lp-integration/lp-fixes.js` redirects visitors on those paths and rewrites every link that points at them.
   - Server-side: LP case 1 in `lp-integration/SUPPORT-CASES-SEO.md` asks for real 301s.
   - Rebuild site: `website-rebuild/site/scripts/dist.py` now writes both into `_redirects` plus GitHub Pages stub pages.
2. Page weight: not fixable by injection. `SUPPORT-CASES-SEO.md` case 3 names the two owners: our custom sections (2.24 MB base64 images, 1.57 MB inline script, move both to repo-hosted files) and LP for anything left.
3. IDX schema, area title ", 1" bug, price-as-H1: LP case 2. The IDX takes no custom code, so there is no client-side path.
4. Property page titles: `lp-fixes.js` rewrites document.title from the page's own JSON-LD address (slug fallback). Google indexes rendered titles; LP template fix would still be cleaner and can ride case 2.
5. Multiple H1s: `lp-fixes.js` demotes the boilerplate duplicates (logo, "Find your place.") to h2, keeping the one topical H1.
6. Prairieville hub: copy drafted in `website-rebuild/PRAIRIEVILLE-DRAFT.md`, stats deliberately left for publish time so every number carries a source and date. Needs ai-compliance-check before publish.
7. Review/AggregateRating schema: intentionally NOT built. It only goes on once real on-page reviews meet Google's guidelines; faking or front-running it risks a manual action. Revisit when the review section ships.
8. Verification of unknowns (PageSpeed, Search Console, geolocated SERP, map pack): needs Caleb's accounts or a Baton Rouge vantage point, listed in the audit's Unknowns.

Raw {{slug}} hrefs: `lp-fixes.js` strips href from any anchor whose href still contains `{{` after render, which is harmless if they live only inside template blocks and a fix if any reach the DOM.

Verification of lp-fixes.js: run in headless Chromium against the live pages fetched 2026-10-29 (same method as the Oct 13 motion-kit test; see verification note below). That is a simulation of the live markup, not the live site; re-verify per lp-integration/README.md step 4 once applied.
