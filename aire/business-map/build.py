#!/usr/bin/env python3
"""Assemble index.html for the AIRE Business Map.

Reads src/page.html, injects data.json (the map, built by build_map_data.py)
and sfx/sfx.json (the earshot-rendered interface sounds as data URIs), and
writes index.html, the file that gets published as the artifact.

Run:  python3 aire/business-map/build.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    page = open(os.path.join(HERE, "src", "page.html"), encoding="utf-8").read()
    data = json.load(open(os.path.join(HERE, "data.json"), encoding="utf-8"))
    sfx = json.load(open(os.path.join(HERE, "sfx", "sfx.json"), encoding="utf-8"))
    # </script> inside a JSON string would end the data block early; escape it.
    data_s = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    sfx_s = json.dumps(sfx, separators=(",", ":"))
    out = page.replace("__MAP_DATA__", data_s).replace("__SFX__", sfx_s)
    path = os.path.join(HERE, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {os.path.relpath(path)} ({len(out):,} bytes, {len(data['nodes'])} nodes, {len(sfx)} sounds)")


if __name__ == "__main__":
    main()
