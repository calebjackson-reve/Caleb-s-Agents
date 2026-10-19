# Week 2: calculators, bulk tier, Meta One

Written October 19, 2026, started the same day week 1 was logged because Caleb said go. Week 1's switches are still his to flip and stay open in `WEEK-1.md`.

## Status
| # | Move | Who | State |
|---|---|---|---|
| 1 | Seller net sheet calculator for the Sell page | Claude built, Caleb reviews defaults, LP paste | built, proven, waiting on review |
| 2 | Enrichment pipeline on the bulk tier (Haiku 5.5) | Claude built, Caleb runs first dry run | built, compiles, not yet run against the API |
| 3 | Meta One decision | Caleb | memo below, needs a yes or no |
| 4 | RealAssist market check | Caleb | 30 minutes in Realtor.com+ |
| 5 | Facebook Your Algorithm set to local real estate | Caleb | 10 minutes on his phone |

## 1. Net sheet calculator
File: `aire/calculators/net-sheet.html`. Preview: https://claude.ai/artifact/9nV9rkWA422LkAbX5AC31L (private to Caleb).

Proof, run October 19 in a headless browser at 400 px wide:
- Default inputs show $123,350, which matches the hand calculation (325,000 sale, 5.5 percent commission, 0.5 percent title, $150 recording, $1,500 taxes, $500 warranty, $180,000 payoff).
- Changing to a $400,000 sale and $200,000 payoff shows $173,850, also matching by hand.
- No horizontal scroll at phone width, no console errors.

Caleb's part: check the defaults against his last three closings, then paste the file into a custom HTML section on the Sell page per `aire/calculators/README.md`.

## 2. Lead enrichment on the bulk tier
Folder: `aire/lead-enrichment/`. The directive, the script, and a three-row sample CSV. The script compiles. It could not be run here because this session has no Anthropic API key, by design. First real run is on Caleb's Mac:
```
cd aire/lead-enrichment && pip install anthropic && python3 enrich.py sample-leads.csv
```
DRY_RUN is on, so it prints three tagged rows and the cost and writes nothing. Expected cost on Haiku 5.5 is under a cent for three rows. If the Console org is linked (week 1, switch 4), the monthly credits pay for it.

There was no existing enrichment pipeline to reroute. The plan said "reroute to Haiku 5.5". The honest version is "build the first one on Haiku 5.5", which is what this is.

## 3. Meta One, decision memo
Confirmed from secondary coverage (adlibrary.com, heygotrade.com, October 2026): Meta One Advanced is $49.99 a month and includes links on organic Instagram feed posts and Reels, Story scheduling 30 days out, exportable analytics, team access. Not confirmed: whether business plans are live in the US yet. One report says business tiers were testing in four other countries first.

Inference: at $600 a year, one closed buyer from an Instagram link pays for a decade of it. The risk is not the money, it is spending time on a feature that may not be in the US yet. Recommendation: open Instagram, Settings, check for Meta One. If Advanced is offered, subscribe for one month and put a link under every listing post for that month. If it is not offered, wait, and check again in the Monday brief.

## 4. RealAssist market check
Log in to Realtor.com+, look for RealAssist. If Baton Rouge or St. Francisville is in the 21 markets, use it for one buyer this month and tear it down with the `teardown` skill. It is a free look at what the portals think agent AI should be.

## 5. Facebook Your Algorithm
Facebook app, three-dot menu, Your Algorithm. Describe in plain words: St. Francisville and Baton Rouge real estate, local agents, listings, market updates. Teardown Tuesday then sees local competitors instead of whatever the feed guessed.
