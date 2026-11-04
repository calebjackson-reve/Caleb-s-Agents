#!/usr/bin/env python3
"""
Command bridge: line KW Command contacts up with the AIRE CRM and plan what each side should learn
from the other. READ ONLY. It writes two CSVs and a report under out/command-bridge/<date>/ and
touches nothing else: not the AIRE sheet, not Command, not Gmail.

Why it exists (2026-11-04): the AIRE CRM's Command_ID column is empty on every row, so the two
systems have never been linked. AIRE knows temperature, texts, verified addresses, parish values,
homestead and farms. Command knows tags, birthdays, home anniversaries, lead sources and its own
contact ids. Command has no custom fields in Caleb's account and no API, so tags are the one bulk
channel into Command.

  python3 command_bridge.py --command command-export.csv                 # live AIRE sheet, read only
  python3 command_bridge.py --command command-export.csv --local snap.json
  python3 command_bridge.py --command command-export.csv --signals ../enrichment/out/imessage-signals.json
  python3 command_bridge.py --test

Inputs
  --command   A CSV of Command contacts (Contacts > select > Export, or the Command reader once it is built).
              Column names are found by the candidates in COLUMN_CANDIDATES. The report says which
              column it used for each field and stops if it finds neither a phone nor an email column.
  --farms     farms.local.json (default aire/map-crm/farms.local.json). Farms are geography only.
  --signals   optional enrichment output, so the temperature tag follows the texts, same as the feed.

Outputs (client data, git-ignored, stays on the Mac)
  link-report.md        counts: matched by email, phone, name and street; ambiguous; Command only; AIRE only
  command-tags.csv      one row per matched Command contact: tags to add and AIRE tags to remove
  aire-from-command.csv one row per matched AIRE person: Command id, tags, lead source, birthday,
                        home anniversary. A plan for crm.py, never applied here.

Matching rules (conservative on purpose, a wrong link is worse than no link)
  1. email, 2. 10-digit phone, 3. exact display name AND the same street key.
  A Command row that hits two AIRE people, or an AIRE person hit by two Command rows, is ambiguous
  and gets no tags. Shared emails between spouses land here, which is the point.
  Do_Not_Contact people in AIRE get no tags and are listed for Caleb.

Fair housing: tags come only from geography (farm), the property record (homestead, parish value),
and how Caleb and the person actually talk (temperature). Nothing reads or infers a protected trait.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import crm as engine
from crm import email_key, name_key, phone_key, norm_band

HERE = Path(__file__).resolve().parent
OUT_ROOT = HERE / "out" / "command-bridge"

# Command export header names are not documented by KW. These are the labels Command shows on the
# Add to Contacts form plus the usual export spellings. First hit wins, case and spaces ignored.
COLUMN_CANDIDATES = {
    "command_id": ["contact id", "id", "command id", "kw id", "contactid"],
    "name": ["full name", "name", "display name"],
    "first": ["first name", "first"],
    "last": ["last name", "last"],
    "email": ["primary email", "email", "email address", "email 1"],
    "phone": ["primary phone", "phone", "mobile", "mobile phone", "cell", "phone 1"],
    "street": ["primary address", "address", "street", "address line 1", "street address"],
    "tags": ["tags", "contact tags"],
    "lead_source": ["lead source", "source"],
    "birthday": ["birthday", "date of birth"],
    "home_anniversary": ["home anniversary", "anniversary"],
}

# Tag names Caleb would see in Command. All start with "AIRE " so they group together next to the
# existing "AIRE Append 4676" tag and can be removed in one sweep if he changes his mind.
BAND_TAG = {"hot": "AIRE Hot", "warm": "AIRE Warm", "lukewarm": "AIRE Lukewarm", "cold": "AIRE Cold",
            "ice-cold": "AIRE Ice Cold"}
TAG_HOMEOWNER = "AIRE Homeowner"
TAG_VERIFIED_ADDRESS = "AIRE Verified Address"
OPPORTUNITY_TAG = {"mover": "AIRE Mover", "equity_review_candidate": "AIRE Equity Review",
                   "active_buyer": "AIRE Active Buyer", "past_client_review": "AIRE Past Client Review"}
FARM_PREFIX = "AIRE Farm "
PARTNER_TYPES = {"agent", "lender", "vendor"}


def _norm(h: str) -> str:
    return " ".join((h or "").strip().lower().replace("_", " ").split())


def pick_columns(header: list[str]) -> dict[str, str]:
    by_norm = {_norm(h): h for h in header}
    used = {}
    for field, cands in COLUMN_CANDIDATES.items():
        for c in cands:
            if c in by_norm:
                used[field] = by_norm[c]
                break
    return used


def read_command(path: Path) -> tuple[list[dict], dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        cols = pick_columns(header)
        if "email" not in cols and "phone" not in cols:
            raise SystemExit(f"no email or phone column in {path.name}. Header: {header}")
        rows = []
        for i, raw in enumerate(reader, start=2):
            r = {field: (raw.get(col) or "").strip() for field, col in cols.items()}
            if not r.get("name"):
                r["name"] = " ".join(x for x in (r.get("first", ""), r.get("last", "")) if x)
            r["_line"] = i
            r["_tags"] = [t.strip() for t in r.get("tags", "").replace(";", ",").split(",") if t.strip()]
            rows.append(r)
    return rows, cols


def street_key(street: str) -> str:
    """House number plus the first word of the street name: '14204 Dew Point Ave' -> '14204 dew'."""
    parts = (street or "").lower().replace(",", " ").split()
    if len(parts) < 2 or not parts[0].isdigit():
        return ""
    return f"{parts[0]} {parts[1]}"


def index_aire(contacts: list[dict]) -> dict[str, dict[str, list[str]]]:
    idx = {"email": defaultdict(list), "phone": defaultdict(list), "name_street": defaultdict(list)}
    for c in contacts:
        pid = c["person_id"]
        if email_key(c.get("email")):
            idx["email"][email_key(c["email"])].append(pid)
        if phone_key(c.get("primary_phone")):
            idx["phone"][phone_key(c["primary_phone"])].append(pid)
        nk, sk = name_key(c.get("display")), street_key(c.get("street"))
        if nk and sk:
            idx["name_street"][f"{nk}|{sk}"].append(pid)
    return idx


def match_rows(command_rows: list[dict], contacts: list[dict]) -> dict:
    """Each Command row -> one AIRE person_id, or ambiguous, or none. Then drop any AIRE person that two
    Command rows claim (both become ambiguous)."""
    idx = index_aire(contacts)
    links, ambiguous, unmatched = {}, [], []
    for r in command_rows:
        hit, why = [], ""
        for field, key in (("email", email_key(r.get("email"))), ("phone", phone_key(r.get("phone"))),
                           ("name_street", f"{name_key(r.get('name'))}|{street_key(r.get('street'))}")):
            if field == "name_street" and (not name_key(r.get("name")) or not street_key(r.get("street"))):
                continue
            if key and idx[field].get(key):
                hit, why = sorted(set(idx[field][key])), field
                break
        if not hit:
            unmatched.append(r)
        elif len(hit) > 1:
            ambiguous.append({**r, "_why": f"{why} matches {len(hit)} AIRE people", "_pids": hit})
        else:
            links[r["_line"]] = {"row": r, "person_id": hit[0], "why": why}
    claims = Counter(v["person_id"] for v in links.values())
    for line, v in list(links.items()):
        if claims[v["person_id"]] > 1:
            ambiguous.append({**v["row"], "_why": f"{claims[v['person_id']]} Command rows match one AIRE person",
                              "_pids": [v["person_id"]]})
            del links[line]
    return {"links": links, "ambiguous": ambiguous, "unmatched": unmatched}


def farm_by_person(crm: "engine.CRM", farms: list[dict]) -> dict[str, str]:
    if not farms:
        return {}
    names = {f["id"]: f.get("name", f["id"]) for f in farms}
    out = {}
    for g in crm.geo_rows():
        if g.get("kind") != "person" or g.get("match") != "match" or not g.get("lat") or not g.get("lng"):
            continue
        fid = engine.geo.farm_for(float(g["lat"]), float(g["lng"]), farms)
        if fid:
            out[g["ref_id"]] = names[fid]
    return out


def planned_tags(c: dict, farm: str, signals: dict) -> list[str]:
    sig = signals.get(c["person_id"], {})
    band = norm_band(sig.get("label")) or norm_band(c.get("band"))
    tags = []
    if band in BAND_TAG and (c.get("Type") or "").lower() not in PARTNER_TYPES:
        tags.append(BAND_TAG[band])
    if farm:
        tags.append(FARM_PREFIX + farm)
    if str(c.get("homestead", "")).strip().lower() in {"true", "yes", "1"}:
        tags.append(TAG_HOMEOWNER)
    if (c.get("addr_tier") or "").startswith("A_"):
        tags.append(TAG_VERIFIED_ADDRESS)
    for opp in (c.get("opportunity_types") or "").replace(";", ",").split(","):
        if opp.strip() in OPPORTUNITY_TAG:
            tags.append(OPPORTUNITY_TAG[opp.strip()])
    return tags


def build(crm: "engine.CRM", command_rows: list[dict], farms: list[dict], signals: dict | None = None) -> dict:
    signals = signals or {}
    contacts = crm.contacts()
    by_id = {c["person_id"]: c for c in contacts}
    m = match_rows(command_rows, contacts)
    farm_of = farm_by_person(crm, farms)
    tag_rows, aire_rows, dnc = [], [], []
    for v in sorted(m["links"].values(), key=lambda v: v["row"]["_line"]):
        r, c = v["row"], by_id[v["person_id"]]
        if (c.get("Do_Not_Contact") or "").upper() == "YES":
            dnc.append({"person_id": c["person_id"], "display": c.get("display", ""), "command_name": r.get("name", "")})
            continue
        want = planned_tags(c, farm_of.get(c["person_id"], ""), signals)
        have = set(r["_tags"])
        add = [t for t in want if t not in have]
        stale = [t for t in have if t.startswith("AIRE ") and t not in want and not t.startswith("AIRE Append")]
        if add or stale:
            tag_rows.append({"command_line": r["_line"], "command_id": r.get("command_id", ""), "name": r.get("name", ""),
                             "email": r.get("email", ""), "phone": r.get("phone", ""), "person_id": c["person_id"],
                             "matched_by": v["why"], "tags_to_add": "; ".join(add), "aire_tags_to_remove": "; ".join(stale)})
        aire_rows.append({"person_id": c["person_id"], "display": c.get("display", ""), "matched_by": v["why"],
                          "command_id": r.get("command_id", ""), "current_command_id": c.get("Command_ID", ""),
                          "command_tags": "; ".join(r["_tags"]), "lead_source": r.get("lead_source", ""),
                          "birthday": r.get("birthday", ""), "home_anniversary": r.get("home_anniversary", "")})
    linked_ids = {v["person_id"] for v in m["links"].values()}
    aire_only = [c for c in contacts if c["person_id"] not in linked_ids
                 and (c.get("Do_Not_Contact") or "").upper() != "YES"]
    counts = {
        "command_rows": len(command_rows), "aire_people": len(contacts),
        "linked": len(m["links"]), "by": dict(Counter(v["why"] for v in m["links"].values())),
        "ambiguous": len(m["ambiguous"]), "command_only": len(m["unmatched"]), "aire_only": len(aire_only),
        "dnc_in_both": len(dnc), "contacts_getting_tags": len(tag_rows),
        "tags": dict(Counter(t for row in tag_rows for t in row["tags_to_add"].split("; ") if t)),
        "with_birthday": sum(1 for r in aire_rows if r["birthday"]),
        "with_home_anniversary": sum(1 for r in aire_rows if r["home_anniversary"]),
        "farms_loaded": len(farms),
    }
    return {"counts": counts, "tag_rows": tag_rows, "aire_rows": aire_rows, "ambiguous": m["ambiguous"],
            "command_only": m["unmatched"], "dnc": dnc}


def report_md(res: dict, cols: dict[str, str], as_of: str) -> str:
    c = res["counts"]
    lines = [f"# Command bridge, practice run {as_of}", "",
             "Read only. Nothing was written to Command or the AIRE sheet.", "",
             "## Columns used from the Command file", ""]
    lines += [f"- {k}: `{v}`" for k, v in cols.items()] or ["- none"]
    lines += ["", "## Counts", "",
              f"- Command rows: {c['command_rows']}, AIRE people: {c['aire_people']}",
              f"- Linked: {c['linked']} ({', '.join(f'{k} {v}' for k, v in sorted(c['by'].items())) or 'none'})",
              f"- Ambiguous, no tags: {c['ambiguous']}",
              f"- In Command only: {c['command_only']}. In AIRE only: {c['aire_only']}",
              f"- Do Not Contact in AIRE and present in Command: {c['dnc_in_both']} (no tags, Caleb decides)",
              f"- Command contacts that would get tags: {c['contacts_getting_tags']}",
              f"- Farms loaded: {c['farms_loaded']}",
              f"- Linked people with a Command birthday: {c['with_birthday']}, home anniversary: {c['with_home_anniversary']}",
              "", "## Tags that would be added", ""]
    lines += [f"- {t}: {n}" for t, n in sorted(c["tags"].items(), key=lambda x: -x[1])] or ["- none"]
    lines += ["", "## Ambiguous (first 50)", ""]
    lines += [f"- line {a['_line']}: {a.get('name', '')}: {a['_why']}" for a in res["ambiguous"][:50]] or ["- none"]
    lines += ["", "## Next", "",
              "- Caleb reads this and command-tags.csv. Tags go into Command only on his yes, batch by batch.",
              "- aire-from-command.csv is a plan for the AIRE sheet (Command_ID and dates). Applying it needs his yes",
              "  and a change to crm.py, which today never writes Command_ID.", ""]
    return "\n".join(lines)


def write_outputs(res: dict, cols: dict[str, str], out_dir: Path, as_of: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "link-report.md").write_text(report_md(res, cols, as_of))
    for name, rows in (("command-tags.csv", res["tag_rows"]), ("aire-from-command.csv", res["aire_rows"])):
        with (out_dir / name).open("w", newline="") as f:
            if rows:
                w = csv.DictWriter(f, fieldnames=list(rows[0]))
                w.writeheader(); w.writerows(rows)


# ----------------------------------------------------------------- tests (made-up people only)


def run_tests() -> int:
    import tempfile
    fails = []

    def check(name, ok):
        print(("ok   " if ok else "FAIL ") + name)
        if not ok:
            fails.append(name)

    snap = {
        "header": engine.CONTACT_COLUMNS,
        "Contacts": [
            {"person_id": "1", "display": "Taylor Sample", "primary_phone": "+12255550101", "email": "taylor.sample@example.com",
             "street": "100 Sample St", "city": "Baton Rouge", "zip": "70808", "addr_tier": "A_confirmed", "homestead": "True",
             "band": "hot", "opportunity_types": "mover", "Do_Not_Contact": "NO", "Type": "client"},
            {"person_id": "2", "display": "Jordan Sample", "primary_phone": "+12255550102", "email": "", "street": "", "band": "cold",
             "Do_Not_Contact": "NO", "Type": "client"},
            {"person_id": "3", "display": "Casey Sample", "primary_phone": "", "email": "shared.sample@example.com", "band": "warm",
             "Do_Not_Contact": "NO", "Type": "household"},
            {"person_id": "4", "display": "Riley Sample", "primary_phone": "", "email": "shared.sample@example.com", "band": "warm",
             "Do_Not_Contact": "NO", "Type": "household"},
            {"person_id": "5", "display": "Morgan Sample", "primary_phone": "+12255550105", "band": "hot",
             "Do_Not_Contact": "YES", "Type": "client"},
            {"person_id": "6", "display": "Avery Lender", "primary_phone": "+12255550106", "band": "warm",
             "Do_Not_Contact": "NO", "Type": "lender"},
            {"person_id": "7", "display": "Quinn Sample", "primary_phone": "", "email": "", "street": "200 Oak Ln", "band": "lukewarm",
             "Do_Not_Contact": "NO", "Type": "client"},
        ],
        "Geo": [{"key": "person:1", "kind": "person", "ref_id": "1", "lat": "30.44", "lng": "-91.12", "match": "match"}],
    }
    farms = [{"id": "south-br", "name": "South BR", "polygon": [[30.45, -91.15], [30.45, -91.10], [30.42, -91.10], [30.42, -91.15]]}]
    command_csv = (
        "Contact ID,Full Name,Primary Email,Primary Phone,Primary Address,Tags,Lead Source,Birthday,Home Anniversary\n"
        "c1,Taylor Sample,TAYLOR.SAMPLE@example.com,,,\"sphere, AIRE Cold\",Referral,1980-05-01,2019-06-30\n"
        "c2,J Sample,,(225) 555-0102,,,,,\n"
        "c3,Casey Sample,shared.sample@example.com,,,,,,\n"
        "c5,Morgan Sample,,225-555-0105,,,,,\n"
        "c6,Avery Lender,,2255550106,,Vendor,,,\n"
        "c7,Quinn Sample,,,200 Oak Lane,,,,\n"
        "c8,Nobody Known,nobody@example.com,,,,,,\n"
    )
    with tempfile.TemporaryDirectory() as td:
        sp, cp = Path(td) / "snap.json", Path(td) / "command.csv"
        sp.write_text(json.dumps(snap)); cp.write_text(command_csv)
        backend = engine.LocalBackend(sp, dry_run=True)
        crm = engine.CRM(backend, audit_path=Path(td) / "audit.jsonl")
        rows, cols = read_command(cp)
        check("columns found by label", cols.get("command_id") == "Contact ID" and cols.get("phone") == "Primary Phone")
        res = build(crm, rows, farms)
        tag_by_pid = {r["person_id"]: r for r in res["tag_rows"]}
        aire_by_pid = {r["person_id"]: r for r in res["aire_rows"]}
        check("email match ignores case", aire_by_pid.get("1", {}).get("matched_by") == "email")
        check("phone match across formats", aire_by_pid.get("2", {}).get("matched_by") == "phone")
        check("name plus street match", aire_by_pid.get("7", {}).get("matched_by") == "name_street")
        check("shared email is ambiguous, no tags", "3" not in tag_by_pid and "4" not in tag_by_pid and res["counts"]["ambiguous"] == 1)
        t1 = tag_by_pid.get("1", {})
        check("hot, farm, homeowner, verified, mover tags",
              t1.get("tags_to_add") == "AIRE Hot; AIRE Farm South BR; AIRE Homeowner; AIRE Verified Address; AIRE Mover")
        check("stale AIRE band tag listed for removal", t1.get("aire_tags_to_remove") == "AIRE Cold")
        check("Do Not Contact gets no tags and is listed", "5" not in tag_by_pid and res["counts"]["dnc_in_both"] == 1)
        check("partner gets no temperature tag", "6" not in tag_by_pid)
        check("Command-only row counted", res["counts"]["command_only"] == 1)
        check("birthday and anniversary carried to AIRE plan", aire_by_pid["1"]["birthday"] == "1980-05-01"
              and aire_by_pid["1"]["home_anniversary"] == "2019-06-30" and aire_by_pid["1"]["command_id"] == "c1")
        check("signals label wins over sheet band",
              build(crm, rows, farms, {"1": {"label": "warm"}})["tag_rows"][0]["tags_to_add"].startswith("AIRE Warm"))
        check("no writes to the CRM", backend.writes == [])
        out = Path(td) / "out"
        write_outputs(res, cols, out, "2026-11-04")
        check("outputs written", all((out / n).exists() for n in ("link-report.md", "command-tags.csv", "aire-from-command.csv")))
        np = Path(td) / "noid.csv"; np.write_text("Full Name,Notes\nA,B\n")
        try:
            read_command(np); check("refuses a file with no email or phone", False)
        except SystemExit:
            check("refuses a file with no email or phone", True)
    print(f"\n{len(fails)} failed" if fails else "\nall passed")
    return 1 if fails else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--command", help="CSV of KW Command contacts")
    ap.add_argument("--local", help="AIRE CRM JSON snapshot instead of the live sheet")
    ap.add_argument("--farms", default=str(engine.geo.FARMS_LOCAL))
    ap.add_argument("--signals", help="enriched.csv or imessage-signals.json from aire/enrichment")
    ap.add_argument("--as-of", default=engine.today().isoformat())
    ap.add_argument("--out", help="output folder (default out/command-bridge/<date>)")
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args(argv)
    if a.test:
        return run_tests()
    if not a.command:
        ap.error("--command is required")
    # dry_run=True on the backend as a second lock: even a bug here cannot write to the sheet.
    backend = engine.LocalBackend(Path(a.local), dry_run=True) if a.local else engine.SheetsBackend(dry_run=True)
    crm = engine.CRM(backend)
    rows, cols = read_command(Path(a.command))
    farms = engine.geo.load_farms(Path(a.farms))
    signals = engine.load_signals(Path(a.signals), crm.contacts()) if a.signals else {}
    res = build(crm, rows, farms, signals)
    out = Path(a.out) if a.out else OUT_ROOT / a.as_of
    write_outputs(res, cols, out, a.as_of)
    print(json.dumps(res["counts"], indent=1))
    print(f"wrote {out}/link-report.md, command-tags.csv, aire-from-command.csv (client data, stays on the Mac)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
