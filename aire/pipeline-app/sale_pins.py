"""Closed-sale roofs for Home Ground: address-only pins from the sales record, labeled as sales, linked to nobody.

Rows come from out/cc/sales.json (live) or the made-up fixtures/cc/sales.json (demo). Residential Lease rows are skipped.
Each usable address is geocoded once through the free Census helper in aire/map-crm/geo.py and the answer is kept in a
Pipeline-side cache (default ~/.aire/enrichment/closed-sales-geo.json, never in git), keyed by address_key. A key already
in the cache is never sent again. A tie or no match stays unpinned: nothing is guessed. This module never calls
crm.geocode() and never writes the Geo tab or any sheet. Tests inject a fake geocoder and a temp cache path.
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _geo():
    if "map_crm_geo" in sys.modules:
        return sys.modules["map_crm_geo"]
    spec = importlib.util.spec_from_file_location("map_crm_geo", HERE.parent / "map-crm" / "geo.py")
    m = importlib.util.module_from_spec(spec)
    sys.modules["map_crm_geo"] = m
    spec.loader.exec_module(m)
    return m


def default_cache_path() -> Path:
    """Live use only. Tests and the demo pass their own path."""
    return Path(os.path.expanduser("~/.aire/enrichment/closed-sales-geo.json"))


def is_lease(row: dict) -> bool:
    return "lease" in str(row.get("type") or "").lower()


def _loose_tail(street: str) -> tuple[str, str, str]:
    """When a sale row has no commas ('12 Fixture Row Baton Rouge 70801'), pull a trailing ZIP (and optional LA)
    off the end so usable_address can see the zip. The leftover stays the street; we do not guess a city."""
    import re
    m = re.search(r"^(.*?)\s+(?:(LA)\s+)?(\d{5}(?:-\d{4})?)\s*$", street or "", re.I)
    if not m:
        return street, "", ""
    return m.group(1).strip(), (m.group(2) or "").upper(), m.group(3)


def _parts(row: dict, geo) -> tuple[str, str, str, str]:
    street, city, state, zip_ = geo.split_address(str(row.get("address") or ""))
    city = city or str(row.get("city") or "").strip()
    state = state or str(row.get("state") or "").strip()
    zip_ = zip_ or str(row.get("zip") or "").strip()
    if street and not city and not zip_:
        street, st2, zip_ = _loose_tail(street)
        state = state or st2
    if zip_ and not state:
        state = "LA"
    return street, city, state, zip_


def read_cache(path: Path | None) -> dict:
    try:
        d = json.loads(Path(path).read_text(encoding="utf-8")) if path else {}
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def write_cache(path: Path, cache: dict) -> None:
    """Directory 0700, file 0600, replaced in one step."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".sales-geo-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=1, sort_keys=True)
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def resolve(rows: list[dict], cache_path: Path | None, geocoder=None, now: datetime | None = None) -> tuple[dict, dict]:
    """Returns (cache, counts). `geocoder(items) -> {id: {status, lat, lng, matched}}` takes [{id, street, city, state, zip}]
    and is called only with keys the cache has not seen. geocoder=None means cache only: nothing is sent anywhere.
    A geocoder that raises leaves those keys uncached so the next build tries again."""
    geo = _geo()
    cache = read_cache(cache_path)
    counts = {"rows": len(rows), "leases_skipped": 0, "unusable": 0, "cached": 0, "sent": 0, "matched": 0, "misses": 0}
    todo: dict[str, dict] = {}
    for r in rows:
        if is_lease(r):
            counts["leases_skipped"] += 1
            continue
        street, city, state, zip_ = _parts(r, geo)
        key = geo.address_key(street, city, state, zip_)
        if key in cache:
            counts["cached"] += 1
        elif geo.usable_address(street, city, zip_):
            todo.setdefault(key, {"id": key, "street": street, "city": city, "state": state, "zip": zip_})
        else:
            counts["unusable"] += 1
    if todo and geocoder is not None:
        try:
            got = geocoder(list(todo.values())) or {}
        except Exception as e:  # network down: nothing cached, nothing pinned from these, try next build
            counts["error"] = type(e).__name__
            got = {}
        stamp = (now or datetime.now(timezone.utc)).isoformat(timespec="seconds")
        for key in todo:
            if key not in got:
                continue
            g = got[key]
            ok = g.get("status") == "match" and g.get("lat") is not None and g.get("lng") is not None
            cache[key] = {"lat": g["lat"] if ok else None, "lng": g["lng"] if ok else None,
                          "match": "match" if ok else ("tie" if g.get("status") == "tie" else "no_match"), "geocoded_at": stamp}
            counts["sent"] += 1
        if counts["sent"] and cache_path:
            write_cache(cache_path, cache)
    return cache, counts


def build(rows: list[dict], cache_path: Path | None, geocoder=None, now: datetime | None = None) -> tuple[list[dict], dict]:
    """The sale pins and counts only (counts carry no addresses)."""
    geo = _geo()
    cache, counts = resolve(rows, cache_path, geocoder, now)
    pins, seen = [], set()
    for r in rows:
        if is_lease(r):
            continue
        street, city, state, zip_ = _parts(r, geo)
        key = geo.address_key(street, city, state, zip_)
        c = cache.get(key)
        if not c or c.get("match") != "match" or c.get("lat") is None or c.get("lng") is None:
            if c:
                counts["misses"] += 1
            continue
        close = str(r.get("close") or "")[:10]
        pk = f"sale:{key}|{close}"
        if pk in seen:
            continue
        seen.add(pk)
        pins.append({"key": pk, "kind": "sale", "person_id": None, "sale": True, "display": "", "type": "sale", "stage": "past client",
                     "label": "Closed sale, not linked to a person", "lat": c["lat"], "lng": c["lng"], "address": street, "city": city, "zip": zip_,
                     "close": close, "year": close[:4], "side": str(r.get("side") or ""), "price": r.get("price"), "sale_type": str(r.get("type") or "")})
    counts["matched"] = len(pins)
    return pins, counts


def census_geocoder(items: list[dict]) -> dict:
    """The free Census batch helper. Live serve only; no test or demo passes this."""
    return _geo().census_batch_geocode(items)
