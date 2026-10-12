# Verification log

Each row is an observed live check. Items wait here as "pending Caleb" until he applies them, then get re-fetched.

| Date (UTC) | Surface | Check | Observed | Status |
|---|---|---|---|---|
| 2026-10-12 | calebjackson.org, all 39 sitemap pages | old address 37325 Market Pl | absent everywhere | done (Luxury Presence case completed Oct 12 22:52 UTC) |
| 2026-10-12 | /about | License Number | #995709547 | pending Caleb (A1) |
| 2026-10-12 | /about | LinkedIn link | /in/caleb-jackson-22b627270/ (twice) | pending Caleb (A2) |
| 2026-10-12 | all pages | YouTube / TikTok / current LinkedIn links | none | pending Caleb (A3, B1) |
| 2026-10-12 | / and /about | RealEstateAgent JSON-LD | none; BlogPosting on 8 posts only | pending Caleb (E1) |
| 2026-10-12 | /testimonials | testimonials present | none | pending Caleb (D1) |
| 2026-10-12 | /video-gallery | playable embeds or YouTube link | not visible to text fetch | pending Caleb (D2) |
| 2026-10-12 | llms.txt | referral wording | present ("referral-driven service") | pending Caleb (D6) |
| 2026-10-12 | site, 7 user agents x 4 pages | HTTP status | all 200 | done, no block |
| 2026-10-12 | Google Business Profile via Metricool API | review count / rating | 0 / 0.0 | open, see google-review-investigation.md |
| 2026-10-12 | Gmail | Google verification completed, profile live with 1 review on Oct 6 | confirmed | done |
| 2026-10-12 | Metricool brand 7076779 | connected handles | GBP, Instagram calebjacksonla, TikTok calebjacksonla, YouTube UCdy7yq7pWHz93dba4wlqs3w, Facebook page 107195095165191, LinkedIn, Meta Ads | done (TikTok ownership established) |
| 2026-10-12 | The Advocate agent page 25835 | brokerage | live page: Keller Williams Realty-First Choice; search snippets: Reve REALTORS | open, request refresh |
| 2026-10-12 | Zillow, Homes.com, Realtor.com | automated fetch | 403 / blocked | needs browser check by Caleb |
| 2026-10-12 | Google Maps CID page | automated fetch | no body returned | needs browser check by Caleb |

## Codex execution — October 12, 2026, 23:18 UTC onward

The rows above retain the original audit observations. The following supersede the earlier pending states only for the named changes. Caleb directly authorized license/profile-link corrections and city checks; later authorized commits. See `visibility-execution.md` and `execution-evidence/` for full proof and limitations.

| Surface | Observed after execution | Status |
|---|---|---|
| /about visible license (A1) | 995709847 | Done, fresh public HTML + browser |
| /about LinkedIn (A2) | /in/calebjacksonla/, legacy absent | Done, fresh public anchors |
| /about YouTube | /@calebjacksonla | Done, fresh public anchors |
| LP global Footer + Side Menu | LinkedIn / YouTube added and saved | Saved; public contact renders links; homepage/About shared components still cached |
| Facebook caleb.jackson.142 Instagram link | calebjacksonla replaces calebjackson_24 | Done, refreshed public profile |
| Existing GBP social profiles | LinkedIn / YouTube submitted | Google pending review; public acceptance unverified |
| Google St. Francisville / Baton Rouge general realtor queries | No owned domain in 15 organic rows or three-entry local packs per city | Baseline only |
| Gemini neutral seller-agent prompts, one per city | Caleb absent in both answers | Baseline only |

Branded Google browser results disagree with the provider snapshot: actual browser showed website first for the St. Francisville name query. Signed-in/device locality limits are preserved. No universal absent-branded-search claim. Original `all 200 / no block` only establishes successful tested fetches; it does not prove every AI crawler can access/index/cite the site. Missing-review cause remains unknown; a performance gap alone is not proof of suspension or review loss. Other proposal rows remain unexecuted.
