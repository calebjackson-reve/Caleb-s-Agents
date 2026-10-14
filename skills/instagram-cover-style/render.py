#!/usr/bin/env python3
"""Render Instagram covers and carousel slides in Caleb Jackson's locked feed style.

Usage: python3 render.py spec.json out_dir
See SKILL.md for the spec format and the style rules.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1350
OFFWHITE = (243, 239, 230)
CORAL = (217, 93, 65)
FONT = lambda w, s: ImageFont.truetype(os.path.join(HERE, 'fonts', f'Montserrat-{w}.ttf'), s)


def load(path):
    return ImageOps.exif_transpose(Image.open(path)).convert('RGB')


def cover_fit(im, focus=0.5):
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = int((im.height - H) * focus)
    return im.crop((x, y, x + W, y + H))


def blur_fill(im):
    """Landscape or small photo: full width at top, blurred stretch of itself below."""
    bg = cover_fit(im, 0.5).filter(ImageFilter.GaussianBlur(40))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    fg_h = round(im.height * W / im.width)
    fg = im.resize((W, fg_h), Image.LANCZOS)
    top = max(0, int(H * 0.08))
    bg.paste(fg, (0, top))
    return bg


def darken(im, amount):
    return ImageEnhance.Brightness(im).enhance(1 - amount) if amount else im


def text_gradient(im, y0, y1, strength=200):
    """Dark band behind the text block, feathered above and below."""
    mask = Image.new('L', (1, H), 0)
    for y in range(H):
        if y < y0 - 160 or y > y1 + 260:
            v = 0
        elif y < y0:
            v = strength * (y - (y0 - 160)) / 160
        elif y <= y1:
            v = strength
        else:
            v = strength * (1 - (y - y1) / 260)
        mask.putpixel((0, y), int(max(0, min(255, v))))
    mask = mask.resize((W, H))
    im.paste(Image.new('RGB', (W, H), (0, 0, 0)), (0, 0), mask)
    return im


def spaced_width(d, text, font, tracking):
    return sum(d.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def draw_spaced(d, cx, y, text, font, tracking, fill=OFFWHITE, shadow=True):
    x = cx - spaced_width(d, text, font, tracking) / 2
    for c in text:
        if shadow:
            d.text((x + 1, y + 2), c, font=font, fill=(0, 0, 0, 160))
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking


def wrap_headline(d, text, font, max_w):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def render(slide, out_path):
    im = load(slide['photo'])
    if slide.get('fill') == 'blur':
        canvas = blur_fill(im)
    else:
        canvas = cover_fit(im, slide.get('focus', 0.5))
    canvas = darken(canvas, slide.get('darken', 0.12))

    headline = slide['headline'].upper()
    if not headline.endswith(('.', '?', '!')):
        headline += '.'
    size = slide.get('size', 96)
    hfont = FONT(800, size)
    d = ImageDraw.Draw(canvas)
    lines = wrap_headline(d, headline, hfont, W - 140)
    while len(lines) > 2 and size > 60:
        size -= 6; hfont = FONT(800, size); lines = wrap_headline(d, headline, hfont, W - 140)
    lh = int(size * 0.98)
    block_h = lh * len(lines)
    top = int(H * slide.get('text_y', 0.62)) - block_h // 2

    sub = slide.get('subline', '').upper()
    sfont = FONT(600, 24)
    bottom = top + block_h + 22 + 5 + (22 + 30 if sub else 0)
    # never let the text block run into the signature at the bottom
    limit = (H - 118 - 70) if slide.get('signature', True) else H - 80
    if bottom > limit:
        shift = bottom - limit; top -= shift; bottom -= shift
    canvas = text_gradient(canvas, top, bottom, slide.get('band', 190))
    d = ImageDraw.Draw(canvas, 'RGBA')

    y = top
    for ln in lines:
        for off in ((0, 6), (3, 3), (-3, 3)):
            d.text((W / 2 + off[0], y + off[1]), ln, font=hfont, fill=(0, 0, 0, 90), anchor='ma')
        d.text((W / 2, y), ln, font=hfont, fill=OFFWHITE, anchor='ma')
        y += lh
    y += 22
    d.rectangle([W / 2 - 35, y, W / 2 + 35, y + 5], fill=CORAL)
    y += 5 + 22
    if sub:
        draw_spaced(d, W / 2, y, sub, sfont, 7)

    if slide.get('signature', True):
        sig_y = H - 118
        d.rectangle([0, sig_y - 60, W, H], fill=(0, 0, 0, 0))
        draw_spaced(d, W / 2, sig_y, 'CALEB JACKSON', FONT(800, 24), 6)
        draw_spaced(d, W / 2, sig_y + 38, 'KELLER WILLIAMS FIRST CHOICE', FONT(600, 18), 5)

    canvas.save(out_path, quality=95)
    return out_path


def main():
    spec_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    spec = json.load(open(spec_path))
    for i, slide in enumerate(spec, 1):
        name = slide.get('name', f'{i:02d}')
        print(render(slide, os.path.join(out_dir, f'{name}.jpg')))


if __name__ == '__main__':
    main()
