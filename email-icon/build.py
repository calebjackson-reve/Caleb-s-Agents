"""Build the animated cj. profile picture (GIF + PNG + frames for MP4).
Run: python3 build.py, then encode the MP4s from frames-<variant>/ with ffmpeg (see README).

Look (Caleb, Oct 19 2026, after the Edward Sturm reel): black background, coral cj., and light that
emanates from behind the mark. A warm core swells behind the center, falls off radially through the
background with soft rays, and breathes. The letters stay crisp on top and are never touched by the light.
The mark is rendered from source/BodoniModa.ttf. The earlier Instrument Serif version (brand package glyphs,
source/cj-monogram.svg and the two mask PNGs) is kept in source/ for reference.
"""
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import numpy as np, math, os

SIZE = 320                       # output px (Google profile pictures want at least 250)
S = 2                            # supersample
EMBER = np.array([0xE8, 0x77, 0x57], float)
VARIANTS = {
    # black background, coral letters, ember light added over black
    "noir": dict(bg=np.array([0x0A, 0x09, 0x08], float), letters=np.array([0xF2, 0x8A, 0x6A], float),
                 mode="add", light=EMBER, white_hot=0.16, core=(0.45, 0.82), ring=None),
    # peach tan background, white letters, coral ring at the edge, light is a coral bloom the
    # background blends toward (darker and warmer at the center so the white letters gain contrast)
    "peach": dict(bg=np.array([0xE9, 0xC2, 0xA4], float), letters=np.array([0xFF, 0xFB, 0xF7], float),
                  mode="mix", light=EMBER, white_hot=0.0, core=(0.35, 0.75),
                  ring=dict(color=EMBER, radius=0.465, width=0.028)),
}
CORE_REST, CORE_PEAK = 0.45, 0.82   # default brightness of the light at rest and at peak (overridden per variant)
RADIUS_REST, RADIUS_PEAK = 0.40, 0.58  # how far the light reaches, as a fraction of SIZE
RAYS = 7                           # soft radial streaks
RAY_DEPTH = 0.30                   # how visible the rays are (0 = none)
PAD = 0.15                         # margin each side so the circle crop clears the mark
FONT = "source/BodoniModa.ttf"     # editorial high-contrast serif (SIL OFL). Caleb's pick, Oct 19 2026.
FONT_AXES = (520, 14)              # Bodoni Moda variable axes in font order: weight, optical size (6 = sturdiest hairlines)
TEXT = "CJ."
HAIRLINE = 5                       # odd px, at the 1600 px render: how much to thicken hairlines (1 = none)
TRACKING = 0.06                    # extra space between glyphs as a fraction of the font size
FPS, DUR = 10, 5.0                 # one full breath in seconds

W = SIZE * S

def render_mark():
    """Render TEXT with FONT into a mask that fits the padded square."""
    big = 1600
    font = ImageFont.truetype(FONT, big)
    try: font.set_variation_by_axes(list(FONT_AXES))
    except Exception: pass
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    gap = int(big * TRACKING)
    boxes = [probe.textbbox((0, 0), ch, font=font) for ch in TEXT]
    advs = [font.getlength(ch) for ch in TEXT]
    total = int(sum(advs) + gap * (len(TEXT) - 1))
    top = min(b[1] for b in boxes); bot = max(b[3] for b in boxes)
    m = Image.new("L", (total + 80, bot - top + 80), 0)
    d = ImageDraw.Draw(m); x = 40
    for ch, adv in zip(TEXT, advs):
        d.text((x, 40 - top), ch, font=font, fill=255); x += adv + gap
    m = m.crop(m.getbbox())
    # thicken the hairlines a touch so the didone survives at inbox size
    m = m.filter(ImageFilter.MaxFilter(HAIRLINE))
    box = int(W * (1 - 2 * PAD))
    m.thumbnail((box, box), Image.LANCZOS)
    canvas = Image.new("L", (W, W), 0)
    canvas.paste(m, ((W - m.width) // 2, (W - m.height) // 2))
    return np.asarray(canvas, float) / 255.0

INK = render_mark()
EMBER = np.zeros_like(INK)         # the whole mark is coral now; kept so the compositor is unchanged
MARK = np.clip(INK + EMBER, 0, 1)

# polar coords around the visual center of the mark
ys, xs = np.mgrid[0:W, 0:W].astype(float)
cy, cx = np.argwhere(MARK > 0.5).mean(axis=0)
dx, dy = xs - cx, ys - cy
R = np.sqrt(dx * dx + dy * dy) / W
TH = np.arctan2(dy, dx)

RC = np.sqrt((xs - W / 2) ** 2 + (ys - W / 2) ** 2) / W    # radius from the image center, for the ring

def frame(t, v):
    e = 0.5 - 0.5 * math.cos(2 * math.pi * t)            # 0 rest, 1 peak
    core = v["core"][0] + (v["core"][1] - v["core"][0]) * e
    reach = RADIUS_REST + (RADIUS_PEAK - RADIUS_REST) * e
    # radial falloff: bright at the center, gone by `reach`
    fall = np.clip(1 - R / reach, 0, 1) ** 1.6
    # soft rays, drifting very slowly, strongest mid-radius so the core stays clean
    rays = 1 + RAY_DEPTH * np.cos(RAYS * TH + 2 * math.pi * t * 0.5) * np.clip(R / reach, 0, 1) * (1 - fall)
    light = np.clip(fall * rays * core, 0, 1) ** 0.75   # gamma lift keeps the falloff coral instead of brown
    if v["mode"] == "add":
        # additive light: ember scaled by intensity, plus a white-hot push only at the center
        img = v["bg"] + v["light"] * light[..., None] + 255.0 * v["white_hot"] * (light[..., None] ** 4)
    else:
        # blended light: the background leans toward the light color where it is strongest
        img = v["bg"] + (v["light"] - v["bg"]) * light[..., None]
    if v["ring"]:
        r = v["ring"]; half = r["width"] / 2
        ring = np.clip(1 - np.abs(RC - r["radius"]) / half, 0, 1) ** 0.5 * (np.abs(RC - r["radius"]) < half)
        soft = np.clip((half - np.abs(RC - r["radius"])) * W / 2.0, 0, 1)     # 2 px anti-aliased edge
        img = img * (1 - soft[..., None]) + r["color"] * soft[..., None]
    # the mark, untouched by the light
    img = img * (1 - MARK[..., None]) + v["letters"] * MARK[..., None]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    return im.resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
for name, v in VARIANTS.items():
    frames = [frame(i / n, v) for i in range(n)]
    pal = frame(0.5, v).convert("P", palette=Image.ADAPTIVE, colors=128)
    q = [f.quantize(palette=pal, dither=Image.FLOYDSTEINBERG) for f in frames]
    q[0].save(f"caleb-cj-avatar-{name}.gif", save_all=True, append_images=q[1:], duration=int(1000 / FPS), loop=0, optimize=True)
    frame(0.5, v).save(f"caleb-cj-avatar-{name}.png")
    os.makedirs(f"frames-{name}", exist_ok=True)
    for i, f in enumerate(frames): f.save(f"frames-{name}/{i:03d}.png")
    print(f"wrote caleb-cj-avatar-{name}.gif/.png", n, "frames")
