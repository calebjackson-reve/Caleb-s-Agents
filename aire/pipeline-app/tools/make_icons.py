#!/usr/bin/env python3
"""Draws the Pipeline icon (a cyan ring on the HUD background) as SVG and PNG. Standard library only.

    python3 tools/make_icons.py        # writes static/icons/icon.svg, icon-192.png, icon-512.png, icon-512-maskable.png
"""
from __future__ import annotations

import math
import pathlib
import struct
import zlib

OUT = pathlib.Path(__file__).resolve().parents[1] / "static" / "icons"
BG = (4, 23, 44)          # #04172c
CYAN = (43, 217, 255)     # #2bd9ff
DEEP = (14, 143, 184)     # #0e8fb8

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#04172c"/>
<circle cx="256" cy="256" r="150" fill="none" stroke="#2bd9ff" stroke-width="22" opacity="0.95"/>
<circle cx="256" cy="256" r="104" fill="none" stroke="#2bd9ff" stroke-width="8" opacity="0.6"/>
<circle cx="256" cy="256" r="34" fill="#2bd9ff"/>
<circle cx="256" cy="256" r="196" fill="none" stroke="#2bd9ff" stroke-width="3" opacity="0.35" stroke-dasharray="14 18"/>
</svg>
"""


def png(width: int, height: int, pixel) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixel(x, y))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def icon(size: int, maskable: bool) -> bytes:
    c = size / 2
    pad = 0.0 if maskable else 1.0
    scale = size / 512 * (0.8 if maskable else 1.0)

    def pixel(x, y):
        px, py = x + 0.5, y + 0.5
        # rounded square only for the plain icon; maskable fills the whole canvas
        if not maskable:
            r = 112 * size / 512
            dx, dy = max(abs(px - c) - (c - r), 0), max(abs(py - c) - (c - r), 0)
            if math.hypot(dx, dy) > r:
                return (0, 0, 0)  # outside the rounded corner; PNG has no alpha here, so keep it dark
        d = math.hypot(px - c, py - c) / scale
        col = BG
        glow = math.exp(-((d - 150) ** 2) / (2 * 40 ** 2)) * 0.35
        col = mix(col, DEEP, glow)
        if abs(d - 150) <= 11:
            col = mix(CYAN, col, max(0, abs(d - 150) - 9.5) / 1.5)
        elif abs(d - 104) <= 4:
            col = mix(mix(col, CYAN, 0.6), col, max(0, abs(d - 104) - 3) / 1.0)
        elif d <= 34:
            col = mix(CYAN, col, max(0, d - 33) / 1.0)
        elif abs(d - 196) <= 1.5:
            ang = math.degrees(math.atan2(py - c, px - c)) % 360
            if int(ang / 360 * 38) % 2 == 0:
                col = mix(col, CYAN, 0.35)
        return col

    return png(size, size, pixel)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "icon.svg").write_text(SVG, encoding="utf-8")
    (OUT / "icon-192.png").write_bytes(icon(192, False))
    (OUT / "icon-512.png").write_bytes(icon(512, False))
    (OUT / "icon-512-maskable.png").write_bytes(icon(512, True))
    print("wrote", sorted(p.name for p in OUT.iterdir()))


if __name__ == "__main__":
    main()
