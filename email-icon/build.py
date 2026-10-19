"""Build the animated cj. profile picture (GIF + PNG + frames for MP4).
Run: python3 build.py, then encode the MP4 from frames-noir/ with ffmpeg (see README).

Look (Caleb, Oct 19 2026, after the Edward Sturm reel): black background, coral cj., and light that
emanates from behind the mark. A warm core swells behind the center, falls off radially through the
background with soft rays, and breathes. The letters stay crisp on top and are never touched by the light.
Inputs in source/: mask-ink.png and mask-ember.png rendered from source/cj-monogram.svg
(Instrument Serif glyphs and ember marks from the Caleb Jackson brand package, July 2026).
"""
from PIL import Image, ImageFilter
import numpy as np, math, os

SIZE = 320                       # output px (Google profile pictures want at least 250)
S = 2                            # supersample
BLACK = np.array([0x0A, 0x09, 0x08], float)
LETTERS = np.array([0xF2, 0x8A, 0x6A], float)   # ember lifted a touch so the mark floats above the light
LIGHT = np.array([0xE8, 0x77, 0x57], float)       # the light is brand ember, added over black so it stays saturated
WHITE_HOT = 0.16                                   # how much white the very center adds (0 = none)
CORE_REST, CORE_PEAK = 0.45, 0.82   # brightness of the light at rest and at peak
RADIUS_REST, RADIUS_PEAK = 0.40, 0.58  # how far the light reaches, as a fraction of SIZE
RAYS = 7                           # soft radial streaks
RAY_DEPTH = 0.30                   # how visible the rays are (0 = none)
PAD = 0.15                         # margin each side so the circle crop clears the mark
FPS, DUR = 10, 5.0                 # one full breath in seconds

W = SIZE * S

def load_mask(name):
    m = Image.open(f"source/{name}").convert("RGBA").split()[3]
    box = int(W * (1 - 2 * PAD))
    m.thumbnail((box, box), Image.LANCZOS)
    canvas = Image.new("L", (W, W), 0)
    canvas.paste(m, ((W - m.width) // 2, (W - m.height) // 2))
    return np.asarray(canvas, float) / 255.0

INK = load_mask("mask-ink.png")
EMBER = load_mask("mask-ember.png")
MARK = np.clip(INK + EMBER, 0, 1)

# polar coords around the visual center of the mark
ys, xs = np.mgrid[0:W, 0:W].astype(float)
cy, cx = np.argwhere(MARK > 0.5).mean(axis=0)
dx, dy = xs - cx, ys - cy
R = np.sqrt(dx * dx + dy * dy) / W
TH = np.arctan2(dy, dx)

def frame(t):
    e = 0.5 - 0.5 * math.cos(2 * math.pi * t)            # 0 rest, 1 peak
    core = CORE_REST + (CORE_PEAK - CORE_REST) * e
    reach = RADIUS_REST + (RADIUS_PEAK - RADIUS_REST) * e
    # radial falloff: bright at the center, gone by `reach`
    fall = np.clip(1 - R / reach, 0, 1) ** 1.6
    # soft rays, drifting very slowly, strongest mid-radius so the core stays clean
    rays = 1 + RAY_DEPTH * np.cos(RAYS * TH + 2 * math.pi * t * 0.5) * np.clip(R / reach, 0, 1) * (1 - fall)
    light = np.clip(fall * rays * core, 0, 1) ** 0.75   # gamma lift keeps the falloff coral instead of brown
    # additive light: ember scaled by intensity, plus a white-hot push only at the center
    img = BLACK + LIGHT * light[..., None] + 255.0 * WHITE_HOT * (light[..., None] ** 4)
    # the mark, untouched by the light
    img = img * (1 - MARK[..., None]) + LETTERS * MARK[..., None]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    return im.resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
frames = [frame(i / n) for i in range(n)]
pal = frame(0.5).convert("P", palette=Image.ADAPTIVE, colors=128)
q = [f.quantize(palette=pal, dither=Image.FLOYDSTEINBERG) for f in frames]
q[0].save("caleb-cj-avatar-noir.gif", save_all=True, append_images=q[1:], duration=int(1000 / FPS), loop=0, optimize=True)
frame(0.5).save("caleb-cj-avatar-noir.png")
os.makedirs("frames-noir", exist_ok=True)
for i, f in enumerate(frames): f.save(f"frames-noir/{i:03d}.png")
print("wrote caleb-cj-avatar-noir.gif/.png", n, "frames")
