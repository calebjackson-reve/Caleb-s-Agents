#!/usr/bin/env python3
"""
Market Monitor: public signals in Caleb's farm areas, one row shape, into cache/signals.json for the
Pipeline app (through `crm.py feed`, which joins them to the map and the known contacts).

Sources in version one:
  * East Baton Rouge building permits, data.brla.gov dataset 7fq7-8j7r ("All construction and occupancy
    permits issued in East Baton Rouge Parish"). Rows already carry lat and long. Residential only by default.
  * Flexmls saved-search alert mail to aire@ (ROAM MLS moved to Flexmls on 2026-10-26). Read only, same Google
    token as crm.py. New listing, price change, pending, sold, back on market. Louisiana is a non-disclosure
    state, so sold prices exist only here, never in public records.

  python3 monitor.py pull                      # dry run: fetch, count, write nothing
  python3 monitor.py pull --write              # write cache/signals.json (client-adjacent data, stays on the Mac)
  python3 monitor.py pull --days 30 --all-permits --no-mail
  python3 monitor.py pull --permits FILE --mail FILE   # offline, from saved JSON
  python3 monitor.py --test

Nothing here writes to the sheet. A signal becomes a Contacts or Deals row only when Caleb clicks Make lead
or Make deal in Pipeline, which calls `crm.py lead` or `crm.py deal`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import geo  # noqa: E402

CACHE = HERE / "cache" / "signals.json"
EBR_DATASET = "7fq7-8j7r"
EBR_URL = f"https://data.brla.gov/resource/{EBR_DATASET}.json"
EBR_SOURCE = f"EBR permits, data.brla.gov {EBR_DATASET}"
FLEX_SENDERS = ("flexmls.com", "flexmail.flexmls.com", "sparkplatform.com")

# Permit type -> a short label Caleb can filter on. Anything not listed is "other". Read from the live
# column values on 2026-10-27 (the top permittype values), not guessed.
PERMIT_LABELS = [
    (re.compile(r"re-?roof", re.I), "roof"),
    (re.compile(r"new building", re.I), "new build"),
    (re.compile(r"occupancy", re.I), "moved in"),
    (re.compile(r"remodel|addition|existing bldg", re.I), "remodel"),
    (re.compile(r"swimming pool", re.I), "pool"),
    (re.compile(r"demolition", re.I), "teardown"),
    (re.compile(r"accessory structure", re.I), "outbuilding"),
    (re.compile(r"gas|electrical|plumbing|mechanical|generator|fence|sign", re.I), "minor"),
]

# Flexmls alert mail. The real format has not been seen yet (no alerts existed in aire@ on 2026-10-27, the
# day after the ROAM cutover), so these patterns are the standard Flexmls subscription layout and the first
# real alert gets saved, with names removed, as tests/fixtures/flex-alert.json. Unparsed mail is reported.
FLEX_EVENT = re.compile(r"\b(New Listing|Price (?:Change|Decrease|Reduced|Increase)|Back on Market|Pending|Under Contract|Sold|Closed|Withdrawn|Expired)\b", re.I)
FLEX_ADDRESS = re.compile(r"\b(\d{1,6} [A-Za-z0-9 .'#-]+?),\s*([A-Za-z .]+?),\s*LA\s*(\d{5})\b")
FLEX_PRICE = re.compile(r"\$\s?(\d{1,3}(?:,\d{3})+|\d{4,9})")
FLEX_TYPES = {"new listing": "new_listing", "price change": "price_change", "price decrease": "price_change",
              "price reduced": "price_change", "price increase": "price_change", "back on market": "back_on_market",
              "pending": "pending", "under contract": "pending", "sold": "sold", "closed": "sold",
              "withdrawn": "withdrawn", "expired": "expired"}


def title(s: str) -> str:
    return " ".join(w.capitalize() if not re.fullmatch(r"[NSEW]{1,2}|LA|LLC", w) else w for w in (s or "").split())


# ------------------------------------------------------------- permits


def fetch_permits(days: int, residential_only: bool = True, as_of: date | None = None, get=None) -> list[dict]:
    """SODA query, read only, no key. Returns the raw rows."""
    import urllib.parse
    import urllib.request
    as_of = as_of or date.today()
    since = (as_of - timedelta(days=days)).isoformat()
    where = f"issueddate >= '{since}T00:00:00'"
    if residential_only:
        where += " AND designation='Residential'"
    q = urllib.parse.urlencode({"$where": where, "$order": "issueddate DESC", "$limit": 5000})
    get = get or _http_get
    return json.loads(get(f"{EBR_URL}?{q}"))


def _http_get(url: str) -> str:
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "aire-market-monitor/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8", "ignore")


def permit_label(permit_type: str) -> str:
    for rx, label in PERMIT_LABELS:
        if rx.search(permit_type or ""):
            return label
    return "other"


def normalize_permit(r: dict, pulled: str) -> dict | None:
    """One SODA row -> the signal row shape. Field names come from the dataset's columns.json (2026-10-27)."""
    if not r.get("permitid") or not r.get("streetaddress"):
        return None
    try:
        lat = float(r["lat"]) if r.get("lat") else None
        lng = float(r["long"]) if r.get("long") else None
    except ValueError:
        lat = lng = None
    try:
        value = int(float(r.get("projectvalue") or 0))
    except ValueError:
        value = 0
    return {
        "id": f"permit:{r['permitid']}", "type": "permit", "label": permit_label(r.get("permittype", "")),
        "subtype": r.get("permittype", ""), "date": (r.get("issueddate") or "")[:10],
        "address": title(r.get("streetaddress", "")), "city": title(r.get("city1", "")), "state": (r.get("state1") or "LA").upper(),
        "zip": str(r.get("zip", ""))[:5], "value": value, "price": None,
        "description": (r.get("projectdescription") or "").strip()[:200], "subdivision": title(r.get("subdivision", "")),
        "sqft": int(float(r.get("squarefootage") or 0)) if str(r.get("squarefootage", "")).replace(".", "").isdigit() else 0,
        "owner": (r.get("ownername") or "").strip(), "contractor": (r.get("contractorname") or "").strip(),
        "lat": lat, "lng": lng, "farm": "",
        "source": EBR_SOURCE, "source_ref": r.get("permitnumber", ""), "source_date": pulled,
    }


# ----------------------------------------------------------------- mail


def flex_messages(days: int) -> list[dict]:
    """Flexmls alert mail from Gmail, read only, same token as crm.py. Only the Flexmls senders."""
    sys.path.insert(0, str(HERE.parent / "crm"))
    import crm as engine  # noqa: E402
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    import base64
    creds = Credentials.from_authorized_user_file(str(engine.TOKEN), engine.SCOPES)
    svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
    q = f"newer_than:{max(1, days)}d (" + " OR ".join(f"from:{s}" for s in FLEX_SENDERS) + ")"
    res = svc.users().messages().list(userId="me", q=q, maxResults=200).execute(num_retries=6)
    out = []
    for m in res.get("messages", []):
        full = svc.users().messages().get(userId="me", id=m["id"], format="full").execute(num_retries=6)
        h = {x["name"]: x["value"] for x in full["payload"]["headers"]}
        when = datetime.fromtimestamp(int(full["internalDate"]) / 1000, tz=timezone.utc)
        body = ""
        parts = [full["payload"]] + full["payload"].get("parts", [])
        for p in parts:
            if p.get("mimeType", "").startswith("text/plain") and p.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(p["body"]["data"]).decode("utf-8", "ignore")
                break
        if not body:
            body = full.get("snippet", "")
        out.append({"id": m["id"], "subject": h.get("Subject", ""), "from": h.get("From", ""),
                    "date_iso": when.astimezone(engine.CENTRAL).replace(microsecond=0).isoformat(), "body": body})
    return out


def parse_flex_alert(m: dict) -> list[dict]:
    """One alert mail -> zero or more signal rows. An address with no event word in the lines around it is
    skipped; a listing with no price is kept with price None. Pure."""
    body = m.get("body", "") or ""
    subj = m.get("subject", "") or ""
    day = (m.get("date_iso") or "")[:10]
    rows = []
    lines = body.splitlines()
    for i, line in enumerate(lines):
        a = FLEX_ADDRESS.search(line)
        if not a:
            continue
        window = " ".join(lines[max(0, i - 3): i + 4])
        ev = FLEX_EVENT.search(window) or FLEX_EVENT.search(subj)
        if not ev:
            continue
        prices = [int(p.replace(",", "")) for p in FLEX_PRICE.findall(window)]
        mls = re.search(r"\b(?:MLS|ML)\s*#?\s*(\d{5,10})\b", window)
        street, city, zip_ = a.group(1).strip(), a.group(2).strip(), a.group(3)
        ref = mls.group(1) if mls else re.sub(r"[^a-z0-9]+", "-", f"{street} {zip_}".lower()).strip("-")
        kind = FLEX_TYPES[ev.group(1).lower()]
        # A price change reads "Was $289,900 now $279,900": the current price is the last one in the block.
        price = (prices[-1] if kind == "price_change" else prices[0]) if prices else None
        rows.append({
            "id": f"mls:{kind}:{ref}:{day}", "type": kind, "label": kind.replace("_", " "), "subtype": ev.group(1),
            "date": day, "address": street, "city": city, "state": "LA", "zip": zip_,
            "value": None, "price": price, "price_was": prices[0] if kind == "price_change" and len(prices) > 1 else None,
            "description": subj[:200], "subdivision": "", "sqft": 0, "owner": "", "contractor": "",
            "lat": None, "lng": None, "farm": "",
            "source": "Flexmls alert mail to aire@", "source_ref": mls.group(1) if mls else "", "source_date": day,
        })
    return rows


# ------------------------------------------------------------------ pull


def pull(days: int, permits_raw: list[dict] | None, mail: list[dict] | None, farms: list[dict],
         existing: list[dict] | None = None, as_of: date | None = None, geocoder=None) -> dict:
    """Normalize, geocode the MLS rows that have no coordinates (Census, free), tag farms, merge with the
    existing cache (rows older than 2 x days drop off). Pure except for the geocoder call."""
    as_of = as_of or date.today()
    pulled = as_of.isoformat()
    rows: dict[str, dict] = {}
    for r in existing or []:
        rows[r["id"]] = r
    counts = {"permits_in": 0, "permits_kept": 0, "mail_in": 0, "mail_rows": 0, "mail_unparsed": 0, "geocoded": 0,
              "geocode_failed": 0, "dropped_old": 0}
    unparsed = []

    def merge(n: dict) -> None:
        # A row seen before keeps the coordinates an earlier run geocoded when the source has none.
        old = rows.get(n["id"], {})
        if n.get("lat") is None and old.get("lat") is not None:
            n["lat"], n["lng"] = old["lat"], old["lng"]
        rows[n["id"]] = {**old, **n}

    for r in permits_raw or []:
        counts["permits_in"] += 1
        n = normalize_permit(r, pulled)
        if n:
            merge(n)
            counts["permits_kept"] += 1
    for m in mail or []:
        counts["mail_in"] += 1
        got = parse_flex_alert(m)
        if not got:
            counts["mail_unparsed"] += 1
            unparsed.append({"subject": m.get("subject", ""), "date": (m.get("date_iso") or "")[:10]})
        for n in got:
            merge(n)
            counts["mail_rows"] += 1
    need = [r for r in rows.values() if r.get("lat") is None and r.get("address")]
    if need:
        geocoder = geocoder or geo.census_batch_geocode
        res = geocoder([{"id": r["id"], "street": r["address"], "city": r.get("city", ""), "state": r.get("state", "LA"), "zip": r.get("zip", "")} for r in need])
        for r in need:
            g = res.get(r["id"], {"status": "no_match"})
            if g["status"] == "match":
                r["lat"], r["lng"] = g["lat"], g["lng"]
                counts["geocoded"] += 1
            else:
                counts["geocode_failed"] += 1
    cutoff = (as_of - timedelta(days=days * 2)).isoformat()
    kept = []
    for r in rows.values():
        if (r.get("date") or "") < cutoff:
            counts["dropped_old"] += 1
            continue
        r["farm"] = geo.farm_for(r.get("lat"), r.get("lng"), farms) if farms else ""
        kept.append(r)
    kept.sort(key=lambda r: r.get("date") or "", reverse=True)
    by_type: dict[str, int] = {}
    by_label: dict[str, int] = {}
    by_farm: dict[str, int] = {}
    for r in kept:
        by_type[r["type"]] = by_type.get(r["type"], 0) + 1
        by_label[r.get("label", "")] = by_label.get(r.get("label", ""), 0) + 1
        by_farm[r.get("farm") or "(outside farms)"] = by_farm.get(r.get("farm") or "(outside farms)", 0) + 1
    return {"generated_at": datetime.now().replace(microsecond=0).isoformat(), "as_of": pulled, "window_days": days,
            "sources": [EBR_SOURCE, "Flexmls alert mail to aire@"], "counts": {**counts, "rows": len(kept), "by_type": by_type,
                                                                                "by_label": by_label, "by_farm": by_farm},
            "unparsed_mail": unparsed, "rows": kept}


# ------------------------------------------------------------------ tests


def run_tests() -> int:
    fails = []

    def check(name, cond):
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            fails.append(name)

    fx = HERE / "tests" / "fixtures"
    permits = json.loads((fx / "ebr-permits-sample.json").read_text())
    mail = json.loads((fx / "flex-alert.json").read_text())
    farms = geo.load_farms(geo.FARMS_EXAMPLE)
    as_of = date(2026, 10, 27)
    check("permit labels from the live type names", permit_label("Re-Roof (R)") == "roof" and permit_label("New Building Permit (R)") == "new build"
          and permit_label("Occupancy Permit (R)") == "moved in" and permit_label("Existing Bldg - Remodel Only (R)") == "remodel"
          and permit_label("Gas Test Permit (R)") == "minor" and permit_label("Something Else") == "other")
    n = normalize_permit(permits[0], "2026-10-27")
    check("permit row carries id, label, title-cased address, value, coordinates and source", n["id"] == "permit:900001" and n["label"] == "roof"
          and n["address"] == "2135 Fixture Oaks Dr" and n["city"] == "Baton Rouge" and n["value"] == 16781 and n["lat"] == 30.4682 and n["source"].startswith("EBR permits"))
    check("permit with no street is dropped", normalize_permit({"permitid": "1"}, "x") is None)
    check("permit with a bad value still normalizes", normalize_permit({**permits[0], "projectvalue": "n/a"}, "x")["value"] == 0)
    got = parse_flex_alert(mail[0])
    check("flex alert yields one row per listing with event, price and address", len(got) == 3
          and {g["type"] for g in got} == {"new_listing", "price_change", "pending"}
          and next(g for g in got if g["type"] == "new_listing")["price"] == 325000
          and next(g for g in got if g["type"] == "new_listing")["address"] == "4401 Fixture Lake Dr")
    pc = next(g for g in got if g["type"] == "price_change")
    check("price change carries the new price and the old one", pc["price"] == 279900 and pc["price_was"] == 289900)
    check("flex row id includes the MLS number when present", any(g["id"].startswith("mls:new_listing:2026") for g in got))
    check("mail with no address yields nothing", parse_flex_alert({"subject": "Your weekly Flexmls digest", "body": "Nothing here", "date_iso": "2026-10-27"}) == [])
    calls = []
    def fake_geocoder(items):
        calls.append(items)
        return {i["id"]: {"status": "match", "lat": 30.43, "lng": -91.12} for i in items}
    out = pull(14, permits, mail, farms, existing=[{"id": "permit:old", "type": "permit", "date": "2026-09-01", "address": "1 Old St", "lat": 30.0, "lng": -91.0}], as_of=as_of, geocoder=fake_geocoder)
    check("pull keeps every permit and every mail row, drops rows older than twice the window",
          out["counts"]["permits_kept"] == len(permits) and out["counts"]["mail_rows"] == 3 and out["counts"]["dropped_old"] == 1
          and all(r["id"] != "permit:old" for r in out["rows"]))
    check("pull geocodes only the rows without coordinates (3 mail rows plus the one permit with none)",
          len(calls) == 1 and {i["id"] for i in calls[0]} == {g["id"] for g in got} | {"permit:900005"} and out["counts"]["geocoded"] == 4)
    check("pull tags farms", any(r["farm"] == "example-square" for r in out["rows"]) and out["counts"]["by_farm"].get("example-square", 0) >= 3)
    check("unparsed mail is reported by subject", out["counts"]["mail_unparsed"] == 1 and out["unparsed_mail"][0]["subject"] == "Flexmls: your saved search settings")
    check("rows sort newest first", [r["date"] for r in out["rows"]] == sorted((r["date"] for r in out["rows"]), reverse=True))
    out2 = pull(14, permits, mail, farms, existing=out["rows"], as_of=as_of, geocoder=fake_geocoder)
    check("pull is idempotent on its own output", out2["counts"]["rows"] == out["counts"]["rows"] and len(calls) == 1)
    check("output is json", json.dumps(out) is not None)
    print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


# -------------------------------------------------------------------- cli


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--test", action="store_true")
    sub = ap.add_subparsers(dest="cmd")
    p = sub.add_parser("pull")
    p.add_argument("--days", type=int, default=14)
    p.add_argument("--write", action="store_true", help="write the cache. Without it: dry run, counts only")
    p.add_argument("--out", default=str(CACHE))
    p.add_argument("--farms", default=str(geo.FARMS_LOCAL))
    p.add_argument("--permits", help="saved SODA JSON instead of the live query")
    p.add_argument("--mail", help="saved messages JSON instead of Gmail")
    p.add_argument("--no-permits", action="store_true")
    p.add_argument("--no-mail", action="store_true", help="skip Gmail (no token in the cloud)")
    p.add_argument("--all-permits", action="store_true", help="commercial too, not only designation Residential")
    p.add_argument("--as-of")
    a = ap.parse_args(argv)
    if a.test:
        return run_tests()
    if a.cmd != "pull":
        ap.print_help(); return 0
    as_of = date.fromisoformat(a.as_of) if a.as_of else date.today()
    permits = None
    if not a.no_permits:
        permits = json.loads(Path(a.permits).read_text()) if a.permits else fetch_permits(a.days, not a.all_permits, as_of)
    mail = None
    if not a.no_mail:
        mail = json.loads(Path(a.mail).read_text()) if a.mail else flex_messages(a.days)
    farms = geo.load_farms(Path(a.farms))
    out_path = Path(a.out)
    existing = json.loads(out_path.read_text()).get("rows", []) if out_path.exists() else []
    out = pull(a.days, permits, mail, farms, existing=existing, as_of=as_of)
    c = out["counts"]
    print(f"{'WRITE' if a.write else 'DRY RUN'} as of {out['as_of']}, last {a.days} days: {c['rows']} rows "
          f"(permits in {c['permits_in']}, kept {c['permits_kept']}; mail in {c['mail_in']}, rows {c['mail_rows']}, unparsed {c['mail_unparsed']}; "
          f"geocoded {c['geocoded']}, failed {c['geocode_failed']}; dropped old {c['dropped_old']})")
    print("  by type:  " + ", ".join(f"{k} {v}" for k, v in sorted(c["by_type"].items())))
    print("  by label: " + ", ".join(f"{k} {v}" for k, v in sorted(c["by_label"].items(), key=lambda kv: -kv[1])))
    print("  by farm:  " + ", ".join(f"{k} {v}" for k, v in sorted(c["by_farm"].items())) + ("" if farms else "  (no farms.local.json yet)"))
    for u in out["unparsed_mail"][:10]:
        print(f"  unparsed mail {u['date']}: {u['subject'][:80]}")
    if a.write:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out, indent=1, ensure_ascii=False))
        print(f"wrote {out_path}")
    else:
        print("nothing written (pass --write)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
