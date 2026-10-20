#!/usr/bin/env python3
"""Practice-run merge of the Hot-Warm-Cold sheet into the real CRM. One job: match and report. Writes nothing to any sheet.

  python3 merge_hwc.py --hwc hwc.json --crm crm.json --out ../out/

hwc.json is the Sheets API dump of the Hot-Warm-Cold "Contacts" tab ({"values": [[...]]}). crm.json is the local CRM file.
Outputs: merge-report.md, proposed-updates.csv (per matched person: what HWC adds), new-people.csv (HWC rows not in CRM),
handles.csv (person_id, platform, handle) for social_signals.py.
"""
from __future__ import annotations
import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from identity import Index, phone_key, email_key  # noqa: E402

TIER_TO_BAND = {"HOT": "hot", "WARM": "warm", "COLD": "cold", "CONTACT": "ice-cold"}
LEGACY_BAND = {"HOT": "hot", "WARM": "warm", "NURTURE": "cold", "DORMANT": "ice-cold"}


HWC_SHEET_ID = "11t6vex49xdA7RmskELDxt2O044vo1EJkPqL3yCgglHE"  # "Hot-Warm-Cold Contacts 2026-10-19", read only here


def load_hwc(path: Path | None) -> list[dict]:
    """A Sheets API dump ({"values": [...]}) or, with no path, the Hot-Warm-Cold sheet itself through Caleb's token."""
    if path is None:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from crm_client import TOKEN, SCOPES
        svc = build("sheets", "v4", credentials=Credentials.from_authorized_user_file(str(TOKEN), SCOPES), cache_discovery=False)
        values = svc.spreadsheets().values().get(spreadsheetId=HWC_SHEET_ID, range="Contacts!A1:L").execute().get("values", [])
    else:
        raw = json.loads(path.read_text())
        values = raw["values"] if isinstance(raw, dict) else raw
    hdr = values[0]
    return [{h: (r[i] if i < len(r) else "") for i, h in enumerate(hdr)} for r in values[1:] if any(r)]


def load_crm(path: Path) -> list[dict]:
    raw = json.loads(path.read_text())
    return raw["Contacts"] if isinstance(raw, dict) else raw


def merge(hwc: list[dict], crm: list[dict]) -> dict:
    idx = Index(crm)
    matched, new_people, conflicts, updates, handles = [], [], [], [], []
    how_counts = Counter()
    for r in hwc:
        name = r.get("Name", "")
        p, how = idx.match(phone=r.get("Phone", ""), email=r.get("Email", ""), display=name)
        how_counts[how] += 1
        if not p:
            new_people.append({"Name": name, "Phone": r.get("Phone", ""), "Email": r.get("Email", ""), "Tier": r.get("Tier", ""),
                               "Category": r.get("Category", ""), "Why": r.get("Why this tier", "")})
            continue
        matched.append((r, p, how))
        adds = {}
        if email_key(r.get("Email")) and not email_key(p.get("email")):
            adds["email"] = email_key(r["Email"])
        if phone_key(r.get("Phone")) and not phone_key(p.get("primary_phone")):
            adds["primary_phone"] = phone_key(r["Phone"])
        if r.get("Why this tier"):
            adds["why_tier"] = r["Why this tier"][:200]
        if r.get("Next action"):
            adds["Next_Action"] = r["Next action"][:200]
        if r.get("Last touch"):
            adds["Last_Touch"] = r["Last touch"][:80]
        if r.get("Notes"):
            adds["note"] = r["Notes"][:300]
        want = TIER_TO_BAND.get((r.get("Tier") or "").upper(), "")
        have = (p.get("band") or "").strip()
        have = have if have in TIER_TO_BAND.values() else LEGACY_BAND.get(have.upper(), "")
        if want and have and want != have:
            conflicts.append({"person_id": p["person_id"], "display": p.get("display", ""), "hwc_tier": r.get("Tier", ""),
                              "crm_band": have, "matched_by": how, "why": r.get("Why this tier", "")[:120]})
        elif want and not have:
            adds["band"] = want
        if (p.get("name_tier") or "") == "none" and name:
            adds["display"] = name
        if adds:
            updates.append({"person_id": p["person_id"], "crm_display": p.get("display", ""), "matched_by": how, **adds})
        for plat, col in (("instagram", "Instagram"), ("facebook", "Facebook")):
            if r.get(col):
                handles.append({"person_id": p["person_id"], "platform": plat, "handle": r[col].strip()})
    return {"matched": matched, "new_people": new_people, "conflicts": conflicts, "updates": updates,
            "handles": handles, "how": dict(how_counts)}


def write_outputs(res: dict, out: Path, hwc_n: int) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for name, rows in (("proposed-updates.csv", res["updates"]), ("new-people.csv", res["new_people"]),
                       ("handles.csv", res["handles"]), ("conflicts.csv", res["conflicts"])):
        if rows:
            keys = sorted({k for r in rows for k in r}, key=lambda k: (k != "person_id", k))
            with (out / name).open("w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=keys)
                w.writeheader()
                w.writerows(rows)
    amb = sum(1 for _, _, how in res["matched"] if how == "name-ambiguous")
    lines = [
        "# Hot-Warm-Cold merge, practice run (nothing written)", "",
        f"- Hot-Warm-Cold rows: {hwc_n}",
        f"- Matched to the CRM: {len(res['matched'])} (by phone {res['how'].get('phone', 0)}, email {res['how'].get('email', 0)}, "
        f"name {res['how'].get('name', 0)}, name but ambiguous {amb})",
        f"- Not in the CRM at all: {len(res['new_people'])} (new-people.csv)",
        f"- Matched people with something to add (email, phone, why, next action, notes, band): {len(res['updates'])} (proposed-updates.csv)",
        f"- Tier vs band conflicts for Caleb to decide: {len(res['conflicts'])} (conflicts.csv)",
        f"- Social handles recovered: {len(res['handles'])} (handles.csv, feeds social_signals.py)", "",
        "## Conflicts (HWC tier vs CRM band)", "",
    ]
    for c in res["conflicts"][:60]:
        lines.append(f"- {c['display']} (#{c['person_id']}): sheet says {c['hwc_tier']}, CRM says {c['crm_band']}, matched by {c['matched_by']}. {c['why']}")
    lines += ["", "## Ambiguous name matches (same first and last name on more than one CRM row, verify before writing)", ""]
    for r, p, how in res["matched"]:
        if how == "name-ambiguous":
            lines.append(f"- {r.get('Name')} -> #{p['person_id']} {p.get('display')} {p.get('primary_phone')}")
    (out / "merge-report.md").write_text("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hwc", help="Sheets dump JSON. Leave out to read the Hot-Warm-Cold sheet directly (read only).")
    ap.add_argument("--crm", default=str(Path(__file__).resolve().parent.parent / "out" / "contacts.json"),
                    help="out/contacts.json from run_enrichment.py --dump-contacts")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "out"))
    a = ap.parse_args()
    hwc = load_hwc(Path(a.hwc) if a.hwc else None)
    crm = load_crm(Path(a.crm))
    res = merge(hwc, crm)
    write_outputs(res, Path(a.out), len(hwc))
    print(f"{len(hwc)} HWC rows: {len(res['matched'])} matched, {len(res['new_people'])} new, {len(res['conflicts'])} conflicts, "
          f"{len(res['updates'])} updates, {len(res['handles'])} handles -> {a.out}/merge-report.md")


if __name__ == "__main__":
    main()
