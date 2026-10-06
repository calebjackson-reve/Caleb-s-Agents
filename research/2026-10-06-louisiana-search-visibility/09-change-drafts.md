# Exact change drafts (nothing applied)

Facts awaiting confirmation are marked **[CONFIRM]**. Ready drafts are marked **ready**. Separate files: `drafts/metadata-drafts.md`, `drafts/gbp-field-drafts.md`, `drafts/about-page-draft.md`, `drafts/citation-corrections.md`, `drafts/schema-draft.jsonld`, `drafts/lp-support-request-draft.md`, `drafts/gbp-posting-plan-month-1.md`.

## Canonical business facts (for every profile)
- Name: Caleb Jackson, REALTOR® **[CONFIRM licensed name matches LREC record]**
- Brokerage: Keller Williams First Choice (portal listings show "Keller Williams Realty-First Choice") **[CONFIRM exact licensed brokerage name and sponsoring broker's name and phone for LREC advertising]**
- Office address: 17111 Commerce Centre Drive, Prairieville, LA 70769 (as shown on GBP) **[CONFIRM clients are met here; otherwise hide address]**
- Phone: (225) 747-0303 (bio draft and portal) **[CONFIRM this is the public business line]**
- Website: https://calebjackson.org/
- Service areas: Baton Rouge, Zachary, St. Francisville, New Roads, East Feliciana Parish, West Feliciana Parish; secondary: East Baton Rouge, Pointe Coupee, Ascension **[CONFIRM current coverage; do not list parishes without current service]**
- Social: Instagram `calebjacksonla` (Metricool) vs `@calebjackson_24` (July bio draft) **[CONFIRM which is current]**; Facebook page 107195095165191 **[CONFIRM name]**; YouTube UCdy7yq7pWHz93dba4wlqs3w **[CONFIRM]**
- Positioning line (ready): "Action Jackson. When it's time to move, we move."

## GBP field drafts (ready except marked)
- Business name option 1 (practitioner-only, aligns with Google's multi-practitioner guidance): `Caleb Jackson, REALTOR` **[DECISION D1]**
- Business name option 2 (keep current): `Keller Williams First Choice -Caleb Jackson`. Risk: guideline conflict at a multi-agent office.
- Phone: (225) 747-0303 **[CONFIRM]**
- Hours: Monday to Friday 8:00 AM to 6:00 PM; Saturday 9:00 AM to 2:00 PM; Sunday closed **[CONFIRM; or "open with no main hours" if by appointment]**
- Website: `https://calebjackson.org/?utm_source=google&utm_medium=organic&utm_campaign=gbp`
- Appointment link: `https://calebjackson.org/contact?utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=appointment` **[CONFIRM path]**
- Description (750 characters max; ready, 611 chars):
  "Caleb Jackson is a Baton Rouge-born REALTOR with Keller Williams First Choice serving Zachary, Baton Rouge, St. Francisville, New Roads and the Felicianas. They call me Action Jackson because when it's time to move, we move: your call gets returned the same day. Sellers get straight pricing, a seller net sheet before listing, and marketing that is shot right and negotiated through to close. Buyers get block-by-block guidance, a true monthly payment estimate that includes parish taxes and insurance, and a flood-zone check before you fall in love with a house. Keller Williams First Choice, [sponsoring broker name], [broker phone]."
  **[CONFIRM broker name and phone; LREC requires them conspicuous]**
- Services (ready): Seller representation; Buyer representation; Home valuation (CMA); Seller net sheet estimate; Relocation guidance; Land and acreage; Waterfront (False River); First-time buyer guidance.
- Service areas (up to 20): Zachary, Baton Rouge, Central, Greenwell Springs, Pride, Baker, Jackson, Clinton, Slaughter, Ethel, St. Francisville, New Roads, Ventress, Jarreau, Prairieville **[CONFIRM]**
- Secondary category candidates: Real estate consultant **[hypothesis; verify category list]**
- Products (link cards): Home Valuation; Seller Net Sheet; True Payment Calculator; Flood-Zone Check; Neighborhood Match Quiz, each with `utm_content=<tool>`.
- Q&A seed (owner-posted, factual): "Do you serve St. Francisville?" / "Yes, West Feliciana and East Feliciana are part of my regular coverage. [first-hand detail]"
- Review link: use the share link from the profile; request template in `drafts/gbp-posting-plan-month-1.md`.

## Metadata drafts (homepage, About, tool pages, three briefs)
In `drafts/metadata-drafts.md`. Titles are kept near 55 to 60 characters and descriptions near 150 to 160 for display, with the note that pixel width, not count, governs truncation and none of this is a ranking guarantee. Do not apply until D2 is decided.

## Internal links (ready)
- Homepage hero keeps Home Search and Home Valuation (locked). Add a "Selling in Zachary?" link in the seller section to `/sell-zachary`.
- Each tool page links to its explainer and back; each explainer links to one money page (seller consult or buyer consult).
- About page links to GBP, Instagram, Facebook, the brokerage page, and the LREC license lookup.
- Neighborhood guides link to the relocation guide for their city and to the flood explainer.

## Schema (conditional on LP supporting custom head scripts)
`drafts/schema-draft.jsonld`: Person + RealEstateAgent with sameAs, worksFor (Organization: Keller Williams First Choice), areaServed, telephone, address **[CONFIRM facts]**. No review or aggregateRating markup. BreadcrumbList only if LP does not already emit it. Validate with the Rich Results Test; syntax validity is not rich-result eligibility.

## Citation corrections (ready to send by Caleb)
`drafts/citation-corrections.md`: theadvocate.com agent profile affiliation; Zillow, Realtor.com, Homes.com profile checks; Facebook and Instagram bio lines with KW First Choice and the website; LinkedIn headline.

## LP support request (draft; not sent)
`drafts/lp-support-request-draft.md`: plan entitlements; AI SEO scope and pause options; custom head script support; robots and canonical behavior for IDX; redirects panel; GBP connection status.
