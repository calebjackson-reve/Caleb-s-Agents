# Source register, coverage checklist and consolidated approval packet

Files: `csv/source-register.csv` (23 sources), `csv/coverage-table.csv` (30 items).

## Evidence labels used
- **observed**: seen directly in an account view, connector export or tool result in this session.
- **source-reported**: stated in a search result snippet or a third-party summary; the page itself was not read.
- **inferred**: my conclusion from observed facts.
- **unknown**: could not be determined here.

## Coverage summary
Completed: access matrix, baseline with explicit unknowns, GBP intervention date, competitor inventory (32) and battlecards (10, snippet-level), keyword library (65), benchmarked queries (42, tool index), 90-day backlog, 10 briefs, AI prompt library (28), AI first pass on one surface (18 runs), offers table, paused campaign package, strategy and roadmap, change drafts, source register, verification script.

Not completed, with reason:
- Site crawl, template inspection, IDX sample, Core Web Vitals, structured data, robots and sitemap, crawler access: calebjackson.org blocked by the environment's network policy.
- LP backend entitlement, settings, Tracking IDs, global scripts: no authenticated browser; host blocked.
- Maps grid and local pack observation; AI tests on ChatGPT, Google AI Overviews/AI Mode, Gemini, Perplexity, Copilot: hosts blocked.
- Competitor page reviews; Ads Transparency; Meta Ad Library: hosts blocked.
- Mac authority files, project record, tools-first plan, tracking plan, creative guide: not present in this container.
- Official documentation pages: not readable; snippets only.

This is a documented partial result, not a full-coverage claim.

## Independent verification performed
- Structural: `verify.sh` checks that every deliverable exists, is non-empty, is linked from the README, and that CSV row counts meet the stated thresholds. This proves packaging only.
- Evidence cross-check: the GBP verification date appears in two independent Google emails (support case and live notice); the GBP location ID in the Google email matches the Metricool connector; the old profile CID in Caleb's August email matches the new profile's map data ID. The AI SEO activity is confirmed by a vendor email, not by reading the site.
- Nothing in the packet asserts an SEO outcome.

## Consolidated approval packet (batched decisions)

| # | Decision or approval | Exact proposal | Cost | Risk | Needed by |
|---|---|---|---|---|---|
| D1 | GBP identity model | Option 1: rename to "Caleb Jackson, REALTOR", keep brokerage in description; confirm whether clients are met at 17111 Commerce Centre Dr; if not, hide address and set service areas. Option 2: keep current name and address. | $0 | re-verification; temporary visibility dip | day 7 |
| D2 | LP automation posture | Ask LP to set AI SEO Specialist to review-before-apply or pause for 60 days; set AI Blog Specialist to draft-only; fact-check the two False River and St. Francisville posts. | $0 | less automated output | day 7 |
| D3 | Second-pass access | Either add calebjackson.org, *.luxurypresence.com, google.com, support.google.com, developers.google.com, lrec.gov and competitor domains to this environment's allowed domains, or run the second pass on the Mac. | $0 | none | day 7 |
| A1 | Apply GBP fields (phone, hours, website+UTM, description, services, service areas, products, Q&A) | per `drafts/gbp-field-drafts.md` after [CONFIRM] items | $0 | low | day 7 |
| A2 | Send citation corrections | per `drafts/citation-corrections.md` | $0 | none | day 14 |
| A3 | Send LP support request | per `drafts/lp-support-request-draft.md` | $0 | none | day 7 |
| A4 | Create GA4 property Caleb owns (or obtain admin on LP's) and add Measurement ID on LP Tracking IDs page; add Search Console domain property | minimal design in 02 | $0 | duplicate tags if LP already set one; check first | day 14 |
| A5 | Publish About page and metadata drafts | `drafts/about-page-draft.md`, `drafts/metadata-drafts.md` | $0 | overwrite by AI SEO if D2 not set | day 30 |
| A6 | Approve briefs 01-03 for writing | `briefs/01..03` | writing time | none | day 14 |
| A7 | Schedule GBP posts for review in Metricool | `drafts/gbp-posting-plan-month-1.md` | $0 | none | day 14 |
| A8 | Google Workspace and Cloud billing | resolve failed payments (outside SEO scope) | per Google invoice | account suspension if ignored | now |
| N1 | No action: Google Ads promotion, Meta ads, First Answer trial | none | would create spend or trial risk | | |

## What was not done (by rule)
No live site change, no GBP publish, no post, no review reply, no support ticket sent, no ad, no trial, no billing change, no DNS or account setting change, no Zap started, no real lead submission, no recurring job. Private raw exports are aggregate only and sit in `raw/` with no client data.
