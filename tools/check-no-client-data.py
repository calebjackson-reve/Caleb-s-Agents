#!/usr/bin/env python3
"""Refuse to push client data. Run before every push (and from the pre-push hook):

  python3 tools/check-no-client-data.py            # scans files changed vs origin/main plus the working tree
  python3 tools/check-no-client-data.py --all      # scans every tracked file

Checks, on every text file:
  1. Forbidden paths: anything under a reports/, out/, briefs/ or cache folder, *.audit.jsonl, contacts.csv, feed.json.
  2. US phone numbers, except the office line and obvious 555 test numbers.
  3. Email addresses, except aire@calebjackson.org, @example.com, @kw.com and vendor noreply senders.
  4. Real people's names, if ~/.aire/client-names.txt exists (one display name per line, never committed).
Exit 1 with the hits when anything is found. The hook refuses the push on exit 1.
"""
from __future__ import annotations
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
FORBIDDEN = re.compile(r"(^|/)(reports|out|briefs|cache)/|\.audit\.jsonl$|(^|/)contacts\.csv$|(^|/)feed\.json$|(^|/)cache\.json$")
PHONE = re.compile(r"(?<![\w/])(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b")
PHONE_OK = {"2257470303", "225 747 0303"}
EMAIL = re.compile(r"[\w.+-]+@[A-Za-z][\w-]*\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?")
EMAIL_OK = re.compile(r"(aire@calebjackson\.org|^caleb@|^cjjfrancis96@|@example\.(com|org)|^jane@x\.com|@kw\.com|noreply@|no-reply@|community@luxurypresence|secure@authentisign|callcenter@showingtime|support@|@anthropic\.com|@users\.noreply\.github\.com|@greensock\.com|\.(example|sample|demo|night|quiet|newlead)@)", re.I)
NAMES_FILE = Path(os.getenv("AIRE_CLIENT_NAMES", str(Path.home() / ".aire" / "client-names.txt")))
TEXT_EXT = {".md", ".py", ".ts", ".tsx", ".js", ".mjs", ".json", ".csv", ".txt", ".html", ".yml", ".yaml", ".toml", ".sh"}


def changed_files(all_files: bool) -> list[str]:
    if all_files:
        out = subprocess.check_output(["git", "ls-files"], text=True, cwd=ROOT)
    else:
        base = subprocess.run(["git", "merge-base", "HEAD", "origin/main"], text=True, capture_output=True, cwd=ROOT)
        ref = base.stdout.strip() or "HEAD~1"
        out = subprocess.check_output(["git", "diff", "--name-only", "--diff-filter=d", ref], text=True, cwd=ROOT)
        out += subprocess.check_output(["git", "diff", "--name-only", "--cached", "--diff-filter=d"], text=True, cwd=ROOT)
        out += subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"], text=True, cwd=ROOT)
    return sorted({f for f in out.splitlines() if f and (ROOT / f).is_file()})


def load_names() -> list[str]:
    if not NAMES_FILE.exists():
        return []
    names = []
    public = {"danielle musso", "crystal bonin"}  # other agents and vendors, public business names
    for line in NAMES_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.strip().lower() in public:
            continue
        n = line.strip()
        if len(n.split()) >= 2 and not n.startswith(("?", "+", "(")) and len(n) >= 6:
            names.append(n)
    return names


def scan(files: list[str]) -> list[str]:
    hits = []
    names = load_names()
    name_rx = re.compile("|".join(re.escape(n) for n in names), re.I) if names else None
    for f in files:
        if "node_modules" in f or f.startswith(("skills/", ".claude/", "audits/", "website-rebuild/", "architectural-preview/")) or "/verification/" in f:
            continue
        if FORBIDDEN.search(f):
            hits.append(f"{f}: forbidden path (client data folder)")
            continue
        p = ROOT / f
        if p.suffix.lower() not in TEXT_EXT:
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for m in PHONE.finditer(line):
                digits = re.sub(r"\D", "", m.group(0))[-10:]
                if digits not in PHONE_OK and not digits[3:6] == "555":
                    hits.append(f"{f}:{i}: phone {m.group(0)}")
            for m in EMAIL.finditer(line):
                if not EMAIL_OK.search(m.group(0)):
                    hits.append(f"{f}:{i}: email {m.group(0)}")
            if name_rx and (m := name_rx.search(line)):
                hits.append(f"{f}:{i}: client name {m.group(0)}")
    return hits


def main():
    files = changed_files("--all" in sys.argv)
    hits = scan(files)
    names = load_names()
    print(f"scanned {len(files)} files, names list {'loaded (' + str(len(names)) + ')' if names else 'absent (put display names in ' + str(NAMES_FILE) + ')'}")
    if hits:
        print("CLIENT DATA FOUND, do not push:")
        for h in hits[:200]:
            print("  " + h)
        sys.exit(1)
    print("clean")


if __name__ == "__main__":
    main()
