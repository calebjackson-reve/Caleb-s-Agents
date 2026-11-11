#!/usr/bin/env bash
# Machine-checkable completeness proof for the 2026-10-06 research packet.
# Proves packaging only: files exist, are non-empty, are linked from README, and CSV row counts meet thresholds.
set -u
cd "$(dirname "$0")"
fail=0
req_files=(README.md 01-executive-brief.md 02-baseline-and-access-inventory.md 03-lp-site-gbp-audit.md 04-competitors.md 05-keyword-geography-content-map.md 06-ai-visibility.md 07-promotion-offers.md 08-roadmap-and-backlog.md 09-change-drafts.md 10-source-register-coverage-approvals.md PROJECT-RECORD-ADDENDUM.md
csv/access-matrix.csv csv/baseline.csv csv/url-remediation.csv csv/competitor-inventory.csv csv/competitor-matrix.csv csv/keyword-library.csv csv/serp-benchmark.csv csv/editorial-backlog-90d.csv csv/ai-prompt-library.csv csv/ai-run-log.csv csv/offers.csv csv/implementation-backlog.csv csv/source-register.csv csv/coverage-table.csv
briefs/01-zachary-seller-page.md briefs/02-seller-net-sheet-explainer.md briefs/03-flood-zone-x-ebr.md briefs/04-zachary-relocation-guide.md briefs/05-true-monthly-cost-worked-example.md briefs/06-st-francisville-service-area.md briefs/07-false-river-buyer-guide.md briefs/08-felicianas-acreage-guide.md briefs/09-compare-louisiana-agents.md briefs/10-monthly-market-note.md
drafts/metadata-drafts.md drafts/gbp-field-drafts.md drafts/about-page-draft.md drafts/citation-corrections.md drafts/schema-draft.jsonld drafts/lp-support-request-draft.md drafts/gbp-posting-plan-month-1.md
raw/metricool-gbp-export-2026-10-06.json raw/metricool-instagram-export-2026-10-06.json raw/host-reachability-2026-10-06.txt)
for f in "${req_files[@]}"; do
  if [ ! -s "$f" ]; then echo "MISSING or EMPTY: $f"; fail=1; fi
done
# README linkage: every markdown deliverable and csv must be referenced
for f in "${req_files[@]}"; do
  case "$f" in README.md|briefs/*|raw/*) continue;; esac
  if ! grep -q "$(basename "$f")" README.md; then echo "NOT LINKED FROM README: $f"; fail=1; fi
done
grep -q "briefs/01" README.md || { echo "briefs not linked"; fail=1; }
# Row-count thresholds (data rows = lines - 1)
check_rows() { local f=$1 min=$2; local n=$(($(wc -l < "$f") - 1)); if [ "$n" -lt "$min" ]; then echo "TOO FEW ROWS: $f has $n, needs $min"; fail=1; else echo "ok $f rows=$n (>= $min)"; fi; }
check_rows csv/competitor-inventory.csv 20
check_rows csv/competitor-matrix.csv 10
check_rows csv/keyword-library.csv 60
check_rows csv/serp-benchmark.csv 30
check_rows csv/ai-prompt-library.csv 24
check_rows csv/ai-run-log.csv 12
check_rows csv/implementation-backlog.csv 10
check_rows csv/editorial-backlog-90d.csv 10
check_rows csv/coverage-table.csv 20
check_rows csv/source-register.csv 15
# CSV column consistency
python3 - <<'PY' || fail=1
import csv,glob,sys
bad=0
for p in sorted(glob.glob('csv/*.csv')):
    rows=list(csv.reader(open(p,newline='')))
    w=len(rows[0])
    for i,r in enumerate(rows[1:],2):
        if len(r)!=w:
            print(f"COLUMN MISMATCH {p} line {i}: {len(r)} vs header {w}"); bad=1
print("csv column check:", "ok" if not bad else "FAIL")
sys.exit(bad)
PY
# No client PII guard: a few transaction-thread names must not appear
if grep -rqiE "cruden bay|pecan tree|lockhart lane" --include=*.md --include=*.csv --include=*.json .; then echo "PII GUARD FAILED"; fail=1; else echo "ok pii guard"; fi
if [ $fail -eq 0 ]; then echo "VERIFY: PASS ($(find . -type f | wc -l) files)"; else echo "VERIFY: FAIL"; fi
exit $fail
