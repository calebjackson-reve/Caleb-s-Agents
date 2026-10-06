# "Free ads" and promotion investigation

File: `csv/offers.csv`. Classification: 1 free organic feature, 2 included in a subscription already paid, 3 promotional credit with spend conditions, 4 paid, 5 unknown terms.

## Findings
- **Genuinely zero-incremental-cost opportunities exist and are organic:** Google Business Profile features (posts, photos, services, Q&A, messaging), Bing Places (reported to import from GBP), Apple Business Connect, and Metricool scheduling of GBP posts for review. Setup paths are in `09-change-drafts.md`. None is an ad campaign.
- **Included in the current Luxury Presence subscription (plan tier unknown):** AI SEO Specialist weekly metadata edits and AI Blog Specialist posts. Both are active. Whether the plan includes a human SEO analyst or any advertising product is unknown; a question is drafted for LP.
- **Google Ads new-advertiser promotion is not free.** Snippets of Google's own pages state: new advertisers only, one per advertiser, a valid payment method at signup, a spend threshold that must be met within a window, credit applied afterward with its own expiry. The incremental cash commitment equals the spend threshold at minimum, plus any spend after the credit is exhausted. No Google Ads account exists. Do not activate.
- **Meta:** no account, no credit evidence. Housing ads fall under Meta's Special Ad Category (no age, gender or ZIP targeting; wide radius). Not recommended now.
- **AI-platform advertising:** not assessable from this session; no account access; official pages not readable. Not assumed.
- **First Answer (connector showing "connect_incomplete"; 7-day trial mentioned by Caleb on 2026-10-06):** vendor and terms could not be identified from public search. Unknown auto-conversion risk. Not started. Caleb's standing rule and this assignment forbid trials with charge risk without explicit approval.

Plain statement: there is no free advertising available. Prioritize organic work.

## Paused campaign package (conditional; not recommended for activation now)
Prepared only because the assignment asks for a launch-ready paused specification for opportunities the research justifies. The only candidate that could justify spend after 60 days of organic data is local seller intent in Zachary and north EBR. All budget and CPA numbers below are proposals, not estimates.

- Objective: seller consultation requests (verified conversion required before launch).
- Geography: radius targeting around Zachary and north East Baton Rouge consistent with housing policy. No ZIP, age, gender, parental or marital targeting (Google housing policy, source-reported). Verify the current policy page before building.
- Structure: one campaign, Search only, two ad groups: "sell house Zachary" and "listing agent Zachary / Baton Rouge north". Exact and phrase match only.
- Keywords (seed): sell my house zachary la; listing agent zachary; realtor to sell my house zachary; sell my home zachary louisiana; home value zachary la; sell my house baton rouge.
- Negatives (seed): rent, rental, apartment, jobs, school, zillow, redfin, cash offer, we buy houses, foreclosure, auction, commercial, Zachary (first-name collisions: "Zachary Payer", "Zachary realtor Texas"), Mississippi.
- Ad copy (draft, LREC-compliant, awaiting broker name and phone):
  - Headline 1: Selling in Zachary? Get the Net Sheet
  - Headline 2: Caleb Jackson, Keller Williams First Choice
  - Headline 3: Same-Day Callback
  - Description 1: See what you would actually net before you list. Local pricing proof, straight answers.
  - Description 2: Licensed in Louisiana. Keller Williams First Choice, [broker phone].
- Landing page: `/sell-zachary` (brief 01) with the net sheet; UTMs `utm_source=google&utm_medium=cpc&utm_campaign=sell-zachary&utm_content={adgroup}`.
- Conversion dependency: GA4 event for net sheet completion and consult request, verified with a synthetic submission.
- Measurement: cost per consult request; consult-to-appointment rate from CRM; stop if 30 days pass with no appointment or if CPA exceeds the proposal ceiling.
- Budget proposal: not set. Any figure needs Caleb's decision; the promotion threshold would set a floor.
- Compliance: Louisiana rules require the sponsoring broker's name and phone conspicuous in advertising; agent name must not be presented as a company name; team names need broker approval. Fair housing: no protected-class language; no "family neighborhood" targeting claims.

This package is a draft file. No account, campaign, billing profile or trial was created.
