#!/usr/bin/env python3
"""The pipeline. Runs the deterministic steps in order, writes a practice-run report, and only writes
to the CRM with --write after Caleb has read the report.

  python3 run_enrichment.py --dump-contacts            # out/contacts.json for gmail_signals.py
  python3 run_enrichment.py                            # score with whatever signal files exist in out/, write report
  python3 run_enrichment.py --llm --limit 150          # add the Haiku tagging pass (needs ANTHROPIC_API_KEY)
  python3 run_enrichment.py --write                    # apply to the sheet: columns Z.. on Contacts, label changes to Notes
  --local crm.json uses a local file instead of the sheet (tests, practice runs off the Mac).
"""
from __future__ import annotations
import argparse
import csv
import json
import os
import sys
from collections import Counter
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "out"
sys.path.insert(0, str(HERE))
from crm_client import open_crm, now_ct, ENRICH_COLUMNS  # noqa: E402
from identity import phone_key, email_key  # noqa: E402
from score_and_label import score_person  # noqa: E402


def load_json(p: Path, default):
    try:
        return json.loads(p.read_text())
    except Exception:
        return default


def run(crm, as_of: date, out: Path, llm: bool = False, limit: int = 150, dry_run: bool = True) -> dict:
    people = crm.contacts()
    msg = load_json(out / "imessage-signals.json", {})
    mail = load_json(out / "gmail-signals.json", {})
    soc = load_json(out / "social-signals.json", {})
    rows, snippets = [], {}
    for p in people:
        m = msg.get(phone_key(p.get("primary_phone"))) or msg.get(email_key(p.get("email")))
        g = mail.get(email_key(p.get("email")))
        s = soc.get(p["person_id"])
        r = score_person(p, m, g, s, as_of)
        rows.append(r)
        snips = (m or {}).get("recent_inbound", []) + (g or {}).get("recent_inbound", [])
        if snips:
            snippets[p["person_id"]] = snips
    # handles in the messages db that match nobody in the CRM: the real "unknown people" list
    known_phones = {phone_key(p.get("primary_phone")) for p in people}
    known_emails = {email_key(p.get("email")) for p in people}
    strangers = [(h, s) for h, s in msg.items() if h not in known_phones and h not in known_emails and s.get("in_365", 0) >= 2]
    strangers.sort(key=lambda x: -x[1]["in_90"])
    cost = 0.0
    if llm:
        from llm_tag import tag
        _, cost = tag(rows, snippets, limit, dry_run)
    for r in rows:
        r.setdefault("intent", ""); r.setdefault("timeline", ""); r.setdefault("area", ""); r.setdefault("next_touch", "")
        r.setdefault("enriched_at", now_ct())
    report = build_report(rows, strangers, as_of, msg, mail, soc, cost)
    out.mkdir(parents=True, exist_ok=True)
    (out / "enrichment-report.md").write_text(report)
    with (out / "enriched.csv").open("w", newline="") as f:
        keys = ["person_id", "display"] + ENRICH_COLUMNS + ["name_hints", "band_before", "stage_before"]
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader(); w.writerows(rows)
    return {"rows": rows, "strangers": strangers, "report": report, "cost": cost}


def build_report(rows, strangers, as_of, msg, mail, soc, cost) -> str:
    labels = Counter(r["aire_label"] for r in rows)
    changed = [r for r in rows if r["aire_label"] in ("hot", "warm") and r["band_before"] not in ("hot", "warm")]
    due = [r for r in rows if r["due"]]
    status = Counter(r["status"] for r in rows)
    hidden = [r for r in rows if r["hidden_lead"]]
    owes = sorted([r for r in rows if r["owes_reply"]], key=lambda r: r["last_inbound"])
    top = sorted(rows, key=lambda r: -r["signal_score"])[:25]
    named = [r for r in rows if r["name_hints"] and r["display"].startswith(("?", "+", "("))]
    L = [f"# Enrichment practice run, {as_of.isoformat()} (nothing written to the CRM)", "",
         f"Signals loaded: iMessage {len(msg)} handles, Gmail {len(mail)} addresses, social {len(soc)} people. "
         f"{'No message signals yet, labels come from the CRM columns alone.' if not (msg or mail) else ''}",
         f"Haiku tagging cost this run: ${cost:.4f}" if cost else "Haiku tagging pass: not run.", "",
         "## Temperature", ""]
    for k in ("hot", "warm", "lukewarm", "cold", "ice-cold"):
        L.append(f"- {k}: {labels.get(k, 0)}")
    L += ["", f"Status: {status.get('ok', 0)} ok, {status.get('do-not-contact', 0)} do not contact, {status.get('vendor-agent', 0)} vendor or agent (never on a touch list)", "",
          f"## Due now ({len(due)}): owed a reply or past their cadence (hot 7d, warm 14d, lukewarm 30d, cold 90d, ice-cold 365d)", ""]
    for k in ("hot", "warm", "lukewarm", "cold", "ice-cold"):
        n = sum(1 for r in due if r["aire_label"] == k)
        if n:
            L.append(f"- {k}: {n}")
    for r in sorted([r for r in due if r["aire_label"] in ("hot", "warm")], key=lambda r: -r["signal_score"])[:40]:
        L.append(f"- {r['aire_label']:8} {r['display']} (#{r['person_id']}) last in {r['last_inbound'] or 'never'}, last out {r['last_outbound'] or 'never'}{', owes reply' if r['owes_reply'] else ''}")
    L += ["", f"## Hidden leads ({len(hidden)}): real estate intent in their own messages, CRM did not have them as a lead", ""]
    for r in hidden[:40]:
        L.append(f"- {r['display']} (#{r['person_id']}) score {r['signal_score']}, {r['keywords']}, last inbound {r['last_inbound']}")
    L += ["", f"## Would move up ({len(changed)}): hot or warm now, band was {{{', '.join(sorted({r['band_before'] or 'blank' for r in changed}))}}}", ""]
    for r in changed[:40]:
        L.append(f"- {r['display']} (#{r['person_id']}): {r['band_before'] or 'no band'} -> {r['aire_label']}, score {r['signal_score']}")
    L += ["", f"## Caleb owes a reply ({len(owes)})", ""]
    for r in owes[:40]:
        L.append(f"- {r['display']}: last inbound {r['last_inbound']}, last outbound {r['last_outbound'] or 'never'}")
    L += ["", f"## Names recovered from message text ({len(named)}): phone-only rows where someone said who they are", ""]
    for r in named[:40]:
        L.append(f"- #{r['person_id']} {r['display']}: {r['name_hints']}")
    L += ["", f"## People texting Caleb who are not in the CRM at all ({len(strangers)})", ""]
    for h, s in strangers[:40]:
        L.append(f"- {h}: {s['in_90']} inbound in 90 days, hints {', '.join(s.get('name_hints', [])[:2]) or 'none'}, keywords {', '.join(s['keyword_hits']) or 'none'}")
    L += ["", "## Top 25 by signal score", ""]
    for r in top:
        L.append(f"- {r['signal_score']:4d}  {r['aire_label']:16} {r['display']} ({r['band_before'] or 'no band'}) {r['keywords']}")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local")
    ap.add_argument("--as-of")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--dump-contacts", action="store_true")
    ap.add_argument("--llm", action="store_true")
    ap.add_argument("--limit", type=int, default=150)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    crm = open_crm(a.local)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    if a.dump_contacts:
        (out / "contacts.json").write_text(json.dumps(crm.contacts()))
        print(f"contacts.json written to {out}")
        return
    as_of = date.fromisoformat(a.as_of) if a.as_of else date.today()
    dry = os.getenv("DRY_RUN", "1") != "0"
    res = run(crm, as_of, out, llm=a.llm, limit=a.limit, dry_run=dry and not a.write)
    print(res["report"].split("## Hidden leads")[0])
    print(f"Report: {out / 'enrichment-report.md'}  Rows: {out / 'enriched.csv'}")
    if a.write:
        rows = res["rows"]
        n = crm.write_enrichment(rows)
        notes = [{"At": now_ct(), "person_id": r["person_id"], "display": r["display"],
                  "Note": f"AIRE label {r['aire_label']} (was band {r['band_before'] or 'blank'}), score {r['signal_score']}, {r['keywords'] or 'no keywords'}",
                  "By": "AIRE enrichment"}
                 for r in rows if r["aire_label"] in ("hot", "warm") and r["band_before"] not in ("hot", "warm")]
        crm.add_notes(notes)
        print(f"WROTE enrichment columns for {n} people and {len(notes)} notes.")


if __name__ == "__main__":
    main()
