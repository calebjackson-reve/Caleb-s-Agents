---
name: brand-consistency
description: Audit and fix Caleb Jackson's public identity across the website, Google Business Profile, social profiles and listing portals, and measure search and AI visibility for St. Francisville and Baton Rouge. Use when Caleb asks to check, fix, or re-measure his online presence, profiles, reviews, SEO or AI search visibility.
---

# Brand consistency and visibility audit

## Read first
- `identity-standard.md` in this folder. Every value on every surface must match it. If Caleb gives a newer value in chat, update that file first, then proceed.
- `measurement-protocol.md` for the repeatable search and AI tests.
- The latest `audits/YYYY-MM-DD/` folder for the previous baseline and open items.

## Rules
- Nothing is published, sent to a third party, deleted, claimed, renamed or purchased without Caleb's explicit yes for that item. Prepare the exact change, then ask.
- Keller Williams First Choice only. No Rêve branding or language. Crystal Bonin Realty is history, never current.
- Label every statement observed, source-reported, inferred or unknown. A blocked fetch is coverage, not evidence of absence.
- Dates next to every production figure. Never overwrite platform-generated totals with the approved headline figure; they measure different things.
- Review requests: real clients only, no incentives, no gating, no scripts that ask for stars.

## Workflow
1. **Collect** (read-only, in parallel):
   - Fetch all sitemap URLs from calebjackson.org and grep for the stale identifiers listed in identity-standard.md plus the current ones. Fetch robots.txt, sitemap children, llms.txt.
   - Run the crawler user-agent test from measurement-protocol.md.
   - Gmail: `from:google.com (review OR "Business Profile" OR verification)`, `luxurypresence`, `zillow` for the period since the last audit.
   - Metricool brand 7076779: GBP reviews list, reachSearch/reachMaps, clicks, keywords; brand info for connected handles.
   - WebFetch the pages that allow it (site, The Advocate, Google emails). Zillow, Homes.com and Realtor.com return 403 to automated fetches; list them for a browser check.
2. **Diff** every surface against identity-standard.md. Write `audits/<date>/website-change-set.md` and `profile-change-set.md` with before/after values and the exact text to send to Luxury Presence support (one case per topic).
3. **Investigate** anything that moved (reviews, rankings, a profile going dark) with a dated timeline before proposing a fix. See `audits/2026-10-12/google-review-investigation.md` as the pattern.
4. **Measure** per measurement-protocol.md from St. Francisville and Baton Rouge locations. Save raw results under `audits/<date>/baseline/`.
5. **Verify** after Caleb applies changes: re-fetch each live page or profile, record observed value and timestamp in `audits/<date>/verification.md`. Only then mark an item done.
6. **Commit** the audit folder on a feature branch and open a draft PR. Summarize in chat with the open decisions for Caleb.

## Tools that work from a cloud session
WebFetch and curl for the site and most public pages; Gmail, Google Drive, Metricool MCP connectors; WebSearch for a national index snapshot. Luxury Presence has no API; changes go through the dashboard or support@luxurypresence.com. Google Business Profile fields are edited at business.google.com by Caleb; GBP posts can be drafted through Metricool "for review".
