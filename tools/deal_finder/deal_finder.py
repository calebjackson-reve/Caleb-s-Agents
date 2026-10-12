"""Deal Finder: rank active listings by how far their price per square foot
sits below what comparable homes recently sold for in the same neighborhood.

Input is any CSV (MLS export, scraper output, future ROAM feed). Column names
are matched loosely, see COLUMN_ALIASES. Standard library only.

Usage:
    python3 tools/deal_finder/deal_finder.py listings.csv
    python3 tools/deal_finder/deal_finder.py listings.csv --months 6 --top 15 --out deals.csv
"""
import argparse
import csv
import statistics
import sys
from datetime import date, datetime, timedelta

COLUMN_ALIASES = {
    "address": ["address", "full address", "street address", "streetaddress"],
    "neighborhood": ["subdivision", "neighborhood", "subdivision name", "area"],
    "zip": ["zip", "zipcode", "zip code", "postal code", "postalcode"],
    "status": ["status", "listing status", "mlsstatus", "homestatus"],
    "list_price": ["list price", "listprice", "price", "asking price"],
    "sold_price": ["sold price", "soldprice", "close price", "closeprice", "sale price"],
    "sqft": ["sqft", "living area", "livingarea", "square feet", "sq ft", "heated sqft", "livingareasqft"],
    "close_date": ["close date", "closedate", "sold date", "solddate", "date sold"],
    "dom": ["dom", "days on market", "daysonmarket", "cdom"],
    "beds": ["beds", "bedrooms", "bedroomstotal"],
    "baths": ["baths", "bathrooms", "bathroomstotal", "bathstotal"],
    "year_built": ["year built", "yearbuilt"],
}
SOLD_WORDS = {"sold", "closed", "recently_sold"}
ACTIVE_WORDS = {"active", "for_sale", "coming soon", "active under contract"}
MIN_COMPS = 3


def _norm(s):
    return " ".join(str(s).strip().lower().replace("_", " ").split())


def map_columns(header):
    lookup = {_norm(h): h for h in header}
    mapping = {}
    for field, aliases in COLUMN_ALIASES.items():
        for a in aliases:
            if _norm(a) in lookup:
                mapping[field] = lookup[_norm(a)]
                break
    return mapping


def to_num(v):
    if v is None:
        return None
    s = str(v).replace("$", "").replace(",", "").strip()
    try:
        n = float(s)
        return n if n > 0 else None
    except ValueError:
        return None


def to_date(v):
    if not v:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(str(v).strip()[:19], fmt).date()
        except ValueError:
            pass
    return None


def load(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols = map_columns(reader.fieldnames or [])
        missing = [c for c in ("address", "status", "sqft") if c not in cols]
        if missing:
            sys.exit(f"Missing required columns: {missing}. Found: {reader.fieldnames}")
        rows = []
        for raw in reader:
            r = {k: raw.get(v) for k, v in cols.items()}
            r["sqft"] = to_num(r.get("sqft"))
            r["list_price"] = to_num(r.get("list_price"))
            r["sold_price"] = to_num(r.get("sold_price"))
            r["close_date"] = to_date(r.get("close_date"))
            st = _norm(r.get("status") or "")
            r["kind"] = "sold" if st in SOLD_WORDS else "active" if st in ACTIVE_WORDS else None
            r["neighborhood"] = (r.get("neighborhood") or "").strip().title() or None
            r["zip"] = (str(r.get("zip") or "").strip()[:5]) or None
            rows.append(r)
        return rows


def ppsf(r):
    if r["kind"] == "sold":
        price = r["sold_price"] or r["list_price"]
    else:
        price = r["list_price"]
    return price / r["sqft"] if price and r["sqft"] else None


def find_comps(target, sold, size_band):
    """Same neighborhood first, then same ZIP. Prefer similar size when enough comps exist."""
    for level, key in (("neighborhood", "neighborhood"), ("zip", "zip")):
        if not target.get(key):
            continue
        pool = [s for s in sold if s.get(key) == target[key]]
        sized = [s for s in pool if abs(s["sqft"] - target["sqft"]) / target["sqft"] <= size_band]
        if len(sized) >= MIN_COMPS:
            return sized, level
        if len(pool) >= MIN_COMPS:
            return pool, level + " (all sizes)"
    return [], None


def analyze(rows, months=6, size_band=0.25, today=None):
    today = today or date.today()
    cutoff = today - timedelta(days=int(months * 30.4))
    sold = [r for r in rows if r["kind"] == "sold" and ppsf(r) and r["sqft"]
            and (r["close_date"] is None or r["close_date"] >= cutoff)]
    results = []
    for a in rows:
        if a["kind"] != "active" or not ppsf(a):
            continue
        comps, level = find_comps(a, sold, size_band)
        if not comps:
            continue
        comp_ppsf = [ppsf(c) for c in comps]
        med = statistics.median(comp_ppsf)
        mine = ppsf(a)
        results.append({
            "address": a["address"],
            "neighborhood": a["neighborhood"] or "",
            "zip": a["zip"] or "",
            "list_price": round(a["list_price"]),
            "sqft": round(a["sqft"]),
            "list_ppsf": round(mine, 2),
            "comp_median_ppsf": round(med, 2),
            "discount_pct": round((med - mine) / med * 100, 1),
            "est_value": round(med * a["sqft"]),
            "gap_dollars": round(med * a["sqft"] - a["list_price"]),
            "comp_count": len(comps),
            "comp_basis": level,
            "dom": a.get("dom") or "",
            "confidence": "high" if len(comps) >= 6 and level == "neighborhood"
                          else "medium" if len(comps) >= MIN_COMPS and "all sizes" not in level
                          else "low",
        })
    results.sort(key=lambda r: r["discount_pct"], reverse=True)
    return results, len(sold)


def neighborhood_summary(rows, months=6, today=None):
    today = today or date.today()
    cutoff = today - timedelta(days=int(months * 30.4))
    groups = {}
    for r in rows:
        if r["kind"] == "sold" and ppsf(r) and (r["close_date"] is None or r["close_date"] >= cutoff):
            groups.setdefault(r["neighborhood"] or r["zip"] or "Unknown", []).append(r)
    out = []
    for name, g in groups.items():
        prices = [x["sold_price"] or x["list_price"] for x in g]
        out.append({"neighborhood": name, "sales": len(g),
                    "median_sold": round(statistics.median(prices)),
                    "median_ppsf": round(statistics.median(ppsf(x) for x in g), 2)})
    return sorted(out, key=lambda x: -x["sales"])


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("csv")
    p.add_argument("--months", type=float, default=6, help="sold comps lookback (default 6)")
    p.add_argument("--size-band", type=float, default=0.25, help="comp size tolerance (default 0.25 = 25%%)")
    p.add_argument("--min-discount", type=float, default=0, help="only show deals at least this %% under comps")
    p.add_argument("--top", type=int, default=20)
    p.add_argument("--out", help="write full results to this CSV")
    p.add_argument("--today", help="override today's date (YYYY-MM-DD) for testing")
    a = p.parse_args(argv)
    today = to_date(a.today) if a.today else None

    rows = load(a.csv)
    results, n_sold = analyze(rows, a.months, a.size_band, today)
    results = [r for r in results if r["discount_pct"] >= a.min_discount]

    print(f"\nNeighborhoods (sold in last {a.months:g} months)")
    for n in neighborhood_summary(rows, a.months, today):
        print(f"  {n['neighborhood']:<28} {n['sales']:>3} sales  median ${n['median_sold']:>9,}  ${n['median_ppsf']:>7,.2f}/sqft")

    print(f"\nTop deals ({len(results)} actives scored against {n_sold} sold comps)")
    print(f"  {'Address':<30} {'List':>10} {'$/sqft':>8} {'Comps':>8} {'Under':>7} {'Gap':>10}  Conf")
    for r in results[:a.top]:
        print(f"  {r['address'][:30]:<30} ${r['list_price']:>9,} {r['list_ppsf']:>8.2f} {r['comp_median_ppsf']:>8.2f} "
              f"{r['discount_pct']:>6.1f}% ${r['gap_dollars']:>9,}  {r['confidence']} ({r['comp_count']})")
    print("\nA big discount can mean condition, flood zone or lot issues. Verify before calling it a deal.")

    if a.out and results:
        with open(a.out, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(results[0].keys()))
            w.writeheader()
            w.writerows(results)
        print(f"Wrote {len(results)} rows to {a.out}")


if __name__ == "__main__":
    main()
