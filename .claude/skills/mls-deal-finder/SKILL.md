---
name: mls-deal-finder
description: Use MLS or ROAM CSV exports to run Caleb's Deal Finder with actual closed prices, missing-data diagnostics and dated evidence. Route requests to analyze an MLS export or find deals from MLS; export navigation awaits Caleb's walkthrough.
---

# MLS Deal Finder

Caleb prefers MLS as the primary source; Zillow is supplemental and requires explicit scoped authorization for any paid pull. This route is on demand, with no background jobs or sends.

Locate the Caleb-s-Agents checkout containing `tools/deal_finder/deal_finder.py`; current local checkout is `/Users/caleb/Documents/Codex/2026-10-12/https-www-skool-com-ai-automation/work/deal-finder-repo` on PR12's `claude/tender-rubin-eo4m13` branch. In a cloud checkout, use the repository root instead. Read `tools/deal_finder/MLS-INTAKE.md` before processing.

Use authorized MLS CSV files. Verify dates, field meaning, property-class comparability and duplicates before combining exports. Never substitute asking price, Zestimate or estimated value for closed price. Missing actual sold price/date means excluded comparison evidence. If exact ROAM export steps are requested before the walkthrough exists, request that missing source rather than guessing navigation.

Keep client/transaction data local or with paid first-party Anthropic; never paste private rows into Codex or route them to other providers. Codex can perform deterministic local processing and read aggregate diagnostics. Store raw files/results in a gitignored local work folder, never commit listings.

Run `bash tools/deal_finder/verify.sh`, then `python3 tools/deal_finder/deal_finder.py NORMALIZED.csv --today AS_OF_DATE --months 6 --out RESULTS.csv`. Deliver the source/as-of dates, exclusions, comparison basis/counts and shortlist together. No usable sold evidence means explicitly report insufficient evidence. Do not call an older snapshot current, or the screening estimate a verified valuation. Open the deliverable and attach actual execution evidence.
