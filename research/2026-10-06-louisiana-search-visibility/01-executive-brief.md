# Executive brief: Caleb Jackson Louisiana search visibility

Research timestamp: Tuesday, October 6, 2026, 10:41 AM to 1:10 PM America/Chicago.
Prepared in a Claude Code cloud session. Owner: Caleb Jackson. Status: research phase, first pass, partial coverage (see `10-source-register-coverage-approvals.md`).

## What is true now (confirmed)

- **Google Business Profile is verified and live as of October 6, 2026 at 12:05 AM Central.** Name on Google: "Keller Williams First Choice -Caleb Jackson". Category: Real estate agent. Address shown: 17111 Commerce Centre Drive, Prairieville, LA 70769. Rating 5.0 from 1 review. Hours and phone are not set. Zero posts in the last 12 months. Eight photos. This is the intervention date for every before/after comparison. (Observed: Google notification emails; Metricool connector.)
- **The same Google listing used to be named "Caleb Jackson Real Estate | AI Advisory Group."** Same CID. In July 2026 it drew about 49 Search impressions, 15 Maps impressions and 2 website clicks over 18 data days, then went dark from August until verification. (Observed: Metricool.)
- **Luxury Presence's AI SEO Specialist and AI Blog Specialist are active and changing the site weekly.** The September 29 digest shows keyword edits to the Neighborhood Details page for "Bocage, LA", a blog post optimized for "Garden District Baton Rouge historic district renovation rules", a published post titled "False River's Waterfront Median Is Lower Than New Roads Itself", and a drafted post titled "St. Francisville's Median Price Swings Wildly Because the Sample Size Is Six Houses". Any manual metadata work can be overwritten unless the posture is decided first. (Observed: Gmail.)
- **The owned site did not appear in any of 42 benchmark searches, including 5 branded ones, in the search index available to this session.** The branded result that does appear is the Baton Rouge Real Estate Guide (homes.theadvocate.com) agent page, which still lists Rêve REALTORS. A second branded probe surfaced an unrelated "Action Jackson Group" review page. (Observed in the WebSearch tool index. This is not Google and had no location set. Google index status is unknown until Search Console is checked.)
- **No evidence of Search Console, GA4, Google Ads, Bing or Apple listings under the business mailbox.** Absence of notification emails is a lead, not proof.
- **Google Workspace and Google Cloud billing for calebjackson.org have failed payment notices dated September 15 and October 1.** This is outside SEO scope, but the Google identity that owns the Business Profile and this mailbox depends on it. No action was taken.

## What could not be done here

This container's network policy denied every external host except package registries: calebjackson.org, app.luxurypresence.com, help.luxurypresence.com, google.com, support.google.com, developers.google.com, lrec.gov, the OpenAI docs, and all competitor domains. No page on the site, no official documentation page, and no competitor page was read. Everything from those sources is labeled source-reported (search snippet) or unknown. Fixing this takes one of two paths: run the second pass on the Mac with the authenticated browser, or add those hosts to this environment's allowed domains.

## Strongest opportunities (evidence-backed)

1. **Local seller intent in Zachary and north East Baton Rouge is unserved by any local agent page.** "Sell my house Zachary LA" and "listing agent Baton Rouge" returned only aggregators and portal agent cards. Caleb has observed listing history in Zachary, Greenwell Springs and Jackson on the portal. A seller page plus the net sheet tool is the first money page.
2. **Flood, true monthly cost and net proceeds questions are answered by insurers and national calculators, not by any Baton Rouge agent.** These match the four tools Caleb already built. Parish-specific explainers around those tools are the differentiated content.
3. **Google Business Profile is nearly empty and just became editable.** Phone, hours, description, services, service areas, website link with UTM, and a review process are zero-cost and high leverage. This is the fastest measurable win.
4. **Identity cleanup.** The third-party page Google and AI tools currently use for "Caleb Jackson realtor" says Rêve. Fixing that and publishing an About page with the current brokerage is cheap and directly affects branded and AI answers.

## Recommended first move (one strategy, not three)

Start with **"Own the north: Zachary and the Felicianas, seller-first, proof-led."** Three approaches were compared in `08-roadmap-and-backlog.md`: (A) north-market seller-first, (B) Baton Rouge metro buyer volume, (C) statewide informational authority. A fits the observed listing proof, the GBP intervention date, and the thin competition in those queries. B fights Zillow, Redfin and high-volume teams on their home turf. C is a later layer once A produces measurable visibility. Stop doing: letting the AI Blog Specialist publish unreviewed statistical claims; chasing "top realtors Baton Rouge" lists; any paid spend before 60 days of organic data.

Measurable targets cannot be set yet because the organic and GBP baselines are unknown. The first milestone is a measurement milestone: by day 14, Search Console and a Caleb-owned GA4 property are confirmed and one full 28-day GBP window after October 6 exists.

## Limits

- No live site inspection, no Maps grid, no Core Web Vitals, no structured data check, no competitor page reads, no real ChatGPT, Gemini, Perplexity, Copilot or Google AI Mode runs. The AI test log records 18 runs on one proxy surface and 5 inaccessible platforms.
- Competitor facts are from search snippets. They are leads to verify, not reviewed pages.
- No keyword demand numbers are given. No licensed tool was available and nothing was invented.

## Three unresolved decisions (yours)

1. **GBP identity model (decided in part on 2026-10-06).** Caleb does not meet clients at the Prairieville office and wants the profile anchored in Zachary / St. Francisville. Service areas do not move the pin; only a re-verified hidden base address does. Plan: hide the address and add service areas now, then move the anchor and rename to "Caleb Jackson, REALTOR" in one re-verification. Still needed: which city the base address is in. Details in `drafts/gbp-field-drafts.md` and `03-lp-site-gbp-audit.md`.
2. **Luxury Presence automation posture.** Keep AI SEO Specialist and AI Blog Specialist fully automatic, set them to review-before-publish, or pause them while manual metadata and content work runs. Until decided, every metadata draft in `09-change-drafts.md` is at risk of being overwritten.
3. **Measurement access path.** Grant this environment network access to the site and Google hosts, or run the second pass on the Mac. Also confirm who owns the GA4 property Luxury Presence may already have set, and whether Caleb wants his own.

Nothing in this packet improved visibility. It is a baseline, an audit of what could be seen, and drafts awaiting approval.
