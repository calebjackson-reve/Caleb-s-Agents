# Site review checklist for the 30-page preview

For the visual review of the Codex full-site preview (built October 6 to 7, 2026 on Caleb's Mac) and the transfer into Luxury Presence. Caleb set this preview as the direction for the whole site on October 7. Work through every page with this list. A page passes only when every row is a yes or has a written reason.

## Before touching Luxury Presence

- [ ] Decision D2 is set: AI SEO Specialist on review-before-apply or paused 60 days, AI Blog Specialist draft-only. Otherwise the automation overwrites the new titles, descriptions and H1s one page a week.
- [ ] Search Console and GA4 access confirmed, so the before and after can be measured. Export the 90-day baseline first.
- [ ] A before snapshot (screenshot and view-source) of every page the transfer replaces.
- [ ] A rollback copy of the current page content.
- [ ] The preview folder is shared somewhere Claude can read it: drop it into `site/preview/` on a branch of this repo (run the commit guard from pull request 1 first) or into the Drive brand folder.

## Brand, every page

- [ ] Ivory and ink carry the page. Ember appears once. No gold, navy or gradients.
- [ ] Instrument Serif display, Hauora body. Labels uppercase with tracking.
- [ ] Wordmark "caleb jackson." with the ember period. Monogram "aj." where an avatar is used. No houses, keys, roofs or skylines in the mark.
- [ ] "Keller Williams First Choice" legible on every page. Never inside the personal mark. No Rêve name, color, font or language anywhere, including image alt text and metadata.
- [ ] Footer shows 37325 Market Place Drive, (225) 747-0303, calebjackson.org and @calebjacksonla. No Commerce Centre Drive. No @calebjackson_24.
- [ ] Voice: first person, short lines, real numbers and places. No "unparalleled service," no emoji stacks, no em dashes, no semicolons.
- [ ] Receipts appear where the page argues for Caleb: 81 closed deals, $25.1M since 2022, every client by referral, never a paid lead. At most two receipts per page. The exact approved wording is in `brand/profile-copy-kit.md`.

## Facts

- [ ] Every statistic names its source and date on the page.
- [ ] No market claim comes from the unreviewed AI blog posts until fact-checked (the False River and St. Francisville posts in particular).
- [ ] No credential, award or performance claim beyond the four receipts.
- [ ] Neighborhood pages describe facts, not who should live there. Fair housing language throughout.
- [ ] Addresses and client names appear only with permission. No client transaction documents on the site.

## Search and AI answers, every page

- [ ] One unique SEO title near 55 to 60 characters and one description near 150 to 160, from the research packet's metadata drafts where one exists.
- [ ] One H1 that matches the page's intent. The repeated "Showing Game Plan" H1 the October 6 audit saw across pages must be gone or confirmed as a non-heading element.
- [ ] Canonical URL set and Search Engine Indexing checked.
- [ ] The direct answer to the page's question sits near the top, in plain text, with a local number and a date.
- [ ] Author shown as Caleb Jackson, REALTOR, Keller Williams First Choice.
- [ ] Each tool page links to its explainer and back. Each explainer links to exactly one money page (seller consult or buyer consult). Neighborhood guides link to their relocation guide and the flood explainer.
- [ ] The page maps to one of the ten research briefs or one of the five content pillars. If it maps to none, write down why it exists.

## Conversion paths

- [ ] The existing contact and net-sheet paths still work end to end. Test with a synthetic submission, not a real lead.
- [ ] Every page has one clear next step and it leads to a conversation, a tool or a booking.
- [ ] Phone number is tap-to-call on mobile.
- [ ] Forms land in the lead source of truth (KW Command) and the lead-response agent sees them.

## Technical

- [ ] One GA4 tag on the page (G-PDSW2YFRNW or the Caleb-owned property once decided), not two.
- [ ] Mobile layout at phone width: no horizontal scroll, legible body text, ember never used for body text or small links.
- [ ] Images have alt text in the brand voice. Headshots are the current Keller Williams First Choice set.
- [ ] Any changed URL has a redirect in the Luxury Presence redirect manager before the old page goes away.
- [ ] After each live save, load the public page and confirm the saved output matches the preview.

## Sign-off

| Page | Brand | Facts | Search | Conversion | Technical | Reviewer | Date |
|---|---|---|---|---|---|---|---|
| (one row per page, 30 rows) | | | | | | | |
