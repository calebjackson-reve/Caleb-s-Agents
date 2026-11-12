#!/usr/bin/env python3
"""Pull the 3D website repos in repos.json on demand.

  python3 pull.py list                 # every repo, its group and whether it is on disk
  python3 pull.py pull recommended     # one group: recommended, skills, examples
  python3 pull.py pull dioramas threeui  # by name
  python3 pull.py pull all
  python3 pull.py path dioramas        # print where a pulled repo lives
  python3 pull.py pull dioramas --latest   # newest commit instead of the checked one

Repos land in $WEB3D_CACHE, or ~/.cache/web-3d when that is not set. Nothing is
written inside this git repo. Each repo is checked out at the commit recorded in
repos.json, which is the commit that was checked before it was added here.
Nothing from a pulled repo is installed or run by this script.
"""
from __future__ import annotations
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPOS = json.loads((HERE / "repos.json").read_text())["repos"]
CACHE = Path(os.environ.get("WEB3D_CACHE") or Path.home() / ".cache" / "web-3d")
GROUPS = ("recommended", "skills", "examples")


def git(args: list[str], cwd: Path) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, text=True, capture_output=True).stdout.strip()


def head(dest: Path) -> str | None:
    if not (dest / ".git").is_dir():
        return None
    try:
        return git(["rev-parse", "HEAD"], dest)
    except subprocess.CalledProcessError:
        return None


def pull(entry: dict, latest: bool) -> bool:
    dest = CACHE / entry["name"]
    want = None if latest else entry["sha"]
    have = head(dest)
    if have and have == want:
        print(f"ready    {entry['name']}  {dest}")
        return True
    if dest.exists() and not have:
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/{entry['repo']}.git"
    try:
        if not have:
            git(["init", "-q"], dest)
            git(["remote", "add", "origin", url], dest)
        git(["fetch", "-q", "--depth", "1", "origin", want or "HEAD"], dest)
        git(["checkout", "-q", "--detach", "FETCH_HEAD"], dest)
    except subprocess.CalledProcessError as err:
        print(f"FAILED   {entry['name']}  {(err.stderr or '').strip().splitlines()[-1:] or err}")
        return False
    note = "latest, not checked" if latest else "checked commit"
    print(f"pulled   {entry['name']}  {head(dest)[:10]} ({note})  {dest}")
    return True


def select(words: list[str]) -> list[dict]:
    if "all" in words:
        return REPOS
    picked, unknown = [], []
    for word in words:
        hits = [r for r in REPOS if word in (r["name"], r["group"], r["repo"])]
        if not hits:
            unknown.append(word)
        picked += [r for r in hits if r not in picked]
    if unknown:
        names = ", ".join(r["name"] for r in REPOS)
        sys.exit(f"Unknown: {', '.join(unknown)}. Use a group ({', '.join(GROUPS)}), all, or one of: {names}")
    return picked


def main(argv: list[str]) -> int:
    latest = "--latest" in argv
    args = [a for a in argv if a != "--latest"]
    cmd = args[0] if args else "list"
    if cmd == "list":
        for group in GROUPS:
            print(f"\n{group}")
            for r in (r for r in REPOS if r["group"] == group):
                have = head(CACHE / r["name"])
                state = "on disk" if have == r["sha"] else ("on disk, other commit" if have else "not pulled")
                print(f"  {r['name']:<18} {r['size']:>5}  {state:<22} {r['use']}")
        print(f"\nCache: {CACHE}")
        return 0
    if cmd == "path":
        for r in select(args[1:]):
            print(CACHE / r["name"])
        return 0
    if cmd == "pull":
        if len(args) < 2:
            sys.exit("Say what to pull: a group, a name, or all.")
        results = [pull(r, latest) for r in select(args[1:])]
        print(f"\n{sum(results)} of {len(results)} ready in {CACHE}")
        return 0 if all(results) else 1
    sys.exit(__doc__)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
