"""Closed-sale roofs: made-up streets only, a fake geocoder, a temp cache. Never calls Census, never writes ~/.aire/.
Run: python3 aire/pipeline-app/sale_pins_test.py"""
import json
import os
import socket
import stat
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import sale_pins  # noqa: E402

bad = []


def check(cond, name):
    print(("ok   " if cond else "FAIL ") + name)
    if not cond:
        bad.append(name)


def row(addr, typ="Residential", close="2025-06-10", side="Buyer", price=200000):
    return {"address": addr, "type": typ, "close": close, "side": side, "price": price}


ROWS = [row("12 Fixture Row, Baton Rouge, LA 70801"), row("40 Example Lane, Baton Rouge, LA 70802", typ="Land", side="Listing"),
        row("7 Sample Way, Zachary, LA 70791", typ=""), row("9 Demo Court, Baton Rouge, LA 70803", typ="Residential Lease"),
        row("21 Tie Street, Baton Rouge, LA 70804"), row("33 Nomatch Road, Baton Rouge, LA 70805")]

sent = []


def fake(items):
    sent.append([i["id"] for i in items])
    out = {}
    for i in items:
        if i["street"].startswith("21 "):
            out[i["id"]] = {"status": "tie", "lat": None, "lng": None, "matched": ""}
        elif i["street"].startswith("33 "):
            out[i["id"]] = {"status": "no_match", "lat": None, "lng": None, "matched": ""}
        else:
            out[i["id"]] = {"status": "match", "lat": 30.4 + len(sent) / 100 + int(i["street"].split()[0]) / 10000, "lng": -91.1, "matched": i["street"]}
    return out


home = os.path.expanduser("~/.aire")
before = sorted(os.listdir(home)) if os.path.isdir(home) else None
with tempfile.TemporaryDirectory() as tmp:
    cache = Path(tmp) / "enrichment" / "closed-sales-geo.json"
    check(not str(cache).startswith(home) and not str(cache).startswith(str(HERE.parent.parent)), "the test cache is a temp path, not ~/.aire and not the repo")
    pins, counts = sale_pins.build(ROWS, cache, fake)
    ids = [i for batch in sent for i in batch]
    check(counts["leases_skipped"] == 1 and not any("demo court" in i for i in ids), "a Residential Lease is skipped and never sent")
    check(len(ids) == 5, "Residential, Land and blank-type sales are all considered")
    check(len(pins) == 3 and all(p["kind"] == "sale" and not p["person_id"] and p["lat"] and p["lng"] for p in pins), "matches become kind=sale pins with coordinates and no person_id")
    check(all(p["type"] == "sale" and p["stage"] == "past client" and p["sale"] is True and p["display"] == "" for p in pins), "a sale pin is flagged as a sale with no display name")
    check({p["address"] for p in pins} == {"12 Fixture Row", "40 Example Lane", "7 Sample Way"} and pins[0]["year"] == "2025" and pins[0]["side"] == "Buyer", "pins carry the street, close year and side")
    check(counts["misses"] == 2 and counts["matched"] == 3, "a tie and a no_match are recorded as misses and get no pin")
    c = json.loads(cache.read_text())
    check(all(c[k]["lat"] is None and c[k]["lng"] is None for k in c if c[k]["match"] != "match") and {c[k]["match"] for k in c} == {"match", "tie", "no_match"}, "misses are cached with no coordinates, nothing guessed")
    check(all({"lat", "lng", "match", "geocoded_at"} <= set(v) for v in c.values()) and all("|" in k for k in c), "the cache is keyed by address_key and holds lat, lng, match, geocoded_at")
    check(stat.S_IMODE(cache.stat().st_mode) == 0o600 and stat.S_IMODE(cache.parent.stat().st_mode) == 0o700, "the cache file is 0600 and its folder 0700")
    n = len(sent)
    pins2, counts2 = sale_pins.build(ROWS, cache, fake)
    check(len(sent) == n and len(pins2) == 3 and counts2["cached"] == 5 and counts2["sent"] == 0, "a second build sends nothing: cached keys are not re-sent, misses included")
    pins2[0]["lat"] += 0  # same coordinates come back from the cache
    check([p["lat"] for p in pins2] == [p["lat"] for p in pins], "cached coordinates are reused unchanged")
    sale_pins.build(ROWS + [row("55 Changed Street, Baton Rouge, LA 70806")], cache, fake)
    check(len(sent) == n + 1 and sent[-1] == ["55 changed street|baton rouge|la|70806"], "a new address_key is sent, and only that one")
    sale_pins.build([row("12 Fixture Row, Baton Rouge, LA 70809")], cache, fake)
    check(len(sent) == n + 2 and sent[-1][0].endswith("|70809"), "a changed address_key is sent again")
    only, oc = sale_pins.build(ROWS[:1], Path(tmp) / "none.json", None)
    check(only == [] and not (Path(tmp) / "none.json").exists(), "no geocoder means nothing is sent and no cache is written")

    def boom(items):
        raise OSError("network down")
    p3, c3 = sale_pins.build([row("77 Boom Street, Baton Rouge, LA 70801")], Path(tmp) / "b.json", boom)
    check(p3 == [] and c3.get("error") == "OSError" and not (Path(tmp) / "b.json").exists(), "a geocoder failure pins nothing and caches nothing, so the next build retries")
    p4, c4 = sale_pins.build([row("5 No City Rd")], Path(tmp) / "u.json", fake)
    check(p4 == [] and c4["unusable"] == 1, "a street with no city or zip is not sent to the geocoder")
    # Live sales often have no commas: "12 Fixture Row Baton Rouge 70801". A trailing ZIP (and optional LA) is enough.
    n2 = len(sent)
    loose = [row("18 Loose Lane Fixture 70807"), row("19 Loose Court LA 70808")]
    pl, cl = sale_pins.build(loose, Path(tmp) / "loose.json", fake)
    check(cl["unusable"] == 0 and len(pl) == 2 and all(p["kind"] == "sale" for p in pl), "a no-comma address with a trailing ZIP is usable and can pin")
    check(len(sent) == n2 + 1 and sent[-1][0].endswith("|70807") and any(i.endswith("|70808") for i in sent[-1]), "the trailing ZIP is sent as the zip, not left stuck on the street")
    check({p["address"] for p in pl} == {"18 Loose Lane Fixture", "19 Loose Court"}, "the ZIP and optional LA are stripped off the street")

# The demo: made-up sales, the fixture cache, no geocoder, no ~/.aire/.
import app  # noqa: E402
sock = socket.socket
socket.socket = lambda *a, **k: (_ for _ in ()).throw(AssertionError("network used"))
try:
    s = app.State(demo=True, send_log=Path(tempfile.mkdtemp(prefix="sale-demo-")) / "send-log.json")
    check(s.sale_geocoder is None and s.sale_cache_path == app.FIXTURES / "sale-geo.json", "demo has no geocoder and reads the made-up fixture cache")
    dp, dc = s.sale_roofs()
    check(len(dp) == 8 and dc["leases_skipped"] == 1 and dc["misses"] == 1 and all(p["kind"] == "sale" for p in dp), "demo sales: 10 rows, 1 lease skipped, 1 unmatched, 8 roofs")
    snap = s.snapshot()
    check(sum(1 for p in snap["feed"]["map"]["pins"] if p.get("kind") == "sale") == 8 and snap["feed"]["map"]["counts"]["sales"] == 8
          and snap["feed"]["map"]["counts"]["persons"] > 0, "the demo map payload carries the sale pins beside the people pins")
    check(sum(1 for p in snap["feed"]["map"]["pins"] if p.get("kind") == "deal") == sum(1 for p in app.read_json(s.paths["feed"], {})["map"]["pins"] if p.get("kind") == "deal"), "live deal pins are untouched and stay kind=deal")
    live = app.State(demo=False)
    check(live.sale_geocoder is None and live.sale_cache_path == sale_pins.default_cache_path(), "a bare live State has no geocoder: only serve() turns Census on")
    # A confirmed sale link (injected, synthetic) puts the person on the pin; every other sale stays unlinked.
    with tempfile.TemporaryDirectory() as tmp2:
        c2 = Path(tmp2) / "geo.json"
        lrows = ROWS[:2]
        link = lambda r: "9001" if r["address"].startswith("12 ") else ("9999" if r["address"].startswith("40 ") else None)
        lp, _ = sale_pins.build(lrows, c2, fake, linked=link, people={"9001": "Pretend Person"})
        by = {p["address"]: p for p in lp}
        check(by["12 Fixture Row"]["person_id"] == "9001" and by["12 Fixture Row"]["display"] == "Pretend Person" and by["12 Fixture Row"]["sale"] is True and by["12 Fixture Row"]["kind"] == "sale"
              and by["12 Fixture Row"]["label"] != "Closed sale, not linked to a person" and "Pretend" not in by["12 Fixture Row"]["label"], "a linked sale pin carries person_id and display, a clear label, and is still a sale")
        check(by["40 Example Lane"]["person_id"] is None and by["40 Example Lane"]["display"] == "" and by["40 Example Lane"]["label"] == "Closed sale, not linked to a person",
              "a link to someone no longer in the feed leaves the pin unlinked")
        up, _ = sale_pins.build(lrows, c2, None)
        check(all(p["person_id"] is None and p["label"] == "Closed sale, not linked to a person" for p in up), "no links given: pins are unlinked as before")
finally:
    socket.socket = sock
after = sorted(os.listdir(home)) if os.path.isdir(home) else None
check(before == after, "nothing was written under ~/.aire/")

print(f"\n{'FAILED: ' + str(len(bad)) if bad else 'sale_pins_test: all passed'}")
sys.exit(1 if bad else 0)
