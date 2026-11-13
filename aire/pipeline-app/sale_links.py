"""Who was this sale? Local links from a closed sale to an existing CRM person, kept on this Mac only.

Suggestions come from ~/.aire/enrichment/sales-owner-matches.json (never in git, read only here). Caleb's answers go in
~/.aire/enrichment/sale-links.json (directory 0700, file 0600, replaced in one step):

  confirmed: [sale_key, mls, address_key, close, person_id, confirmed_at]
  skipped:   [sale_key, mls, address_key, close, skipped_at]

Suggestions are never written into that file. A confirmed or skipped sale leaves the Fix list; confirming a different
person replaces the earlier confirm. Nothing here touches the AIRE CRM or Deals sheets, sends anything, or creates a person.
Tests and the demo pass their own paths.
"""
from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import sale_pins

CHICAGO = ZoneInfo("America/Chicago")


def default_matches_path() -> Path:
    return Path(os.path.expanduser("~/.aire/enrichment/sales-owner-matches.json"))


def default_links_path() -> Path:
    return Path(os.path.expanduser("~/.aire/enrichment/sale-links.json"))


def _read(path) -> object:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8")) if path else None
    except (OSError, ValueError):
        return None


def load_links(path, strict: bool = False) -> dict:
    """A missing file is empty. A file that cannot be read is empty, or an error when `strict`, so a write never replaces a file it could not read."""
    empty = {"confirmed": [], "skipped": []}
    if not path:
        return empty
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return empty
    except (OSError, ValueError):
        if strict:
            raise ValueError("sale-links.json could not be read, so nothing was changed")
        return empty
    if not isinstance(data, dict):
        if strict:
            raise ValueError("sale-links.json could not be read, so nothing was changed")
        return empty
    clean = lambda k: [r for r in (data.get(k) or []) if isinstance(r, dict)]
    return {"confirmed": clean("confirmed"), "skipped": clean("skipped")}


def save_links(path, data: dict) -> None:
    """Directory 0700, file 0600, replaced in one step (same as sale_pins.write_cache)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".sale-links-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"confirmed": data.get("confirmed", []), "skipped": data.get("skipped", [])}, f, indent=1, sort_keys=True)
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def close_day(value) -> str:
    """A close day as YYYY-MM-DD. Accepts ISO or M/D/YYYY, so sales.json and the matches file can join."""
    s = str(value or "").strip()
    if not s:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    for fmt in ("%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return s[:10]


def ident(row: dict) -> dict:
    """The stable identity of a sale row (sales.json or a matches entry): mls, address_key and close day, plus the key."""
    geo = sale_pins._geo()
    street, city, state, zip_ = sale_pins._parts(row, geo)
    ak = geo.address_key(street, city, state, zip_)
    close = close_day(row.get("close") or row.get("close_date") or "")
    mls = str(row.get("mls") or "").strip()
    return {"sale_key": f"mls:{mls}" if mls else f"{ak}|{close}", "mls": mls, "address_key": ak, "close": close,
            "street": street, "city": city, "zip": zip_}


def _same(a: dict, b: dict) -> bool:
    """MLS when both sides have one, otherwise the address key and the close day."""
    if a.get("mls") and b.get("mls"):
        return a["mls"] == b["mls"]
    return bool(a.get("address_key")) and a.get("address_key") == b.get("address_key") and a.get("close") == b.get("close")


def find(entries: list, ident_: dict) -> dict | None:
    return next((e for e in entries if _same(e, ident_)), None)


def person_for(links: dict, ident_: dict) -> str | None:
    e = find(links.get("confirmed", []), ident_)
    return str(e["person_id"]) if e and e.get("person_id") else None


def resolver(links: dict):
    """row -> confirmed person_id or None, for sale_pins.build and the last-touch index."""
    return lambda row: person_for(links, ident(row))


def load_matches(path) -> list:
    d = _read(path)
    if isinstance(d, dict):
        rows = d.get("sales") or d.get("matches") or d.get("rows") or []
    else:
        rows = d
    return [r for r in (rows if isinstance(rows, list) else []) if isinstance(r, dict)]


def _suggestion(m: dict, people: dict) -> dict | None:
    """The best suggested contact that is still a person in the feed: person_id, display, tier."""
    cands = []
    if m.get("matched_contact_person_id"):
        cands.append({"person_id": m["matched_contact_person_id"], "tier": m.get("tier")})
    for c in m.get("matches") or []:
        if isinstance(c, dict):
            cands.append({"person_id": c.get("person_id") or c.get("contact_id") or c.get("matched_contact_person_id"), "tier": c.get("tier") or m.get("tier")})
    for c in cands:
        pid = str(c["person_id"] or "")
        tier = str(c.get("tier") or "").lower()
        if pid in people and tier != "none":
            return {"person_id": pid, "display": people[pid], "tier": str(c.get("tier") or "")}
    return None


def pending(rows: list, matches: list, links: dict, people: dict) -> list:
    """One card per closed sale (leases skipped) with no confirmed link and not skipped. `people` is {person_id: display}.
    A card carries the address, close day, side, assessor owner names and the suggestion, never a phone or email."""
    idx = [(ident(m), m) for m in matches]
    out, seen = [], set()
    for r in rows:
        if sale_pins.is_lease(r):
            continue
        i = ident(r)
        if not i["street"] or i["sale_key"] in seen:
            continue
        seen.add(i["sale_key"])
        if find(links["confirmed"], i) or find(links["skipped"], i):
            continue
        m = next((mm for mi, mm in idx if _same(mi, i)), None) or {}
        side = str(r.get("side") or m.get("side") or "")
        owners = [str(n) for n in (m.get("owner_names") or []) if n][:6]
        priors = [str(n) for n in (m.get("prior_owner_names") or []) if n][:6]
        names = priors or owners if re.search(r"list|seller", side, re.I) else owners or priors
        out.append({"sale_key": i["sale_key"], "mls": i["mls"], "address": i["street"], "city": i["city"], "zip": i["zip"], "close": i["close"],
                    "side": side, "owner_names": names,
                    "suggestion": _suggestion(m, people) if m else None})
    out.sort(key=lambda c: c["close"], reverse=True)
    return out


def _now(now) -> str:
    return (now or datetime.now(CHICAGO)).isoformat(timespec="seconds")


def _drop(entries: list, i: dict) -> list:
    return [e for e in entries if not _same(e, i)]


def _base(i: dict) -> dict:
    return {"sale_key": i["sale_key"], "mls": i["mls"], "address_key": i["address_key"], "close": i["close"]}


def confirm(path, row: dict, person_id: str, now=None) -> dict:
    """Confirm (the suggestion) or pick (another feed person): both store the same record, replacing any earlier answer."""
    pid = str(person_id or "").strip()
    if not pid:
        raise ValueError("a person is needed")
    i, links = ident(row), load_links(path, strict=True)
    links["confirmed"] = _drop(links["confirmed"], i) + [{**_base(i), "person_id": pid, "confirmed_at": _now(now)}]
    links["skipped"] = _drop(links["skipped"], i)
    save_links(path, links)
    return links


pick = confirm


def skip(path, row: dict, now=None) -> dict:
    i, links = ident(row), load_links(path, strict=True)
    links["skipped"] = _drop(links["skipped"], i) + [{**_base(i), "skipped_at": _now(now)}]
    links["confirmed"] = _drop(links["confirmed"], i)
    save_links(path, links)
    return links
