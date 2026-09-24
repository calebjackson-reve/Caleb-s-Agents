#!/usr/bin/env python3
"""Commit guard: no client data, secrets, databases, or backups may enter git.

Used by .githooks/pre-commit (staged files) and standalone (`--all` scans every tracked file,
or pass paths). Exit 1 on any finding; exit 0 when clean.

Checks: real client names (loaded read-only from the local production database when it exists,
never stored in the repo; people with a phone/email identity and message history, organisation-like
names excluded); Louisiana phone numbers other than the fictional 555 exchange; emails outside the
owner/vendor allowlist; street addresses (unless the street name is an obvious fixture word such as Fixture, Test, Example); secret-looking tokens; database/backup/archive file
types; any file over 5 MB. A line may carry `pii-scan: allow` to mark a reviewed false positive.
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION_DB = Path.home() / "Library" / "Application Support" / "AIRE" / "brain.db"
TEXT = (".md", ".txt", ".json", ".py", ".html", ".css", ".js", ".sh", ".yaml", ".yml", ".toml", ".csv", ".plist", ".sql")
BLOCKED_SUFFIXES = (".db", ".sqlite", ".sqlite3", ".enc", ".db-wal", ".db-shm", ".bundle", ".fig", ".zip", ".tar", ".gz")
MAX_BYTES = 5 * 1024 * 1024
PHONE = re.compile(r"(?<![\d(])\(?(?:225|985|337|318|504)\)?[\s.-]?(?!555)\d{3}[\s.-]?\d{4}\b")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
EMAIL_ALLOW = ("calebjackson.org", "example.com", ".test", "example.org", "anthropic.com", "kw.com",
               "github.com", "apple.com", "google.com", "googleapis.com", "openai.com", "localhost")
SYNTHETIC_WORDS = re.compile(r"\b(?:Fixture|Test|Example|Sample|Placeholder|Demo|Mock|Synthetic|Dummy|Fake)\b")
ADDRESS = re.compile(r"\b\d{3,5}\s+[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Ct|Court|Hwy|Cir|Pl|Trail|Trce)\b")
SECRET = re.compile(r"(sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35})")
ORG_WORDS = re.compile(r"(keller|williams|luxury|presence|google|apple|zapier|lone wolf|task map|command|realt|mortgage|title|insurance|bank|llc|inc\b|group|team|properties|homes|lending|closing|notary|inspection|roofing|plumbing|pest|hvac|electric|lawn|cleaning|photography|media|studio|design|church|school|clinic|dental|pharmacy|hospital|support|service|customer|office|store|shop|market|restaurant|cafe|pizza|grill|kitchen|salon|gym|fitness|auto|tire|rental|storage|delivery|uber|lyft|amazon|verizon|at&t|cox|entergy|utility)", re.I)


def client_names() -> re.Pattern | None:
    if not PRODUCTION_DB.exists():
        return None
    try:
        database = sqlite3.connect(f"file:{PRODUCTION_DB}?mode=ro", uri=True)
        rows = database.execute("""SELECT DISTINCT p.display_name FROM person p
          WHERE EXISTS (SELECT 1 FROM identity i WHERE i.person_id=p.id AND i.kind IN ('phone','email'))
            AND EXISTS (SELECT 1 FROM event e WHERE e.person_id=p.id)
            AND length(p.display_name) >= 8 AND p.display_name LIKE '% %'""").fetchall()
        database.close()
    except sqlite3.Error:
        return None
    names = [n for (n,) in rows if n and not n.lower().startswith("caleb") and not ORG_WORDS.search(n)]
    if not names:
        return None
    return re.compile(r"\b(?:" + "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True)) + r")\b")


def staged_files() -> list[str]:
    out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"], capture_output=True, text=True, cwd=ROOT)
    return [line for line in out.stdout.splitlines() if line]


def tracked_files() -> list[str]:
    out = subprocess.run(["git", "ls-files"], capture_output=True, text=True, cwd=ROOT)
    return [line for line in out.stdout.splitlines() if line]


def scan_file(path: str, names: re.Pattern | None, staged: bool) -> list[str]:
    findings = []
    full = ROOT / path
    lower = path.lower()
    if lower.endswith(BLOCKED_SUFFIXES):
        return [f"{path}: database/backup/archive file type is never committed"]
    if staged:
        blob = subprocess.run(["git", "show", f":{path}"], capture_output=True, cwd=ROOT).stdout
    else:
        try:
            blob = full.read_bytes()
        except OSError:
            return []
    if len(blob) > MAX_BYTES:
        findings.append(f"{path}: {len(blob)//1024//1024} MB exceeds the 5 MB limit")
    if not lower.endswith(TEXT):
        return findings
    text = blob.decode("utf-8", errors="ignore")
    for number, line in enumerate(text.split("\n"), 1):
        if "pii-scan: allow" in line:
            continue
        if SECRET.search(line):
            findings.append(f"{path}:{number}: secret-looking token")
        if PHONE.search(line):
            findings.append(f"{path}:{number}: phone number")
        for address in EMAIL.findall(line):
            if not address.lower().endswith(EMAIL_ALLOW):
                findings.append(f"{path}:{number}: email address outside the allowlist")
                break
        address = ADDRESS.search(line)
        if address and not SYNTHETIC_WORDS.search(address.group(0)):
            findings.append(f"{path}:{number}: street address")
        if names and names.search(line):
            findings.append(f"{path}:{number}: client name")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("paths", nargs="*", help="files to scan (default: staged files)")
    parser.add_argument("--all", action="store_true", help="scan every tracked file")
    args = parser.parse_args()
    staged = not args.paths and not args.all
    files = tracked_files() if args.all else (args.paths or staged_files())
    names = client_names()
    findings = []
    for path in files:
        findings.extend(scan_file(path, names, staged))
    if findings:
        print("pii-scan: BLOCKED\n  " + "\n  ".join(findings[:60]), file=sys.stderr)
        if len(findings) > 60:
            print(f"  … {len(findings) - 60} more", file=sys.stderr)
        return 1
    print(f"pii-scan: clean ({len(files)} files; client-name dictionary {'loaded' if names else 'unavailable'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
