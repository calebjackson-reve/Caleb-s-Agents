# Luxury Presence, website and Google Business Profile audit

Scope note: the site, the LP backend and Google's pages were not reachable from this session. This document records what the account evidence proves, what remains unknown, and the exact checks to run on the Mac. URL-level table: `csv/url-remediation.csv`.

## 1. Luxury Presence entitlements and configured services

| Item | State | Evidence | Label |
|---|---|---|---|
| Website on Luxury Presence, domain calebjackson.org | live (date unknown) | onboarding mail; AI SEO digest references live pages | observed |
| AI SEO Specialist (weekly title/description/H1 edits) | active, producing output | digest 2026-09-29: "Keyword optimizations for your Neighborhood Details Page ... 'Bocage, LA'"; blog post optimized for a Garden District query | observed |
| AI Blog Specialist (drafts and publishes posts) | active, publishing | digest: False River post "was published"; St. Francisville post drafted for "a few days" later | observed |
| Review-before-publish for AI output | LP training pages say you can review what it prepares; whether Caleb's account is set to auto-publish is unknown | training.luxurypresence.com snippet | source-reported |
| CRM "smart actions" and weekly action summaries | active | mails 2026-07-27, 09-21, 09-28, 10-05 | observed |
| Native Property Value Request form | working | lead email 2026-09-22 | observed |
| GBP connection inside Presence | was failing on 2026-08-04 ("No Google Business Profiles Found"); reconnection requested 2026-10-06 | sent mail | observed |
| Plan tier, human SEO analyst, advertising products, reports | UNKNOWN | no invoice or plan mail found | unknown |
| Tracking IDs page (GA, GTM, Follow Up Boss, Facebook, AdWerx) | capability exists per training article; configured values unknown | source-reported | unknown |
| Global scripts / custom head JSON-LD | UNKNOWN | not documented in reachable sources | unknown |
| Zapier | trigger-only/outbound per the August contact plan; current Zap states unknown | Drive README 2026-08-28 | observed (dated) |

Risk: future AI metadata rewrites will overwrite manual titles and descriptions unless the specialist is paused or scoped. This is Decision D2.

## 2. Website technical audit: status by check

Every row below is UNKNOWN from this session. The column "how to verify" is the exact step for the Mac pass.

| Check | Status | How to verify |
|---|---|---|
| http to https and www/non-www consistency | UNKNOWN | `curl -I` on four variants; expect one 301 chain to the canonical host |
| robots.txt, X-Robots-Tag, meta robots | UNKNOWN | fetch `/robots.txt`; view-source on home, a neighborhood page, an IDX listing, a blog post |
| XML sitemap presence and contents | UNKNOWN | fetch `/sitemap.xml`; count URLs by type |
| Indexed vs indexable | UNKNOWN | Search Console Pages report; URL Inspection on 12 key URLs |
| Rendered vs initial HTML (tools and guides) | UNKNOWN | compare view-source to rendered DOM for tool pages; confirm explanatory text is in HTML |
| Titles, descriptions, H1/H2 uniqueness | UNKNOWN; being rewritten weekly by AI SEO | crawl with Screaming Frog on the Mac; export |
| `/buy` and `/sell` status (prior report said 404) | UNKNOWN; treated as a lead | `curl -I` |
| Homepage links to the four tools | UNKNOWN; September plan keeps Home Search and Home Valuation in hero | render homepage; list hero and nav links |
| IDX parameter URLs, duplication, registration walls, sold listings | UNKNOWN | sample 30 IDX URLs across active, sold, search-param types |
| Core Web Vitals field data | UNKNOWN (CrUX not reachable) | PageSpeed Insights on home, a neighborhood page, a listing page |
| Structured data | UNKNOWN | Rich Results Test; Schema validator; check for self-serving review markup |
| Tool pages: inputs, data sources, result visibility, delivery | UNKNOWN except valuation form works | walk each tool with synthetic inputs after approval |

Interpretation guardrail: the zero owned results in the WebSearch index are a signal to check indexing first, not proof of a crawl block. A blocked request from this container is not evidence about Googlebot.

## 3. Google Business Profile audit

Observed fields (Google notification, 2026-10-06 00:18 CT):

| Field | Value | Note |
|---|---|---|
| Name | Keller Williams First Choice -Caleb Jackson | hyphen with no space before "Caleb" |
| Category | Real estate agent | primary; secondary categories unknown |
| Address | 17111 Commerce Centre Drive, Prairieville, LA 70769 | shown publicly; appears to be the brokerage office |
| Rating / reviews | 5.0 / 1 | |
| Hours | not set | Google prompts to add |
| Phone | not set | Google prompts to add |
| Website | button present; destination unknown | must be `https://calebjackson.org/` with UTM |
| Photos | 8 (5 from 2026-03-10, 3 from 2026-08-04) | |
| Posts | 0 in 12 months | |
| Identifiers | location 7744506514819131081; account 114406085409279647383; CID 17113183507740077585; KG /g/11kjpfrt_b | from Google and Metricool |
| Former name | Caleb Jackson Real Estate \| AI Advisory Group | same CID; old map link centered on Baton Rouge (30.5259, -91.1897) rather than Prairieville |

Findings and questions:

1. **Naming versus Google's practitioner guidance (source-reported, verify on the official page before acting).** Google treats real estate agents as individual practitioners. Where several practitioners work from one branded office, the practitioner profile should carry the practitioner's name only; the brokerage keeps its own profile. Where the agent is the only public-facing practitioner at the address, a combined "Brokerage: Agent" title is acceptable. The Prairieville office has many agents (teams at the same brokerage surfaced in search). The current name therefore likely conflicts with the guideline. Counterweight: LREC advertising rules require the sponsoring broker's name and phone to be conspicuous in advertising. Those can live in the description and the website, not the business name. A name change right after verification may trigger re-verification. Decision D1.
2. **Pin location versus priority markets.** Prairieville is in Ascension Parish, roughly 35 to 50 road miles from Zachary, St. Francisville and New Roads. Local pack ranking weighs distance. Service areas can be listed (up to 20) but they do not move the pin. If Caleb does not meet clients at the Prairieville office, Google's rules require hiding the address and operating as a service-area business, with the verification address kept private. This is part of Decision D1 and needs Caleb's answer to one question: do you meet clients at 17111 Commerce Centre Drive?
3. **Duplicates and former-brokerage remnants.** The old name is gone from this listing. Whether a separate Rêve-era listing exists is unknown (Maps search blocked). Check "Caleb Jackson Rêve" and "Caleb Jackson Realtor Baton Rouge" in Maps on the Mac.
4. **Completeness.** Phone, hours, description, services, service areas, appointment link and products are empty or unknown. Drafts in `09-change-drafts.md`.
5. **Reviews.** One review. Competitors in Zachary show 6 to 57 reviews on Ramsey profiles (source-reported). A compliant request process is drafted; no incentives, no gating, no scripts for reviewers.
6. **Performance history.** Old-name listing had tiny impression counts in July; nothing since. The post-verification window starts today.

Confirmed ranking considerations (Google's own framing): relevance, distance, prominence. Customer-service tactics that are not confirmed ranking factors: posting frequency, photo counts, review reply speed. Untested hypotheses: name change effect, secondary categories.

## 4. Identity map across the web

| Property | Observed value | Source | Status |
|---|---|---|---|
| Website | calebjackson.org | assignment; Drive | not fetched |
| GBP name | Keller Williams First Choice -Caleb Jackson | Google mail | observed |
| Portal: homes.theadvocate.com agent 25835 | "Reve REALTORS", (225) 747-0303; listings also appear under "Keller Williams Realty-First Choice" | search snippet | **mismatch: stale brokerage** |
| Bio draft (Drive, July) | REALTOR, Keller Williams First Choice, (225) 747-0303, @calebjackson_24 | Drive | handle conflicts with Metricool |
| Instagram (Metricool) | `calebjacksonla` | Metricool | **handle mismatch with bio draft** |
| Facebook page | id 107195095165191, name unknown | Metricool | verify name and brokerage |
| YouTube | UCdy7yq7pWHz93dba4wlqs3w | Metricool | verify name |
| Zillow / Realtor.com / Homes.com agent profiles | not surfaced in 3 searches | WebSearch | unknown; check directly |
| LREC license record | not fetched | | verify name and broker of record on lrec.gov |
| Entity confusion | "The Action Jackson Group" (Birdeye, 21 reviews, unrelated) | WebSearch | risk for "Action Jackson" branding in AI answers |

Canonical business facts to confirm with Caleb: legal name as licensed; sponsoring broker's name and office phone (LREC); business phone for GBP (is 225-747-0303 Caleb's cell and is it the public number); public email; which Instagram handle is current; whether the Prairieville office is a client-meeting location.

## 5. What is self-service, template-dependent, or support-only (best current understanding)

- Self-service (source-reported from LP training): page SEO title and meta description via Page Settings; blog metadata; Tracking IDs (GA, GTM, Facebook); navigation; page content.
- Likely template-dependent or support: robots.txt, canonical logic, IDX URL handling, sitemap generation, custom JSON-LD in head, redirects (existence of a redirects panel unverified).
- Unknown: whether AI SEO Specialist can be scoped to certain pages or paused by the user.

A support request draft covering these questions is in `drafts/lp-support-request-draft.md`. It has not been sent.
