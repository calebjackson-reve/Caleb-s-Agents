#!/usr/bin/env python3
"""Assemble aire/world/index.html from src/page.html and data.json.

The page fetches data.json every 60 seconds when served; the copy injected
here is only the first frame and the fallback for a file:// open.

Run:  python3 aire/world/build.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    page = open(os.path.join(HERE, "src", "page.html"), encoding="utf-8").read()
    data = json.load(open(os.path.join(HERE, "data.json"), encoding="utf-8"))
    seed = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    out = page.replace("__DATA__", seed)
    path = os.path.join(HERE, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {os.path.relpath(path)} ({len(out):,} bytes, synced {data.get('sync', {}).get('at')})")


if __name__ == "__main__":
    main()
