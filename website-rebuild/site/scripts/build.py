#!/usr/bin/env python3
"""Inline the shared head and scripts fragments into every page in src/ and write them to the site root.
Also injects a canonical link and Open Graph / Twitter tags built from each page's own title and
description, so every page shares what the live LP site already has. URLs are written for
calebjackson.org; scripts/dist.py rewrites them when SITE_HOST is a different host."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parents[1]
head = (root / '_head.html').read_text()
scripts = (root / '_scripts.html').read_text()
OG_IMAGE = 'https://calebjackson.org/media/video/still-anim-1-front-night-16x9-poster.webp'
for src in sorted((root / 'src').glob('*.html')):
    html = src.read_text().replace('<!--HEAD-->', head).replace('<!--SCRIPTS-->', scripts)
    title = re.search(r'<title>([^<]*)</title>', html)
    desc = re.search(r'<meta name="description" content="([^"]*)"', html)
    if title and desc and 'template' not in src.name:
        url = 'https://calebjackson.org/' + ('' if src.name == 'index.html' else src.name)
        esc = lambda s: s.replace('&', '&amp;').replace('"', '&quot;')
        social = (
            f'<link rel="canonical" href="{url}">\n'
            f'<meta property="og:type" content="website">\n'
            f'<meta property="og:url" content="{url}">\n'
            f'<meta property="og:title" content="{esc(title.group(1))}">\n'
            f'<meta property="og:description" content="{esc(desc.group(1))}">\n'
            f'<meta property="og:image" content="{OG_IMAGE}">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n'
        )
        html = html.replace(desc.group(0) + '>', desc.group(0) + '>\n' + social, 1)
    (root / src.name).write_text(html)
    print('built', src.name, len(html))
