# Google review discrepancy: investigation and findings

Date: October 12, 2026. Profile: "Keller Williams First Choice -Caleb Jackson", CID 17113183507740077585, location ID 7744506514819131081, 17111 Commerce Centre Drive, Prairieville, LA 70769.

## The discrepancy

| When | Observed | Source |
|---|---|---|
| Oct 1, 2025 to Jul 30, 2026 | Daily Search and Maps impressions, occasional website and call clicks | Metricool GBP history (source-reported) |
| Jul 31 to Oct 5, 2026 | No performance rows at all | Metricool (source-reported) |
| Oct 6, 05:05 UTC | Google support: "you've successfully completed the verification of your Business Profile" (case 6-2250000041763) | Gmail thread 1a10f9a1e7210b4d (observed) |
| Oct 6, 05:18 UTC | Google: profile "is live", public card shows 5.0, 1 review, prompts "Add phone number" and "Add hours" | Gmail thread 1a10fa687b01ca45 (observed) |
| Oct 6 | Audit recorded one review and 5.0 | October 6 LP audit (source-reported) |
| Oct 12 | Owner panel says "Get your first review"; public Maps shows no rating section | October 12 audit browser check (source-reported) |
| Oct 12 | Metricool review list empty since 2024; reviewsCount 0, rating 0.0 for Sep 1 to Oct 12 | Metricool API (source-reported) |

So the review existed in Google's own rendering on October 6 and is absent from both the owner panel and the API by October 12. This is not a display glitch on one surface.

## Ranked explanations (inferred)

1. **Re-verification cycle dropped or re-filtered the review.** The 67-day silence followed by a "verification completed" email fits a profile that was edited (the office address changed from Market Pl to Commerce Centre Drive in this window), went into re-verification or a soft suspension, and relaunched. Reviews are re-evaluated on relaunch and a lone review from an account Google considers connected to the business (owner, family, colleague, same device or network) is commonly filtered.
2. **The review was removed under Google's review policy** (conflict of interest, solicitation, or a reviewer account Google flagged). Google rarely emails about this.
3. **The reviewer deleted it.**
4. **There are two profiles**, an older one at the Market Pl address that held the review and the relaunched one at Commerce Centre Drive. The Oct 6 email names the new address, and the audit saw only one CID, but a hidden duplicate would explain a review that appears on one surface and not another.

Gmail from Sep 1 to Oct 12 has no Google email about a review being removed, a policy violation, or a suspension. A second Google account, calebjackson@kw.com, was recovered on Oct 7 using aire@ as recovery address, with verification codes on Oct 7 and 8. If that account ever owned or managed the profile, it belongs in the ownership check below.

## What Caleb needs to do in a browser (15 minutes)

Record a screenshot for each step. Nothing here changes the profile.

1. Open https://business.google.com/n/7744506514819131081/profile/info while signed in as aire@calebjackson.org. Screenshot the Reviews tab and the "Get your first review" state.
2. Switch to the calebjackson@kw.com account and open https://business.google.com/. Note whether it lists a Caleb Jackson or Keller Williams First Choice profile, and at which address. Screenshot.
3. In an incognito window open https://www.google.com/maps?cid=17113183507740077585. Screenshot the card. Then search Maps for "Caleb Jackson" and "Keller Williams First Choice Prairieville". Screenshot every result. Any second card for Caleb at Market Pl or Commerce Centre Drive is a duplicate to report to Google, not to claim.
4. Think back: who left the October 6 review? If it was Caleb, a relative, a Keller Williams colleague, or someone on the same Wi-Fi as the office, Google's filter is the likely cause and the review will not return. If it was a past client with no connection, ask them (by text or call, not through a review link) whether their review still shows in their own Google account under "Your contributions". If it shows for them but not publicly, it is filtered. If it is gone for them too, they or Google deleted it.
5. Open the profile's Google support history at https://support.google.com/business/contact/business_redressal_form only if step 3 found a duplicate. Submit a duplicate-merge request. Do not submit a reinstatement request; the profile is live.

## Decision after the checks

- Filtered or policy removed: do not appeal a single filtered review. Move to the review-request process below.
- Reviewer deleted: same.
- Duplicate found: merge request first, then wait for Google's answer before any review requests, so new reviews do not land on the profile that gets removed.

## Honest review-request process (for approval, not yet sent)

Google's rules: no incentives, no gating (asking only happy clients), no bulk solicitation from one device, no review stations in the office. Ask actual clients, one at a time, after closing or a clearly finished step.

Direct review link to use: https://search.google.com/local/writereview?placeid= (Caleb copies the "Get more reviews" short link from the Business Profile Manager home card, which is the canonical one for this CID).

Draft text (Caleb's voice, send individually):

> Hey [first name], it meant a lot to work with you on [street or neighborhood]. If you have two minutes, a quick Google review about what the process was like would help the next family find me. Here's the link: [link]. No pressure at all, and thank you either way.

Sequence: start with the five most recent closings since Oct 7 (new, post-relaunch), then one or two per week from 2025 and 2026 closings. Reply to every review within a day in Caleb's voice. Log the asks (date, person, outcome) in a private sheet, not in this repo.

## GBP completeness to fix at the same time

Google's Oct 6 email showed phone and hours empty. Exact values are in profile-change-set.md (phone, "Open by appointment", description naming St. Francisville and Baton Rouge, services, website, social links, photos).
