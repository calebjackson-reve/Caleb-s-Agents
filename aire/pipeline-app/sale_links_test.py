"""Who was this sale? Made-up sales, matches and people only; temp paths; never reads or writes ~/.aire/.
Run: python3 aire/pipeline-app/sale_links_test.py"""
import json
import os
import stat
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import sale_links as SL  # noqa: E402
import sale_pins  # noqa: E402

bad = []


def check(cond, name):
    print(("ok   " if cond else "FAIL ") + name)
    if not cond:
        bad.append(name)


def sale(addr, close="2025-06-10", side="Buyer", typ="Residential"):
    return {"address": addr, "close": close, "side": side, "price": 1, "type": typ}


ROWS = [sale("12 Fixture Row, Baton Rouge, LA 70801"), sale("40 Example Lane, Baton Rouge, LA 70802", "2025-08-01", "Listing"),
        sale("9 Demo Court, Baton Rouge, LA 70803", typ="Residential Lease"), sale("7 Sample Way, Zachary, LA 70791", "2024-03-03"),
        sale("12 Fixture Row, Baton Rouge, LA 70801")]  # a repeat of the first row
MATCHES = {"rows": [
    {"mls": "TEST1", "address": "12 Fixture Row", "city": "Baton Rouge", "zip": "70801", "close_date": "2025-06-10", "side": "buy", "owner_names": ["Pretend Owner"],
     "prior_owner_names": [], "tier": "high", "matched_contact_person_id": "9001", "matches": [{"person_id": "9001", "tier": "high"}]},
    {"mls": "TEST2", "address": "40 Example Lane", "city": "Baton Rouge", "zip": "70802", "close_date": "2025-08-02", "owner_names": ["Mock Owner"],
     "tier": "low", "matched_contact_person_id": "9002", "matches": []},
    {"mls": "TEST3", "address": "7 Sample Way", "city": "Zachary", "zip": "70791", "close_date": "2024-03-03", "owner_names": ["Tester Owner"],
     "tier": "low", "matched_contact_person_id": "9404", "matches": []}]}
PEOPLE = {"9001": "Pretend Person", "9002": "Mock Person", "9003": "Demo Person"}

home = os.path.expanduser("~/.aire")
before = sorted(os.listdir(home)) if os.path.isdir(home) else None
with tempfile.TemporaryDirectory() as tmp:
    mpath, lpath = Path(tmp) / "m.json", Path(tmp) / "enrichment" / "sale-links.json"
    mpath.write_text(json.dumps(MATCHES))
    check(not str(lpath).startswith(home), "the test paths are temp paths, not ~/.aire")
    check(SL.load_links(lpath) == {"confirmed": [], "skipped": []} and SL.load_links(None) == {"confirmed": [], "skipped": []}, "a missing links file reads as empty")
    check(SL.load_matches(tmp + "/none.json") == [] and len(SL.load_matches(mpath)) == 3, "a missing matches file reads as empty, a real one loads")

    cards = SL.pending(ROWS, SL.load_matches(mpath), SL.load_links(lpath), PEOPLE)
    by = {c["address"]: c for c in cards}
    check(len(cards) == 3 and "9 Demo Court" not in by, "one card per sale: the lease is skipped and the repeat row is folded in")
    c1 = by["12 Fixture Row"]
    check(c1["suggestion"] == {"person_id": "9001", "display": "Pretend Person", "tier": "high"} and c1["owner_names"] == ["Pretend Owner"] and c1["close"] == "2025-06-10" and c1["side"] == "Buyer",
          "an address + close day join gives the owner names and the suggested contact with its tier")
    check(by["40 Example Lane"]["suggestion"] is None and by["40 Example Lane"]["owner_names"] == [], "a different close day does not join, so no suggestion")
    check(by["7 Sample Way"]["suggestion"] is None and by["7 Sample Way"]["owner_names"] == ["Tester Owner"], "a suggested person who is not in the feed is not offered")
    check(cards[0]["close"] >= cards[-1]["close"], "newest close first")
    # an MLS number on both sides joins even when the close day differs
    both = SL.pending([{**sale("40 Example Lane, Baton Rouge, LA 70802", "2025-08-01"), "mls": "TEST2"}], SL.load_matches(mpath), SL.load_links(lpath), PEOPLE)
    check(both[0]["suggestion"]["person_id"] == "9002" and both[0]["sale_key"] == "mls:TEST2", "MLS on both sides is the join and the stable key")

    SL.confirm(lpath, ROWS[0], "9001", None)
    d = json.loads(lpath.read_text())
    e = d["confirmed"][0]
    check(set(d) == {"confirmed", "skipped"} and set(e) == {"sale_key", "mls", "address_key", "close", "person_id", "confirmed_at"} and e["person_id"] == "9001" and e["close"] == "2025-06-10",
          "confirm stores the sale key, address key, close day and person, and nothing else")
    check("owner" not in lpath.read_text().lower() and "tier" not in lpath.read_text(), "suggestions and owner names are never written to the links file")
    check(stat.S_IMODE(lpath.stat().st_mode) == 0o600 and stat.S_IMODE(lpath.parent.stat().st_mode) == 0o700 and [p.name for p in lpath.parent.iterdir()] == ["sale-links.json"],
          "the file is 0600, the folder 0700, and no temp file is left behind")
    check(SL.person_for(SL.load_links(lpath), SL.ident(ROWS[4])) == "9001" and SL.resolver(SL.load_links(lpath))(ROWS[1]) is None, "the repeat row resolves to the same person, another sale does not")
    check("12 Fixture Row" not in {c["address"] for c in SL.pending(ROWS, SL.load_matches(mpath), SL.load_links(lpath), PEOPLE)}, "a confirmed sale leaves the Fix list")

    SL.pick(lpath, ROWS[0], "9003")
    d = SL.load_links(lpath)
    check(len(d["confirmed"]) == 1 and d["confirmed"][0]["person_id"] == "9003", "confirming a different person replaces the earlier confirm")
    SL.skip(lpath, ROWS[1])
    d = SL.load_links(lpath)
    check(len(d["skipped"]) == 1 and "skipped_at" in d["skipped"][0] and "40 Example Lane" not in {c["address"] for c in SL.pending(ROWS, [], d, PEOPLE)}, "a skipped sale leaves the Fix list")
    SL.confirm(lpath, ROWS[1], "9002")
    d = SL.load_links(lpath)
    check(d["skipped"] == [] and len(d["confirmed"]) == 2, "confirming a skipped sale clears the skip")
    SL.skip(lpath, ROWS[0])
    d = SL.load_links(lpath)
    check(len(d["confirmed"]) == 1 and len(d["skipped"]) == 1, "skipping a confirmed sale clears the confirm")
    try:
        SL.confirm(lpath, ROWS[0], "")
        check(False, "a blank person is refused")
    except ValueError:
        check(True, "a blank person is refused")

    # The live enrichment file uses a top-level "sales" list and M/D/YYYY close dates.
    sales_doc = Path(tmp) / "sales-owner-matches.json"
    sales_doc.write_text(json.dumps({"sales": [{"mls": "TEST9", "address": "12 Fixture Row", "city": "Baton Rouge", "zip": "70801", "close_date": "6/10/2025",
        "side": "buy", "owner_names": ["Pretend Owner"], "tier": "high", "matched_contact_person_id": "9001", "matches": [{"person_id": "9001", "tier": "high"}]}]}))
    check(len(SL.load_matches(sales_doc)) == 1, "a matches file whose rows sit under sales still loads")
    joined = SL.pending([sale("12 Fixture Row, Baton Rouge, LA 70801", "2025-06-10")], SL.load_matches(sales_doc), SL.load_links(None), PEOPLE)
    check(len(joined) == 1 and joined[0]["suggestion"]["person_id"] == "9001" and joined[0]["close"] == "2025-06-10",
          "a M/D/YYYY close_date joins an ISO sales.json close day")
    # A list-side card shows the prior (seller) names, not the later buyer.
    list_doc = [{"address": "40 Example Lane", "city": "Baton Rouge", "zip": "70802", "close_date": "2025-08-01", "side": "Listing",
                 "owner_names": ["Later Buyer"], "prior_owner_names": ["Pretend Seller"], "tier": "none"}]
    listed = SL.pending([sale("40 Example Lane, Baton Rouge, LA 70802", "2025-08-01", "Listing")], list_doc, {"confirmed": [], "skipped": []}, PEOPLE)
    check(listed[0]["owner_names"] == ["Pretend Seller"], "a list-side card shows the prior owner names")
    badp = Path(tmp) / "enrichment" / "broken-links.json"
    badp.write_text("{not json")
    try:
        SL.confirm(badp, ROWS[2] if False else sale("7 Sample Way, Zachary, LA 70791", "2024-03-03"), "9001")
        check(False, "a links file that cannot be read is not overwritten")
    except ValueError:
        check("{not json" in badp.read_text(), "a links file that cannot be read is not overwritten")

    # sale_pins carries the link
    geo_cache = Path(tmp) / "geo.json"
    key = sale_pins._geo().address_key("12 Fixture Row", "Baton Rouge", "LA", "70801")
    geo_cache.write_text(json.dumps({key: {"lat": 30.4, "lng": -91.1, "match": "match"}}))
    SL.confirm(lpath, ROWS[0], "9001")
    pins, _ = sale_pins.build(ROWS[:1], geo_cache, None, linked=SL.resolver(SL.load_links(lpath)), people=PEOPLE)
    check(len(pins) == 1 and pins[0]["person_id"] == "9001" and pins[0]["display"] == "Pretend Person" and pins[0]["kind"] == "sale" and pins[0]["sale"] is True
          and "Pretend" not in pins[0]["label"] and "linked" in pins[0]["label"], "a confirmed sale pin carries the person and still is a sale")

after = sorted(os.listdir(home)) if os.path.isdir(home) else None
check(before == after, "nothing was written under ~/.aire")
print(f"\n{len(bad)} failure(s)")
sys.exit(1 if bad else 0)
