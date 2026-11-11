# Baseline and access inventory

Research timestamp: 2026-10-06, 10:41 to 13:10 America/Chicago. Intervention date for GBP: 2026-10-06 00:05 CT (verification complete), 00:18 CT (live notice).

Machine-readable versions: `csv/access-matrix.csv` and `csv/baseline.csv`.

## Access matrix (summary)

| System | Status | Identity | Evidence |
|---|---|---|---|
| Luxury Presence backend | absent from this session | aire@calebjackson.org per onboarding mail | network policy denies host; no browser |
| calebjackson.org (public) | absent (egress blocked) | n/a | curl and WebFetch: `host_not_allowed` |
| Google Business Profile | connected read-only via Metricool; owner email confirmed | aire@calebjackson.org | Google emails 2026-10-06; Metricool brand settings |
| Search Console | unknown | unknown | no notification mail found |
| GA4 / GTM | unknown | unknown | LP Tracking IDs page unreachable; Metricool website connector empty |
| Bing Webmaster / Bing Places | unknown, likely absent | | no mail |
| Apple Business Connect | unknown, likely absent | | no mail |
| Google Ads / Meta Ads | unknown, likely absent | | no mail; Metricool googleAds connector not linked |
| Metricool | connected | aire@ owner | brand 7076779: Facebook page 107195095165191, Instagram `calebjacksonla`, GBP location 7744506514819131081, YouTube UCdy7yq7pWHz93dba4wlqs3w |
| Gmail / Drive / Calendar | connected | aire@ | used for account-state evidence only |
| Slack / Wispr Flow | connected, no relevant records | | zero results |
| Mac local files | absent | | `/Users/caleb` not present |

Public access is not admin access. Nothing in this session had admin access to any Google property or to Luxury Presence.

## Timeline established from account evidence (observed)

| Date (CT) | Event | Source |
|---|---|---|
| 2026-03-10 | 5 photos added to the Google listing (old name) | Metricool |
| 2026-07-10, 07-21 | Luxury Presence consultations | Calendar |
| 2026-07-24 | LP onboarding interview; brand package and bio drafted | Calendar, Drive |
| 2026-08-03 | LP website review call (launch/brand) | Calendar |
| 2026-08-04 | 3 photos added to listing; Caleb emails LP SEO: Presence shows "No Google Business Profiles Found"; old profile tied to an inaccessible Google account | Metricool, Gmail |
| 2026-07-08 to 07-30 | Last GBP impressions on old profile name (49 Search, 15 Maps, 2 website clicks) | Metricool |
| 2026-09-22 | One LP "Property Value Request" email; appears to be an internal test submission (inferred from submitter name) | Gmail |
| 2026-09-24 | Metricool brand created and connected | Metricool |
| 2026-09-29 | LP weekly digest: AI SEO and AI Blog activity | Gmail |
| 2026-10-06 00:05 | GBP verification complete (case 6-2250000041763) | Gmail |
| 2026-10-06 00:18 | "Profile is live" notice: name, address, 5.0 (1 review), hours and phone missing | Gmail |
| 2026-10-06 10:28 | Caleb asks LP SEO team to confirm the GBP connection in Presence | Gmail (sent) |

Website launch date: unknown. Bounded between 2026-08-03 (review call) and 2026-09-29 (AI SEO digest references live pages).

## Baseline table

Windows: latest 28 days = 2026-09-08 to 2026-10-05 (complete days, America/Chicago). Previous 28 = 2026-08-11 to 2026-09-07. 90-day = 2026-07-08 to 2026-10-05. Same period last year: no data source available.

| Source | Period | Metric | Value | Label | Limitation | Follow-up |
|---|---|---|---|---|---|---|
| Search Console | 28d / 90d / 16mo | impressions, clicks, CTR, position by query and page; branded vs nonbranded; device; geography; coverage; sitemaps; manual actions | UNKNOWN | unknown | no access | confirm property; grant owner; export |
| GA4 / LP analytics | 28d | sessions, engaged sessions, landing pages, conversions | UNKNOWN | unknown | no access; Metricool website rows null | read LP Tracking IDs page; confirm GA4 owner |
| GBP (Metricool) | 2026-09-08 to 10-05 | reach Search/Maps; website, call, direction clicks; messages; reviews; photo views; posts | 0 returned on every metric | observed | profile unverified during most of the window; treat as UNKNOWN not zero | re-pull after 2026-11-05 |
| GBP (Metricool) | 2026-08-11 to 09-07 | same | 0 returned | observed | same | same |
| GBP (Metricool) | 2026-07-08 to 07-30 | reach Search | 49 | observed | old profile name; tiny sample | reference only |
| GBP (Metricool) | same | reach Maps | 15 | observed | | |
| GBP (Metricool) | same | website clicks | 2 | observed | | |
| GBP (Metricool) | 90d | reach split | Search 76.6%, Maps 23.4% | observed | small base | |
| GBP (Google mail) | 2026-10-06 | rating, reviews | 5.0, 1 review | observed | public page not fetched | confirm live |
| GBP (Google mail) | 2026-10-06 | hours, phone | not set | observed | | drafts prepared |
| GBP (Metricool) | 12 months | photos / posts | 8 / 0 | observed | | |
| LP CRM | launch to date | qualified inquiries by source and intent | UNKNOWN; 1 valuation-request email that looks internal | observed + inferred | no CRM access | aggregate export |
| Organic (WebSearch tool) | 2026-10-06 | owned-domain appearances in 42 benchmarks | 0 of 42 | observed (tool) | not Google; no location | repeat on Google from the Mac |
| Organic (WebSearch tool) | 2026-10-06 | `site:calebjackson.org` | 0 results | observed (tool) | operator support unknown | URL Inspection |
| AI answers (one proxy surface) | 2026-10-06 | Caleb mention rate, 12 nonbranded prompts | 0/12 | observed | single surface | rerun on 5 platforms |
| AI answers (branded) | 2026-10-06 | correct current brokerage returned | 0/2 | observed | | fix citations |
| Instagram (Metricool) | 28d | followers / gained / lost / views | 2,445 / +68 / -18 / 49,142 | observed | social only | |

GBP metric definitions follow Google's Business Profile performance API as surfaced by Metricool: "reach" is business impressions on Search or Maps; clicks are button interactions, not connected calls or appointments. Paid activity contamination: none possible, no ads accounts found.

## What cannot be measured today, and the minimum setup (not installed)

1. Site traffic and conversions attributable to search: needs a GA4 property Caleb owns (or admin access to the one LP set), entered on the LP Tracking IDs page, with these events verified: valuation request, net sheet result, payment calculator result, flood check, quiz completion, call click, text click. Synthetic validation only; no real submissions.
2. Query-level search demand: needs Search Console ownership (domain property preferred).
3. GBP to website attribution: website field set to `https://calebjackson.org/?utm_source=google&utm_medium=organic&utm_campaign=gbp` (convention in `09-change-drafts.md`). Appointment and product links carry `utm_content` values.
4. Lead source and intent: LP CRM source field discipline (seller vs buyer vs relocation), exported monthly as aggregate counts only.
5. AI surface visibility: the rerun protocol in `06-ai-visibility.md`, run monthly from a browser that can reach the platforms.

No dashboard was built. Existing LP reports, Search Console, GA4 and Metricool are sufficient once access exists.

## Account-health flag (outside SEO scope)

Google Workspace Business Plus and "AI Expanded Access" for calebjackson.org reported failed payments on 2026-09-15 and 2026-10-01; a Google Cloud billing account is past due. If Workspace suspends, the mailbox that owns the Business Profile and the domain identity is affected. Decision and payment are Caleb's; nothing was touched.
