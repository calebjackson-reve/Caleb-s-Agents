"""Deals tied to people, and the Fix list. Pure functions over the CRM feed and the Command Center reads.

  tie        each Deals sheet row gets its person: the CRM Deals tab link, then the address, then the name
  overlay    what a deal says about a person's stage: a signed contract is Under contract, a closing is Past client.
             Shown in Pipeline only. The sheet's own Stage is kept beside it and never written.
  checkins   after a closing: 30 days, 6 months, and the home anniversary every year
  counts     the one set of open-deal counts the Board, Deals and the Dashboard all show. An offer past its deadline is
             not open: it is listed as "expired, confirm".
  fixes      rows that look wrong, each with the problem and a suggested fix. Caleb approves one at a time and the
             approval is logged on this Mac. Pipeline never edits the sheets.

Nothing here sends or writes to a sheet.
"""
from __future__ import annotations

import hashlib
import re
from datetime import date, timedelta

import cc
import insight

OPEN = ("appointment", "offer", "contract", "other")
KW_CAP, KW_ROYALTY = 20_000, 3_000  # Caleb, 2026-11-11: the cap is $20,000 plus the $3,000 royalty


def _name_key(v) -> str:
    return " ".join(re.findall(r"[a-z]+", str(v or "").lower()))


def _people(feed: dict) -> dict:
    """Everyone the feed names, by id, with street and the sheet's stage. The people list first, then the facts."""
    out = {str(p.get("person_id")): dict(p) for p in (feed or {}).get("people") or []}
    for r in ((feed or {}).get("touches_due") or []) + ((feed or {}).get("new_leads") or []):
        out.setdefault(str(r.get("person_id")), dict(r))
    for pid, fx in ((feed or {}).get("facts") or {}).items():
        cur = out.setdefault(str(pid), {"person_id": str(pid)})
        if fx.get("street") and not cur.get("street"):
            cur["street"] = fx["street"]
    return out


def is_expired_offer(card: dict, now=None) -> bool:
    o = card.get("offer") or {}
    return card.get("stage") == "offer" and bool(o.get("expired")) and not o.get("superseded")


def tie(cards: list[dict], feed: dict) -> list[dict]:
    """Each Deals sheet row with the people it belongs to and how they were matched. A match by name needs the
    person's whole name (two words or more) written in the row's note or source, so a first name alone never ties."""
    people = _people(feed)
    by_house: dict = {}
    for pid, p in people.items():
        h = insight._house(p.get("street"))
        if h:
            by_house.setdefault(h, []).append(pid)
    names = [(pid, _name_key(p.get("display"))) for pid, p in people.items()]
    names = [(pid, n) for pid, n in names if len(n.split()) >= 2 and len(n) >= 7]
    out = []
    for c in cards or []:
        ids, how = [], ""
        linked = str((c.get("crm") or {}).get("person_id") or "")
        if linked and linked in people:
            ids, how = [linked], "CRM Deals tab"
        if not ids:
            ids = [pid for pid in by_house.get(insight._house(c.get("deal")), []) if insight.same_home(c.get("deal"), people[pid].get("street"))]
            how = "same address" if ids else ""
        if not ids:
            text = " " + _name_key(f"{c.get('check') or ''} {c.get('source') or ''} {c.get('deal') or ''}") + " "
            ids = [pid for pid, n in names if f" {n} " in text]
            how = "name in the deal's note" if ids else ""
        out.append({"key": c.get("key") or cc.deal_key(c.get("deal")), "deal": c.get("deal"), "stage": c.get("stage"), "status": c.get("status"),
                    "side": c.get("side"), "act": c.get("act"), "since": c.get("since"), "price": c.get("price"), "commission": c.get("commission"),
                    "expired_offer": is_expired_offer(c), "people": [{"person_id": pid, "display": people[pid].get("display") or ""} for pid in sorted(ids)],
                    "how": how})
    return out


def counts(ties: list[dict]) -> dict:
    """Open deals, one way, for every screen. An expired offer is not open."""
    live = [t for t in ties if t["stage"] in OPEN and not t["expired_offer"]]
    return {"open": len(live), "contract": sum(1 for t in live if t["stage"] == "contract"), "offer": sum(1 for t in live if t["stage"] == "offer"),
            "listing": sum(1 for t in live if t["stage"] == "appointment"), "other": sum(1 for t in live if t["stage"] == "other"),
            "expired_offers": sum(1 for t in ties if t["expired_offer"])}


def overlay(ties: list[dict], feed: dict) -> dict:
    """person_id -> the stage their deal puts them in, with the deal and the sheet's own stage. Under contract wins
    over a past closing. Only these two stages are ever set from a deal."""
    people, out = _people(feed), {}
    for t in sorted(ties, key=lambda t: 0 if t["stage"] == "contract" else 1):
        stage = "under contract" if t["stage"] == "contract" else "past client" if t["stage"] == "closed" else ""
        if not stage:
            continue
        for p in t["people"]:
            if p["person_id"] not in out:
                out[p["person_id"]] = {"stage": stage, "deal": t["deal"], "how": t["how"],
                                       "sheet_stage": str(people.get(p["person_id"], {}).get("stage") or "")}
    return out


def board_contract(ties: list[dict]) -> list[dict]:
    """The Under contract column: one row per deal under contract, so its count is the Deals page's count. A deal with
    no person matched still gets its row, named by its address."""
    return [{"deal": t["deal"], "key": t["key"], "person_id": t["people"][0]["person_id"] if t["people"] else "",
             "display": t["people"][0]["display"] if t["people"] else "", "others": len(t["people"]) - 1 if t["people"] else 0}
            for t in ties if t["stage"] == "contract"]


def _add_months(d: date, n: int) -> date:
    y, m = d.year + (d.month - 1 + n) // 12, (d.month - 1 + n) % 12 + 1
    for day in (d.day, 30, 29, 28):
        try:
            return date(y, m, day)
        except ValueError:
            continue
    return d


def checkins(ties: list[dict], sales: list[dict], feed: dict, today: date, window: int = 30) -> list[dict]:
    """Past client check-ins due within `window` days either side of today: 30 days and 6 months after the closing, and
    the home anniversary each year (for a purchase, at the address they still live at). The closing date comes from
    the Deals sheet or the sales record. No date, no check-in."""
    people, rows, seen = _people(feed), [], set()
    closings = [(t["act"], t["deal"], str(t.get("side") or "").lower(), [p["person_id"] for p in t["people"]], "Deals sheet") for t in ties if t["stage"] == "closed"]
    by_house: dict = {}
    for pid, p in people.items():
        if insight._house(p.get("street")):
            by_house.setdefault(insight._house(p["street"]), []).append(pid)
    for s in sales or []:
        if "lease" in str(s.get("type") or "").lower():
            continue
        ids = [pid for pid in by_house.get(insight._house(s.get("address")), []) if insight.same_home(s.get("address"), people[pid].get("street"))]
        closings.append((str(s.get("close") or "")[:10], s.get("address"), str(s.get("side") or "").lower(), ids, "sales record"))
    for day, deal, side, ids, src in closings:
        d0 = insight._day(day)
        if not d0 or d0 > today:
            continue
        steps = [("30 days after closing", d0 + timedelta(days=30)), ("6 months after closing", _add_months(d0, 6))]
        if side.startswith(("buy", "both", "dual")):
            for years in (today.year - d0.year - 1, today.year - d0.year, today.year - d0.year + 1):  # the one nearest today
                if years >= 1 and abs((_add_months(d0, 12 * years) - today).days) <= window:
                    steps.append((f"home anniversary, {years} year{'' if years == 1 else 's'}", _add_months(d0, 12 * years)))
        for pid in ids:
            for kind, due in steps:
                k = (pid, cc.deal_key(deal), kind.split(",")[0])
                if abs((due - today).days) <= window and k not in seen:
                    seen.add(k)
                    rows.append({"person_id": pid, "display": people[pid].get("display") or "", "deal": deal, "kind": kind, "due": due.isoformat(),
                                 "closed": d0.isoformat(), "days": (due - today).days, "from": src})
    return sorted(rows, key=lambda r: r["due"])


def apply_overlay(feed: dict, over: dict) -> dict:
    """A copy of the feed with each tied person's stage set from their deal, the sheet's stage kept as sheet_stage."""
    if not over:
        return feed

    def fix(r):
        o = over.get(str(r.get("person_id"))) if isinstance(r, dict) else None
        return {**r, "stage": o["stage"], "sheet_stage": r.get("stage") or "", "stage_from": o["deal"]} if o and str(r.get("stage") or "").strip().lower() != o["stage"] else r

    out = dict(feed)
    for k in ("touches_due", "new_leads", "people", "partners"):
        if isinstance(feed.get(k), list):
            out[k] = [fix(r) for r in feed[k]]
    if isinstance(feed.get("heat"), dict):
        out["heat"] = {**feed["heat"], **{k: [fix(r) for r in feed["heat"].get(k) or []] for k in ("hot", "warm")}}
    if isinstance(feed.get("map"), dict):
        out["map"] = {**feed["map"], "pins": [fix(p) if p.get("kind") == "person" else p for p in feed["map"].get("pins") or []]}
    return out


# ---------------- The Fix list ----------------

MLS_SAYS = {"pending": "contract", "sold": "closed", "withdrawn": "out", "expired": "out", "back_on_market": "appointment", "new_listing": "appointment"}
STAGE_WORDS = {"contract": "under contract", "closed": "closed", "out": "off the market", "appointment": "an active listing", "offer": "an offer", "other": "no status"}


def _usd(v) -> str:
    return f"${v:,.0f}" if v else "no price"


def _fid(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:12]


def cap_note(goals: dict) -> dict | None:
    """The cap as Goals has it, and whether that is KW's $20,000 plus the $3,000 royalty."""
    amount = cc.num((goals or {}).get("cap_amount"))
    if not amount:
        return {"amount": None, "expected": KW_CAP + KW_ROYALTY, "differs": False, "note": "No cap is set in Goals, so the cap is unknown."}
    want = KW_CAP + KW_ROYALTY
    return {"amount": amount, "expected": want, "differs": amount != want,
            "note": "" if amount == want else f"Goals says ${amount:,.0f}. KW's cap is ${KW_CAP:,} plus the ${KW_ROYALTY:,} royalty, ${want:,}. Change it in Goals if that is the one you mean."}


def fixes(feed: dict, cards: list[dict], ties: list[dict], sales: list[dict], goals: dict | None = None) -> list[dict]:
    """Every row that looks wrong, the problem in plain words and the suggested fix. Read only."""
    f, out = feed or {}, []
    people = _people(f)

    def add(kind, ref, what, problem, fix, src):
        out.append({"id": _fid(kind, ref, problem), "kind": kind, "ref": str(ref), "what": what, "problem": problem, "fix": fix, "from": src})

    # 1. no name
    for pid, p in sorted(people.items(), key=lambda kv: str(kv[1].get("last_inbound") or kv[1].get("last_touch") or ""), reverse=True):
        if not str(p.get("display") or "").strip():
            where = ", ".join(x for x in (p.get("street"), p.get("city")) if x)
            add("no_name", pid, f"Contact {pid}" + (f" at {where}" if where else ""), "No name on the CRM sheet.",
                "Type their name in the display, first and last columns of the Contacts tab.", "CRM sheet")
    # 2. duplicate people: the same phone, the same email, or the same full name
    groups: dict = {}
    rows = (f.get("touches_due") or []) + (f.get("new_leads") or []) + [p for p in (f.get("map") or {}).get("pins") or [] if p.get("kind") == "person"]
    for r in rows:
        for label, v in (("phone", insight._phone(r.get("phone"))), ("email", str(r.get("email") or "").strip().lower())):
            if v and r.get("person_id"):
                groups.setdefault((label, v), set()).add(str(r["person_id"]))
    for pid, p in people.items():
        n = _name_key(p.get("display"))
        if len(n.split()) >= 2:
            groups.setdefault(("name", n), set()).add(pid)
    done = set()
    for (label, v), ids in sorted(groups.items(), key=lambda kv: ("phone", "email", "name").index(kv[0][0])):
        ids = tuple(sorted(ids))
        if len(ids) < 2 or ids in done:
            continue
        done.add(ids)
        shown = ", ".join(f"{people.get(i, {}).get('display') or 'no name'} ({i})" for i in ids[:4])
        add("duplicate", "+".join(ids), shown, f"{len(ids)} contacts share one {label}.",
            f"Keep {ids[0]}, copy anything missing onto it, and delete the other{'s' if len(ids) > 2 else ''} in the Contacts tab.", "CRM sheet")
    # 3. wrong stage: a deal says one thing and the sheet's Stage says another
    over = overlay(ties, f)
    for pid, o in over.items():
        if o["sheet_stage"].strip().lower() != o["stage"]:
            add("stage", pid, people.get(pid, {}).get("display") or f"Contact {pid}",
                f"Stage on the CRM sheet is {o['sheet_stage'] or 'blank'}, but {o['deal']} is {'under contract' if o['stage'] == 'under contract' else 'closed'} (matched by {o['how']}).",
                f"Set Stage to {o['stage']} in the Contacts tab. Pipeline already shows them as {o['stage']}.", "Deals sheet and CRM sheet")
    tied_uc = {p["person_id"] for t in ties if t["stage"] == "contract" for p in t["people"]}
    for pid, p in people.items():
        if str(p.get("stage") or "").strip().lower() == "under contract" and pid not in tied_uc:
            add("stage", pid, p.get("display") or f"Contact {pid}", "Stage is under contract, but no deal under contract on the Deals sheet matches them.",
                "Add their deal to the Deals sheet, or set Stage to where they really are.", "Deals sheet and CRM sheet")
    # 4. a deal row with the wrong price
    sold = {}
    for s in sales or []:
        sold.setdefault(insight._house(s.get("address")), []).append(s)
    for c in cards or []:
        for d in c.get("differs") or []:
            if d.get("field") == "price":
                add("price", c.get("key"), c.get("deal"), f"Deals sheet says {_usd(c.get('price'))}, the CRM Deals tab says {_usd(cc.num(d.get('crm')))}.",
                    "Check the contract and correct whichever one is wrong.", "Deals sheet and CRM Deals tab")
        if c.get("stage") == "closed" and c.get("price"):
            hit = next((s for s in sold.get(insight._house(c.get("deal")), []) if insight.same_home(s.get("address"), c.get("deal")) and cc.num(s.get("price"))), None)
            if hit and abs(cc.num(hit["price"]) - c["price"]) >= 1:
                add("price", c.get("key"), c.get("deal"), f"Deals sheet says ${c['price']:,.0f}, the sales record says ${cc.num(hit['price']):,.0f} (closed {str(hit.get('close'))[:10]}).",
                    f"Set Price to ${cc.num(hit['price']):,.0f} on the Deals sheet if the sales record is right.", "Deals sheet and sales record")
    # 5. Deals rows that do not match Flexmls
    newest: dict = {}
    for m in (f.get("market") or {}).get("rows") or []:
        if m.get("type") in MLS_SAYS and insight._house(m.get("address")):
            k = insight._house(m["address"])
            newest.setdefault(k, []).append(m)
    for c in cards or []:
        hits = sorted((m for m in newest.get(insight._house(c.get("deal")), []) if insight.same_home(m.get("address"), c.get("deal"))), key=lambda m: str(m.get("date") or ""))
        if not hits:
            continue
        m = hits[-1]
        says = MLS_SAYS[m["type"]]
        if says != c.get("stage") and not (c.get("stage") == "offer" and says == "appointment"):
            add("mls", c.get("key"), c.get("deal"), f"Deals sheet says {c.get('status')}. Flexmls says {str(m.get('label') or m['type']).replace('_', ' ')} on {m.get('date')}.",
                f"If Flexmls is right, set Status to match ({STAGE_WORDS.get(says, says)}).", f"Deals sheet and {m.get('source') or 'Flexmls'}")
    # 6. offers past their deadline
    for t in ties:
        if t["expired_offer"]:
            add("offer", t["key"], t["deal"], "The offer is past its deadline, so it is out of the open count.",
                "Confirm it: mark it expired or fell through on the Deals sheet, or write the new deadline in its note.", "Deals sheet")
    return out


def with_decisions(rows: list[dict], log: list[dict]) -> dict:
    """The list split by Caleb's logged taps: still open, approved (his to change in the sheet), and set aside."""
    last = {}
    for e in log or []:
        last[e.get("id")] = e
    live = {r["id"] for r in rows}
    return {"open": [r for r in rows if r["id"] not in last],
            "approved": [{**r, "at": last[r["id"]].get("at")} for r in rows if last.get(r["id"], {}).get("action") == "approve"],
            "dismissed": sum(1 for r in rows if last.get(r["id"], {}).get("action") == "dismiss"),
            "resolved": sum(1 for i, e in last.items() if e.get("action") == "approve" and i not in live)}
