# MLS intake and walkthrough

Caleb selected MLS as the primary data source on October 12, 2026. The tool currently produces a price-per-square-foot screening shortlist, not a finished valuation or appraisal. More complete MLS inputs do not remove condition, lot, flood, concessions or comparability limits.

## First usable route

1. Use authorized CSV exports for active listings and closed sales in the same area and property class. Preserve originals in a local gitignored work folder. If separate files are supplied, map both independently and combine normalized rows without replacing actual sold prices with list prices.
2. Record source MLS, export/as-of date, area, property class and sold-date range. Unknown source dates mean historical/unverified output, not current deal claims.
3. Verify headers for address, status, living area, subdivision/ZIP, list price, actual closed price and closed date. Ask about ambiguous fields instead of guessing. Require positive actual close prices on closed rows. Keep asking and closed prices separate. Deduplicate by MLS number when available; otherwise flag suspected duplicate address/status/close-date rows for review before scoring.
4. Check class consistency before comparing: do not combine land, condos, manufactured homes and detached houses. This draft tool does not infer class or deduplicate exports itself; route preprocessing must supply an appropriate comparison set.
5. Run the regression gate then the CSV tool. Deliver exclusion counts, comp counts/basis and screening results together. Current status needs a current MLS source; old exports remain historical.

## What to show in your video

Record one complete example from MLS search to the downloaded files:

- The exact report names and export buttons you use.
- Area/subdivision/ZIP, property type, active status and closed-date filters.
- The columns selected, especially actual closed price versus list price, living area and closed date.
- Any separate CMA, property detail, concessions, condition, flood/lot or adjustment reports you rely on for valuation, and how you select comparable homes.
- The final downloaded file types and the result you expect to review.

Keep passwords, authentication codes and private client details out of the recording. After the walkthrough is supplied, document its exact steps and validate them against one authorized export before automating browser actions. No live MLS navigation, credential changes, recurring exports or external sharing are enabled by this document.
