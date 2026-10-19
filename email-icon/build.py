"""Build the animated cj. email icon (GIF + static PNG) from the brand monogram.
Run: python3 build.py
Inputs in source/: mask-ink.png and mask-ember.png, rendered from source/cj-monogram.svg
(Instrument Serif glyphs and ember marks from the Caleb Jackson brand package, July 2026).
"""
from PIL import Image, ImageFilter
import math

import sys
SIZE = 320                    # output size in px (Google profile pictures want at least 250)
IVORY = (0xFB, 0xF8, 0xF3)    # brand ivory
INK = (0x14, 0x10, 0x0E)      # brand ink
EMBER = (0xE8, 0x77, 0x57)    # brand ember (coral)
BLACK = (0x0A, 0x09, 0x08)
# Variants. Google crops the profile picture to a circle, so the mark sits inside the inner 70%.
VARIANTS = {
    "noir": dict(bg=BLACK,
                 ink=(0xF2, 0x8C, 0x6E), ember=(0xF2, 0x8C, 0x6E),   # letters: ember lifted a touch so they sit on top of the glow
                 glow=(0xD9, 0x5E, 0x3C),                            # glow: ember deepened so it reads as light, not paint
                 core=(0.9, 1.5),       # tight glow hugging the letters: gain at rest, at peak
                 bloom=(0.9, 1.9),      # wide emanating glow: gain at rest, at peak
                 spread=(0.05, 0.13)),  # bloom radius as a fraction of SIZE: at rest, at peak
}
PAD = 0.15                        # margin each side; the circle crop still clears the mark
FPS, DUR = 10, 4.8                # one full breath in seconds
S = 3                             # supersample

def load_mask(name):
    m = Image.open(f"source/{name}").convert("RGBA").split()[3]   # alpha channel
    # fit the tall mark into a square with padding
    box = int(S * SIZE * (1 - 2 * PAD))
    m.thumbnail((box, box), Image.LANCZOS)
    canvas = Image.new("L", (S * SIZE, S * SIZE), 0)
    canvas.paste(m, ((canvas.width - m.width) // 2, (canvas.height - m.height) // 2))
    return canvas

INK_M = load_mask("mask-ink.png")
EMBER_M = load_mask("mask-ember.png")
HALO = Image.composite(Image.new("L", INK_M.size, 255), Image.new("L", INK_M.size, 0),
                       Image.eval(Image.merge("L", [INK_M]).point(lambda v: v), lambda v: v)) if False else None
BOTH = Image.eval(Image.merge("L", [INK_M]), lambda v: v)
BOTH.paste(255, mask=EMBER_M)
CORE = BOTH.filter(ImageFilter.GaussianBlur(0.012 * SIZE * S))
_bloom_cache = {}
def bloom(radius_px):
    key = int(radius_px)
    if key not in _bloom_cache:
        _bloom_cache[key] = BOTH.filter(ImageFilter.GaussianBlur(key))
    return _bloom_cache[key]

def mix(a, b, t): return a + (b - a) * t

def gain(mask, g):
    return mask.point(lambda p: min(255, int(p * g)))

def frame(t, v):
    e = 0.5 - 0.5 * math.cos(2 * math.pi * t)          # 0 at rest, 1 at peak, eased
    im = Image.new("RGB", INK_M.size, v["bg"])
    glow = Image.new("RGB", im.size, v["glow"])
    hot = Image.new("RGB", im.size, tuple(int(c + (255 - c) * 0.18) for c in v["glow"]))
    r = mix(*v["spread"], e) * SIZE * S
    b = mix(*v["bloom"], e)
    # emanating glow, built up additively from wide to tight so it fades to black at the edge
    acc = Image.new("L", im.size, 0)
    for radius, k in ((r * 2.4, 0.35), (r * 1.4, 0.55), (r, 0.8), (r * 0.5, 1.0)):
        acc = Image.eval(Image.blend(acc, gain(bloom(radius), b * k), 0.5), lambda p: min(255, p * 2))
    im.paste(glow, mask=acc)
    im.paste(hot, mask=gain(CORE, mix(*v["core"], e)).point(lambda p: int(p * 0.6)))
    im.paste(Image.new("RGB", im.size, v["ink"]), mask=INK_M)
    im.paste(Image.new("RGB", im.size, v["ember"]), mask=EMBER_M)
    return im.resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
import os
for name, v in VARIANTS.items():
    frames = [frame(i / n, v) for i in range(n)]
    pal = frame(0.5, v).convert("P", palette=Image.ADAPTIVE, colors=96)
    q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
    q[0].save(f"caleb-cj-avatar-{name}.gif", save_all=True, append_images=q[1:],
              duration=int(1000 / FPS), loop=0, optimize=True)
    frame(0.5, v).save(f"caleb-cj-avatar-{name}.png")
    os.makedirs(f"frames-{name}", exist_ok=True)
    for i, f in enumerate(frames):
        f.save(f"frames-{name}/{i:03d}.png")
    print(f"wrote caleb-cj-avatar-{name}.gif/.png", n, "frames")
