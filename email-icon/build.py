"""Build the animated email icon (GIF + static PNG). Run: python3 build.py"""
from PIL import Image, ImageDraw
import math

S = 4            # supersample factor for smooth edges
SIZE = 160       # output pixel size (square)
W = SIZE * S
RED = (178, 1, 1)        # Keller Williams red
INK = (36, 36, 40)       # charcoal
GLOW = (255, 176, 40)    # warm window light
BG = (255, 255, 255)
STROKE = 9 * S

# House path points (in output px, scaled up): base, walls, roof
def pts():
    L, R, B, T, RIDGE = 36, 124, 128, 78, 34
    return {
        "walls": [(L, B), (L, T), (R, T), (R, B)],
        "roof": [(26, 84), (80, RIDGE), (134, 84)],
        "door": [(70, B), (70, 100), (90, 100), (90, B)],
        "window": (97, 86, 113, 102),
    }

def scale(p): return (p[0] * S, p[1] * S)

def polyline_partial(d, points, frac, color):
    """Draw first `frac` of a polyline with round joins."""
    pts_ = [scale(p) for p in points]
    total = sum(math.dist(pts_[i], pts_[i+1]) for i in range(len(pts_)-1))
    left = total * max(0, min(1, frac))
    for i in range(len(pts_)-1):
        a, b = pts_[i], pts_[i+1]
        seg = math.dist(a, b)
        if left <= 0: break
        t = min(1, left / seg)
        end = (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)
        d.line([a, end], fill=color, width=STROKE)
        for c in (a, end):
            d.ellipse([c[0]-STROKE/2, c[1]-STROKE/2, c[0]+STROKE/2, c[1]+STROKE/2], fill=color)
        left -= seg

def ease(t): return 1 - (1 - t) ** 3

def frame(t):
    """t in [0,1] across the whole loop."""
    im = Image.new("RGB", (W, W), BG)
    d = ImageDraw.Draw(im)
    P = pts()
    # phase 1 (0 to .35): walls draw. phase 2 (.25 to .6): roof draws.
    # phase 3 (.55 to .75): door. phase 4 (.7 to .9): window glows. hold to 1.
    walls = ease(min(1, t / .35))
    roof = ease(max(0, min(1, (t - .25) / .35)))
    door = ease(max(0, min(1, (t - .55) / .2)))
    glow = max(0, min(1, (t - .7) / .2))
    if walls > 0: polyline_partial(d, P["walls"], walls, INK)
    if roof > 0: polyline_partial(d, P["roof"], roof, RED)
    if door > 0: polyline_partial(d, P["door"], door, INK)
    if glow > 0:
        x0, y0, x1, y1 = [v * S for v in P["window"]]
        c = tuple(int(BG[i] + (GLOW[i] - BG[i]) * glow) for i in range(3))
        for k in range(2, 0, -1):
            halo = tuple(int(BG[i] + (GLOW[i] - BG[i]) * glow * 0.10 * (3 - k)) for i in range(3))
            pad = k * 2 * S
            d.rounded_rectangle([x0-pad, y0-pad, x1+pad, y1+pad], radius=(2+k*3)*S, fill=halo)
        d.rounded_rectangle([x0, y0, x1, y1], radius=2*S, fill=c, outline=INK, width=int(STROKE*.4))
    else:
        x0, y0, x1, y1 = [v * S for v in P["window"]]
        if door > 0.99:
            d.rounded_rectangle([x0, y0, x1, y1], radius=2*S, outline=INK, width=int(STROKE*.4))
    return im.resize((SIZE, SIZE), Image.LANCZOS)

FPS = 20
DUR = 3.2            # seconds of motion
HOLD = 1.8           # seconds held on the finished icon
frames, durations = [], []
n = int(DUR * FPS)
for i in range(n):
    frames.append(frame(i / (n - 1)))
    durations.append(int(1000 / FPS))
durations[-1] = int(HOLD * 1000)

# quantize to a shared palette for a small, clean GIF
pal = frames[-1].convert("P", palette=Image.ADAPTIVE, colors=64)
q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
q[0].save("caleb-house-icon.gif", save_all=True, append_images=q[1:],
          duration=durations, loop=0, optimize=True, disposal=1)
frames[-1].save("caleb-house-icon.png")
print("wrote caleb-house-icon.gif and caleb-house-icon.png", len(frames), "frames")
