"""Build the animated CJ email icon (GIF + static PNG). Run: python3 build.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

S = 4                 # supersample for smooth edges
SIZE = 160            # output size in px
W = SIZE * S
BG = (255, 255, 255)
INK = (34, 34, 38)          # charcoal letters
RED = (178, 1, 1)           # Keller Williams red glow
FONT = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
TEXT = "CJ"
GLOW_MIN, GLOW_MAX = 0.22, 0.75   # how faint and how strong the glow breathes
FPS, DUR = 12, 3.6                # one full breath in seconds

font = ImageFont.truetype(FONT, int(96 * S))

def letters():
    """Return a white-on-black mask of the monogram, centered."""
    m = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(m)
    bbox = d.textbbox((0, 0), TEXT, font=font)
    x = (W - (bbox[2] - bbox[0])) / 2 - bbox[0]
    y = (W - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((x, y), TEXT, font=font, fill=255)
    return m

MASK = letters()
HALO = MASK.filter(ImageFilter.GaussianBlur(14 * S))

def frame(t):
    g = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 - 0.5 * math.cos(2 * math.pi * t))
    im = Image.new("RGB", (W, W), BG)
    halo = HALO.point(lambda v: int(v * g))
    im.paste(Image.new("RGB", (W, W), RED), mask=halo)
    im.paste(Image.new("RGB", (W, W), INK), mask=MASK)
    return im.resize((SIZE, SIZE), Image.LANCZOS)

n = int(FPS * DUR)
frames = [frame(i / n) for i in range(n)]
pal = frame(0.5).convert("P", palette=Image.ADAPTIVE, colors=48)
q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
q[0].save("caleb-cj-icon.gif", save_all=True, append_images=q[1:],
          duration=int(1000 / FPS), loop=0, optimize=True)
frame(0.5).save("caleb-cj-icon.png")
print("wrote caleb-cj-icon.gif and caleb-cj-icon.png", n, "frames")
