"""Build the 'burst' avatar: a close match to the Airbnb logo animation in the Edward Sturm reel,
in Caleb's coral. Vivid saturated coral field, thick white neon-glowing CJ., a hot white burst at the
center throwing soft rays to the edges, drifting sparkles, a slow pulse. Run: python3 build_burst.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, math, os

SIZE, S = 320, 2
W = SIZE * S
FONT, AXES = "source/BodoniModa.ttf", (900, 6)     # Bodoni Moda black, small optical size: thick strokes
TEXT, TRACKING, PAD = "CJ.", 0.04, 0.17
FIELD = np.array([0xE8, 0x77, 0x57], float)        # exact brand ember coral
FIELD_EDGE = np.array([0xCB, 0x5E, 0x40], float)   # the same coral, a step deeper at the rim
HOT = np.array([0xFF, 0xE6, 0xDC], float)          # white-pink core of the burst
WHITE = np.array([255, 255, 255], float)
FPS, DUR = 12, 4.0
RAYS, SPARKLES = 28, 0
rng = np.random.default_rng(7)

def render_mark():
    big = 1600
    font = ImageFont.truetype(FONT, big)
    try: font.set_variation_by_axes(list(AXES))
    except Exception: pass
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    gap = int(big * TRACKING)
    boxes = [probe.textbbox((0, 0), ch, font=font) for ch in TEXT]
    advs = [font.getlength(ch) for ch in TEXT]
    total = int(sum(advs) + gap * (len(TEXT) - 1)); top = min(b[1] for b in boxes); bot = max(b[3] for b in boxes)
    m = Image.new("L", (total + 80, bot - top + 80), 0); d = ImageDraw.Draw(m); x = 40
    for ch, adv in zip(TEXT, advs):
        d.text((x, 40 - top), ch, font=font, fill=255); x += adv + gap
    m = m.crop(m.getbbox()).filter(ImageFilter.MaxFilter(7))
    box = int(W * (1 - 2 * PAD)); m.thumbnail((box, box), Image.LANCZOS)
    canvas = Image.new("L", (W, W), 0); canvas.paste(m, ((W - m.width) // 2, (W - m.height) // 2))
    return canvas

MARK_IMG = render_mark()
MARK = np.asarray(MARK_IMG, float) / 255.0
NEON_IN = np.asarray(MARK_IMG.filter(ImageFilter.GaussianBlur(0.012 * W)), float) / 255.0   # tight neon halo
NEON_OUT = np.asarray(MARK_IMG.filter(ImageFilter.GaussianBlur(0.05 * W)), float) / 255.0   # wide soft halo

ys, xs = np.mgrid[0:W, 0:W].astype(float)
cx = cy = W / 2
dx, dy = xs - cx, ys - cy
R = np.sqrt(dx * dx + dy * dy) / (W / 2)           # 0 center, 1 at the circle edge
TH = np.arctan2(dy, dx)
ray_amp = rng.uniform(0.3, 1.0, RAYS); ray_phase = rng.uniform(0, 2 * math.pi, RAYS); ray_k = rng.integers(3, 9, RAYS)
sp_x = rng.uniform(0, 1, SPARKLES); sp_y = rng.uniform(0, 1, SPARKLES); sp_ph = rng.uniform(0, 2 * math.pi, SPARKLES)
sp_sz = rng.uniform(0.004, 0.011, SPARKLES); sp_drift = rng.uniform(-1, 1, (SPARKLES, 2)) * 0.02

def frame(t):
    pulse = 0.5 - 0.5 * math.cos(2 * math.pi * t)          # 0..1..0 over the loop
    # field: deeper at the rim
    img = FIELD + (FIELD_EDGE - FIELD) * np.clip(R, 0, 1)[..., None] ** 1.5
    # rays: sum of a few angular harmonics, slowly turning, fading with radius, strongest mid-field
    rays = np.zeros_like(R)
    for a, p, k in zip(ray_amp, ray_phase, ray_k):
        rays += a * np.clip(np.cos(k * TH + p + 2 * math.pi * t * (0.5 if k % 2 else -0.5)), 0, 1) ** 6
    rays = rays / rays.max()
    rays *= np.clip(1 - R, 0, 1) ** 0.8 * np.clip(R * 3, 0, 1)
    # burst core
    core = np.exp(-(R / (0.22 + 0.08 * pulse)) ** 2) * (0.62 + 0.23 * pulse)
    # horizontal lens streak
    streak = np.exp(-(dy / (0.012 * W)) ** 2) * np.clip(1 - np.abs(dx) / (W * 0.5), 0, 1) ** 2 * (0.25 + 0.15 * pulse)
    light = np.clip(core + 0.35 * rays * (0.7 + 0.3 * pulse) + streak, 0, 1)
    img = img + (HOT - img) * light[..., None] ** 1.3
    # sparkles: tiny soft dots, twinkling and drifting
    spark = np.zeros_like(R)
    for i in range(SPARKLES):
        px = (sp_x[i] + sp_drift[i, 0] * t) % 1.0 * W; py = (sp_y[i] + sp_drift[i, 1] * t) % 1.0 * W
        tw = 0.5 + 0.5 * math.sin(2 * math.pi * (t * 2 + sp_ph[i]))
        spark += tw * np.exp(-((xs - px) ** 2 + (ys - py) ** 2) / (sp_sz[i] * W) ** 2)
    img = img + (WHITE - img) * np.clip(spark, 0, 1)[..., None] * 0.8
    # neon mark: wide halo, tight halo, then solid white
    img = img + (WHITE - img) * np.clip(NEON_OUT * 0.55 + NEON_IN * 0.9, 0, 1)[..., None]
    img = img * (1 - MARK[..., None]) + WHITE * MARK[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
frames = [frame(i / n) for i in range(n)]
pal = frame(0.5).convert("P", palette=Image.ADAPTIVE, colors=128)
q = [f.quantize(palette=pal, dither=Image.FLOYDSTEINBERG) for f in frames]
q[0].save("caleb-cj-avatar-burst.gif", save_all=True, append_images=q[1:], duration=int(1000 / FPS), loop=0, optimize=True)
frame(0.5).save("caleb-cj-avatar-burst.png")
os.makedirs("frames-burst", exist_ok=True)
for i, f in enumerate(frames): f.save(f"frames-burst/{i:03d}.png")
print("wrote caleb-cj-avatar-burst.gif/.png", n, "frames")
