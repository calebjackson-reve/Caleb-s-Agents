"""What each Pipeline screen says about every deal, gathered the way app.py builds it, and the comparison against the
one deal record (links.records). Used by deal_record_test.py. Reads only: nothing here sends or writes."""
from __future__ import annotations

from datetime import date, datetime

import cc
import insight
import jarvis
import links


def screens(values: list[list], feed: dict, cal: list[dict], sales: list[dict], today: date, now: datetime) -> tuple[list[dict], dict]:
    """What each screen's data says about every deal on the sheet, built the way app.py builds it.
    Returns the records and {screen: {deal key: {field: value}}}. A screen only lists the fields it shows."""
    rows = cc.deal_rows(values)
    cards, crm_only = cc.merge_deals(cc.deal_cards(rows, today, now), feed.get("deals") or [])
    ties = links.tie(cards, feed)
    recs = links.records(cards, ties)
    over, side_of = links.overlay(ties, feed), links.sides(ties)
    shown = links.apply_records(links.apply_overlay(feed, over), recs)   # app.py State.insight: what the Book reads
    browser = links.apply_records(links.apply_sides(links.apply_overlay(feed, over), side_of), recs)  # app.py snapshot
    dl = cc.contract_deadlines(cal, cards)
    out = {k: {} for k in ("Home paydays", "Home deadlines", "Deals page", "Board", "Fix list", "Call list", "Contact card",
                           "Contact card history", "Map pin", "Claude answers", "CRM Deals tab row")}
    for r in cc.closings(dl, cards, today):
        out["Home paydays"].setdefault(cc.deal_key(r["deal"]), {"close": r["day"]})
    for r in dl:
        if "act of sale" in r["what"].lower() and r["from"] != "calendar":
            out["Home deadlines"][r["key"]] = {"close": r["day"]}
    for c in cards:
        out["Deals page"][c["key"]] = {"side": c.get("side") or "", "close": cc.act_day(c), "price": c.get("price"), "status": c["status"],
                                       "open": c["stage"] in links.OPEN and not links.is_expired_offer(c)}
    board = {b["key"] for b in links.board_contract(ties)}
    for t in ties:
        out["Board"][t["key"]] = {"contract": t["key"] in board, "open": t["stage"] in links.OPEN and not t["expired_offer"]}
    expired = {f["ref"] for f in links.fixes(feed, cards, ties, sales) if f["kind"] == "offer"}
    for c in cards:
        out["Fix list"][c["key"]] = {"expired_offer": c["key"] in expired}
    book = insight.Book(shown, rows, sales, [], today)
    tools = jarvis.Tools(browser, {}, {}, today.isoformat())
    people = {str(r.get("person_id")): r for k in ("touches_due", "people") for r in browser.get(k) or []}
    for rec in recs:
        k = rec["key"]
        for p in rec["people"]:
            pid = p["person_id"]
            if pid in side_of and rec["open"]:
                out["Call list"][k] = {"side_word": (people.get(pid) or {}).get("deal_side", "")}
            for d in links.person_deals(recs, browser, pid):
                if cc.deal_key(d["address"]) == k:
                    out["Contact card"][k] = {"side": d["side"], "close": d["expected_close"] or None, "price": cc.num(d["price"]), "status": d["status"],
                                              "open": d["open"], "expired_offer": d["expired_offer"]}
            for d in book.deals_for(pid, (book.person(pid) or {}).get("street")):
                if cc.deal_key(d["address"]) == k and d["from"] != "sales record":
                    seen = out["Contact card history"].setdefault(k, {"close": d["day"] or None, "price": d["price"], "from": d["from"], "rows": 0})
                    seen["rows"] += 1
        for pin in (browser.get("map") or {}).get("pins") or []:
            if pin.get("kind") == "deal" and cc.deal_key(pin.get("address")) == k:
                out["Map pin"][k] = {"side": pin["side"], "status": pin["status"], "open": pin["open"]}
        for d in tools.deals()["rows"]:
            if cc.deal_key(d["address"]) == k:
                out["Claude answers"][k] = {"side": d["side"], "close": d["expected_close"] or None, "price": cc.num(d["price"]), "status": d["status"],
                                            "expired_offer": d["expired_offer"]}
        for d in browser.get("deals") or []:
            if cc.deal_key(d["address"]) == k:
                out["CRM Deals tab row"][k] = {"side": d["side"], "close": d["expected_close"] or None, "price": cc.num(d["price"]), "status": d["status"], "open": d["open"]}
    return recs, out


def disagreements(recs: list[dict], views: dict) -> list[str]:
    """Every place a screen says something other than the record, for deals that are open or an expired offer."""
    bad = []
    for rec in recs:
        if not (rec["open"] or rec["expired_offer"]):
            continue
        want = {"side": rec["side"], "close": rec["close"], "price": rec["price"], "status": rec["status"], "open": rec["open"],
                "expired_offer": rec["expired_offer"], "side_word": rec["side_word"], "contract": rec["stage"] == "contract", "from": links.SHEET, "rows": 1}
        for screen, by in views.items():
            got = by.get(rec["key"])
            if got is None:
                continue
            for field, v in got.items():
                if field == "close" and screen in ("Home paydays", "Home deadlines") and rec["stage"] != "contract":
                    continue
                if v != want[field]:
                    bad.append(f"{rec['key']}: {screen} says {field} {v!r}, the record says {want[field]!r}")
    return bad
