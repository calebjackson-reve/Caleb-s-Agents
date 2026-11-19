#!/usr/bin/env python3
"""
Pure geography helpers shared by aire/crm/crm.py (geocode, map feed) and aire/map-crm/monitor.py.
No Google, no network, except census_batch_geocode which calls the Census Bureau geocoder.

Nothing here writes anywhere.
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
FARMS_LOCAL = HERE / "farms.local.json"
FARMS_EXAMPLE = HERE / "farms.example.json"

CENSUS_BATCH_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"
CENSUS_BENCHMARK = "Public_AR_Current"
CENSUS_CHUNK = 2000  # the service takes up to 10,000 per file; smaller files finish faster and fail smaller


# ------------------------------------------------------------- addresses


def address_key(street: str, city: str = "", state: str = "", zip_: str = "") -> str:
    """One string that changes only when the address does: '2135 shady oaks dr|baton rouge|la|70815'."""
    def n(s: str) -> str:
        return re.sub(r"\s+", " ", (s or "").strip().lower())
    return "|".join([n(street), n(city), n(state), n(str(zip_))[:5]])


def usable_address(street: str, city: str = "", zip_: str = "") -> bool:
    """A street that starts with a number plus a city or a zip. Anything less is not sent to a geocoder."""
    street = (street or "").strip()
    return bool(re.match(r"^\d", street)) and bool((city or "").strip() or re.match(r"^\d{5}", (zip_ or "").strip()))


def split_address(full: str) -> tuple[str, str, str, str]:
    """'2179 S Turnberry Ave, Baton Rouge, LA 70810' -> (street, city, state, zip). Missing parts are ''."""
    parts = [p.strip() for p in (full or "").split(",")]
    street = parts[0] if parts else ""
    city = parts[1] if len(parts) > 1 else ""
    state, zip_ = "", ""
    if len(parts) > 2:
        m = re.match(r"^([A-Za-z]{2})?\s*(\d{5})?", parts[2])
        state, zip_ = (m.group(1) or ""), (m.group(2) or "") if m else ("", "")
    return street, city, state, zip_


# ------------------------------------------------------------- geometry


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 3958.7613
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def point_in_polygon(lat: float, lng: float, polygon: list[list[float]]) -> bool:
    """Ray casting. polygon is [[lat, lng], ...], closed automatically."""
    inside = False
    n = len(polygon)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i][0], polygon[i][1]
        yj, xj = polygon[j][0], polygon[j][1]
        if (yi > lat) != (yj > lat):
            x_cross = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lng < x_cross:
                inside = not inside
        j = i
    return inside


def load_farms(path: Path | None = None) -> list[dict]:
    """farms.local.json when it exists, else []. The example file is never loaded by default:
    its square is made up and would tag real rows with a fake farm."""
    path = path or FARMS_LOCAL
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    farms = data.get("farms", data) if isinstance(data, dict) else data
    out = []
    for f in farms:
        poly = f.get("polygon") or []
        if len(poly) >= 3 and f.get("id"):
            out.append({"id": f["id"], "name": f.get("name", f["id"]), "polygon": [[float(a), float(b)] for a, b in poly]})
    return out


def farm_for(lat: float | None, lng: float | None, farms: list[dict]) -> str:
    if lat is None or lng is None:
        return ""
    for f in farms:
        if point_in_polygon(lat, lng, f["polygon"]):
            return f["id"]
    return ""


def nearest(lat: float, lng: float, points: list[dict], limit_miles: float = 2.0) -> dict:
    """Closest of `points` (each with lat, lng as floats) within limit_miles, or {}. Brute force is fine
    for a few thousand points per row; the feed runs once a day."""
    best, best_d = None, limit_miles
    for p in points:
        d = haversine_miles(lat, lng, p["lat"], p["lng"])
        if d < best_d:
            best, best_d = p, d
    if not best:
        return {}
    return {**best, "miles": round(best_d, 2)}


# ----------------------------------------------------------- geocoding


TIE_TOLERANCE_MILES = 0.05  # about 80 meters: two spellings of one street at the same point are one place


def census_batch_geocode(items: list[dict], post=None, single=None) -> dict[str, dict]:
    """items: [{id, street, city, state, zip}]. Returns {id: {status, lat, lng, matched}} where status is
    'match', 'tie' or 'no_match'. A batch 'Tie' is looked up once more through the single-address endpoint:
    when every candidate sits within TIE_TOLERANCE_MILES of the first (seen 2026-10-27: '222 St Louis St' and
    '222 Saint Louis St' at the identical point) it is a match; candidates that disagree stay a tie and are
    never pinned. `post` and `single` are injectable for tests; defaults use urllib."""
    out: dict[str, dict] = {}
    post = post or _census_post
    single = single or _census_single
    for i in range(0, len(items), CENSUS_CHUNK):
        chunk = items[i:i + CENSUS_CHUNK]
        buf = io.StringIO()
        w = csv.writer(buf)
        for it in chunk:
            w.writerow([it["id"], it.get("street", ""), it.get("city", ""), it.get("state", ""), it.get("zip", "")])
        text = post(buf.getvalue())
        out.update(parse_census_batch(text))
    by_id = {it["id"]: it for it in items}
    for rid, r in out.items():
        if r["status"] != "tie":
            continue
        it = by_id[rid]
        cands = single(f"{it.get('street', '')}, {it.get('city', '')}, {it.get('state', '')} {it.get('zip', '')}".strip())
        out[rid] = resolve_tie(cands)
    return out


def resolve_tie(cands: list[dict]) -> dict:
    """cands: [{lat, lng, matched}] from the single-address lookup. One place spelled two ways is a match."""
    if not cands:
        return {"status": "tie", "lat": None, "lng": None, "matched": "", "exact": False}
    first = cands[0]
    if all(haversine_miles(first["lat"], first["lng"], c["lat"], c["lng"]) <= TIE_TOLERANCE_MILES for c in cands[1:]):
        return {"status": "match", "lat": round(first["lat"], 6), "lng": round(first["lng"], 6), "matched": first.get("matched", ""), "exact": False}
    return {"status": "tie", "lat": None, "lng": None, "matched": "", "exact": False}


def _census_single(address: str) -> list[dict]:
    import urllib.parse
    import urllib.request
    q = urllib.parse.urlencode({"address": address, "benchmark": CENSUS_BENCHMARK, "format": "json"})
    req = urllib.request.Request(f"https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?{q}",
                                 headers={"User-Agent": "aire-crm-geocode/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8", "ignore"))
    return [{"lat": m["coordinates"]["y"], "lng": m["coordinates"]["x"], "matched": m.get("matchedAddress", "")}
            for m in data.get("result", {}).get("addressMatches", [])]


def parse_census_batch(text: str) -> dict[str, dict]:
    """The batch response is CSV: id, input, Match|Tie|No_Match, Exact|Non_Exact, matched address, 'lng,lat', tiger id, side."""
    out: dict[str, dict] = {}
    for row in csv.reader(io.StringIO(text)):
        if len(row) < 3:
            continue
        rid, status = row[0], row[2].strip().lower()
        if status == "match" and len(row) >= 6 and "," in row[5]:
            lng_s, lat_s = row[5].split(",", 1)
            out[rid] = {"status": "match", "lat": round(float(lat_s), 6), "lng": round(float(lng_s), 6),
                        "matched": row[4], "exact": row[3].strip().lower() == "exact"}
        elif status == "tie":
            out[rid] = {"status": "tie", "lat": None, "lng": None, "matched": "", "exact": False}
        else:
            out[rid] = {"status": "no_match", "lat": None, "lng": None, "matched": "", "exact": False}
    return out


def _census_post(csv_text: str) -> str:
    import urllib.request
    boundary = "----aire-geocode-boundary"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"benchmark\"\r\n\r\n{CENSUS_BENCHMARK}\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"addressFile\"; filename=\"addresses.csv\"\r\n"
        f"Content-Type: text/csv\r\n\r\n{csv_text}\r\n--{boundary}--\r\n"
    ).encode()
    req = urllib.request.Request(CENSUS_BATCH_URL, data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}",
                                          "User-Agent": "aire-crm-geocode/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read().decode("utf-8", "ignore")


# ------------------------------------------------------------------ tests


def run_tests() -> int:
    fails = []

    def check(name, cond):
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            fails.append(name)

    sq = [[30.45, -91.15], [30.45, -91.10], [30.42, -91.10], [30.42, -91.15]]
    check("point inside the square", point_in_polygon(30.43, -91.12, sq))
    check("point outside the square", not point_in_polygon(30.46, -91.12, sq) and not point_in_polygon(30.43, -91.09, sq))
    check("two-point polygon is never inside", not point_in_polygon(30.43, -91.12, sq[:2]))
    # Baton Rouge city hall to the state capitol is about 0.6 miles (hand checked on a map).
    d = haversine_miles(30.4457, -91.1876, 30.4571, -91.1875)
    check("haversine within a tenth of a mile of the hand check", 0.7 <= d <= 0.9)
    check("haversine zero for the same point", haversine_miles(30.0, -91.0, 30.0, -91.0) == 0)
    d2 = haversine_miles(30.0, -91.0, 31.0, -91.0)
    check("one degree of latitude is about 69 miles", 68.5 <= d2 <= 69.5)
    pts = [{"id": "a", "lat": 30.4457, "lng": -91.1876}, {"id": "b", "lat": 30.4571, "lng": -91.1875}]
    check("nearest picks the closer point with miles", nearest(30.4460, -91.1876, pts)["id"] == "a" and nearest(30.4460, -91.1876, pts)["miles"] < 0.1)
    check("nearest is empty past the limit", nearest(31.5, -91.1876, pts) == {})
    farms = [{"id": "sq", "name": "Square", "polygon": sq}]
    check("farm_for tags inside and blanks outside", farm_for(30.43, -91.12, farms) == "sq" and farm_for(30.5, -91.12, farms) == "" and farm_for(None, None, farms) == "")
    check("address_key is case and space insensitive", address_key(" 2135  Shady Oaks DR", "Baton Rouge", "LA", "70815") == address_key("2135 shady oaks dr", "baton rouge", "la", 70815))
    check("usable_address needs a number and a city or zip", usable_address("12 Oak Ln", "Zachary") and usable_address("12 Oak Ln", "", "70791")
          and not usable_address("Oak Ln", "Zachary") and not usable_address("12 Oak Ln"))
    check("split_address", split_address("2179 S Turnberry Ave, Baton Rouge, LA 70810") == ("2179 S Turnberry Ave", "Baton Rouge", "LA", "70810")
          and split_address("9241 Pecan Tree Drive") == ("9241 Pecan Tree Drive", "", "", ""))
    sample = ('"1","222 St Louis St, Baton Rouge, LA, 70802","Match","Exact","222 ST LOUIS ST, BATON ROUGE, LA, 70802","-91.187641679234,30.445670344722","12345","L"\n'
              '"2","1 Nowhere Fake Rd, Baton Rouge, LA, 70801","No_Match"\n'
              '"3","1 Twin Rd, Baton Rouge, LA, 70801","Tie"\n')
    p = parse_census_batch(sample)
    check("census match parses lng,lat into lat and lng", p["1"]["status"] == "match" and p["1"]["lat"] == 30.44567 and p["1"]["lng"] == -91.187642)
    check("census no_match and tie carry no coordinates", p["2"]["status"] == "no_match" and p["3"]["status"] == "tie" and p["3"]["lat"] is None)
    calls = []
    def fake_post(text):
        calls.append(text)
        return "".join(f'"{r.split(",")[0]}","x","Match","Exact","X","-91.1,30.4","1","L"\n' for r in text.strip().splitlines())
    items = [{"id": str(i), "street": f"{i} Fixture St", "city": "Zachary", "state": "LA", "zip": "70791"} for i in range(CENSUS_CHUNK + 5)]
    res = census_batch_geocode(items, post=fake_post, single=lambda a: [])
    check("batch geocode chunks the file and keeps every id", len(calls) == 2 and len(res) == CENSUS_CHUNK + 5)
    same = [{"lat": 30.44567, "lng": -91.18764, "matched": "A"}, {"lat": 30.44567, "lng": -91.18764, "matched": "B"}]
    apart = [{"lat": 30.44567, "lng": -91.18764, "matched": "A"}, {"lat": 30.46, "lng": -91.18764, "matched": "B"}]
    check("a tie whose candidates sit on one point is a match", resolve_tie(same)["status"] == "match" and resolve_tie(same)["lat"] == 30.44567)
    check("a tie whose candidates disagree stays a tie, no coordinates", resolve_tie(apart)["status"] == "tie" and resolve_tie(apart)["lat"] is None)
    check("a tie with no single-lookup candidates stays a tie", resolve_tie([])["status"] == "tie")
    tie_post = lambda text: '"9","x","Tie"\n'
    r9 = census_batch_geocode([{"id": "9", "street": "9 Twin St", "city": "Zachary", "state": "LA", "zip": "70791"}], post=tie_post, single=lambda a: same)
    check("batch ties are resolved through the single lookup", r9["9"]["status"] == "match")
    check("example farms file is not loaded by default", load_farms(HERE / "does-not-exist.json") == [])
    ex = load_farms(FARMS_EXAMPLE)
    check("example farms file parses", len(ex) == 1 and ex[0]["id"] == "example-square" and len(ex[0]["polygon"]) == 4)
    print(f"\n{'ALL PASS' if not fails else str(len(fails)) + ' FAILED'}")
    return 1 if fails else 0


if __name__ == "__main__":
    import sys
    sys.exit(run_tests())
