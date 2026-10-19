"""Build the animated cj. email icon (GIF + static PNG) from the brand monogram.
Run: python3 build.py
Inputs in source/: mask-ink.png and mask-ember.png, rendered from source/cj-monogram.svg
(Instrument Serif glyphs and ember marks from the Caleb Jackson brand package, July 2026).
"""
from PIL import Image, ImageFilter
import math

import sys
SIZE = 400                    # output size in px (Google profile pictures want at least 250)
IVORY = (0xFB, 0xF8, 0xF3)    # brand ivory
INK = (0x14, 0x10, 0x0E)      # brand ink
EMBER = (0xE8, 0x77, 0x57)    # brand ember (coral)
# Variants. Google crops the profile picture to a circle, so the mark sits inside the inner 60%.
VARIANTS = {
    "ivory": dict(bg=IVORY, ink=INK, ember=EMBER, glow=EMBER, glow_min=0.20, glow_max=0.60),
    "ember": dict(bg=EMBER, ink=IVORY, ember=IVORY, glow=IVORY, glow_min=0.12, glow_max=0.45),
}
PAD = 0.15                        # margin each side; the circle crop still clears the mark
FPS, DUR = 12, 3.6                # one full breath in seconds
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
HALO = BOTH.filter(ImageFilter.GaussianBlur(0.07 * SIZE * S))

def frame(t, v):
    g = v["glow_min"] + (v["glow_max"] - v["glow_min"]) * (0.5 - 0.5 * math.cos(2 * math.pi * t))
    im = Image.new("RGB", INK_M.size, v["bg"])
    im.paste(Image.new("RGB", im.size, v["glow"]), mask=HALO.point(lambda p: int(p * g)))
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
