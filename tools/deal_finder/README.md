# Deal Finder

Ranks active listings by how far their price per square foot sits below the median $/sqft of homes that recently sold in the same neighborhood.

## Run it

```bash
python3 tools/deal_finder/deal_finder.py your_export.csv --months 6 --min-discount 10 --out deals.csv
```

Works with an MLS CSV export today and a ROAM Flex / IDX feed or Zillow test pull later. Columns are matched loosely (Subdivision or Neighborhood, Close Price or Sold Price, LivingArea or SqFt, and so on).

Needs: address, status (Active / Sold), square feet, list price for actives, sold price for solds. Close date and subdivision make it much better.

## How it scores

1. Takes sold homes from the last N months (default 6).
2. For each active, finds comps in the same subdivision within 25% of its size. Falls back to all sizes, then the ZIP, if there are fewer than 3.
3. Compares the active's list $/sqft to the comps' median sold $/sqft.
4. Shows % under comps, estimated value, dollar gap and a confidence level.

## Limits

- $/sqft ignores condition, lot size, pool, flood zone and updates. Treat results as a shortlist to verify, not a valuation.
- `sample/zachary_sample.csv` is synthetic test data, not real listings.
