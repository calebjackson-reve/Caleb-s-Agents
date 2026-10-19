"""Build the animated cj. email icon (GIF + static PNG) from the brand monogram.
Run: python3 build.py
Inputs in source/: mask-ink.png and mask-ember.png, rendered from source/cj-monogram.svg
(Instrument Serif glyphs and ember marks from the Caleb Jackson brand package, July 2026).
"""
from PIL import Image, ImageFilter
import math

SIZE = 160                    # output size in px
BG = (255, 255, 255)          # email white; brand ivory is (251, 248, 243)
INK = (0x14, 0x10, 0x0E)      # brand ink
EMBER = (0xE8, 0x77, 0x57)    # brand ember (coral)
GLOW_MIN, GLOW_MAX = 0.18, 0.55   # how faint and how strong the ember glow breathes
DOT_LIFT = 0.0                    # how much the ember marks brighten at peak (0 = none)
FPS, DUR = 12, 3.6                # one full breath in seconds
S = 4                             # supersample

def load_mask(name):
    m = Image.open(f"source/{name}").convert("RGBA").split()[3]   # alpha channel
    # fit the tall mark into a square with padding
    pad = 0.05
    box = int(S * SIZE * (1 - 2 * pad))
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
HALO = BOTH.filter(ImageFilter.GaussianBlur(13 * S))

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def frame(t):
    g = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 - 0.5 * math.cos(2 * math.pi * t))
    im = Image.new("RGB", INK_M.size, BG)
    im.paste(Image.new("RGB", im.size, EMBER), mask=HALO.point(lambda v: int(v * g)))
    im.paste(Image.new("RGB", im.size, INK), mask=INK_M)
    ember = lerp(EMBER, (255, 255, 255), DOT_LIFT * (g - GLOW_MIN) / (GLOW_MAX - GLOW_MIN))
    im.paste(Image.new("RGB", im.size, ember), mask=EMBER_M)
    return im.resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
frames = [frame(i / n) for i in range(n)]
pal = frame(0.5).convert("P", palette=Image.ADAPTIVE, colors=96)
q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
q[0].save("caleb-cj-icon.gif", save_all=True, append_images=q[1:],
          duration=int(1000 / FPS), loop=0, optimize=True)
frame(0.5).save("caleb-cj-icon.png")
print("wrote caleb-cj-icon.gif and caleb-cj-icon.png", n, "frames")
