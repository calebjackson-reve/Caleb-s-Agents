#!/usr/bin/env python3
"""Build the launch bundle: built pages + assets + only the media the pages reference,
with media paths made absolute, indexing switched on, and a CNAME for the domain.
Usage: python3 site/scripts/dist.py [out_dir] (default website-rebuild/dist)"""
import re, shutil, sys, pathlib, os
host = os.environ.get('SITE_HOST', 'calebjackson.org')
root = pathlib.Path(__file__).resolve().parents[2]          # website-rebuild/
site = root / 'site'
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist'
if out.exists(): shutil.rmtree(out)
(out / 'assets').mkdir(parents=True)
def fix(text): return text.replace('../media/', '/media/').replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">')
for f in site.glob('*.html'):
    if not f.name.startswith('_'): (out / f.name).write_text(fix(f.read_text()))
lead = os.environ.get('LEAD_WEBHOOK', '')
for f in (site / 'assets').glob('*'):
    text = fix(f.read_text())
    if f.name == 'site.js' and lead: text = text.replace("var LEAD_URL = '/api/lead';", "var LEAD_URL = '" + lead.replace("'", '') + "';")
    (out / 'assets' / f.name).write_text(text)
if not lead: print('LEAD_WEBHOOK not set: forms post to /api/lead, which only exists on Cloudflare Pages')
# review link page: self-contained folder, og-card.html is only the thumbnail source
(out / 'review').mkdir()
for f in (site / 'review').glob('*'):
    if f.name == 'og-card.html': continue
    if f.suffix == '.html': (out / 'review' / f.name).write_text(f.read_text().replace('home.calebjackson.org', host))
    else: shutil.copy2(f, out / 'review' / f.name)
refs = set()
for f in list(out.glob('*.html')) + list((out / 'assets').glob('*')):
    refs.update(re.findall(r'/media/[^"\' )]+', f.read_text()))
for r in sorted(refs):
    src = root / r.lstrip('/')
    if src.exists():
        dst = out / r.lstrip('/'); dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dst)
    else: print('missing', r)
(out / '_redirects').write_text('/home-search https://search.calebjackson.org 301\n/about /about.html 301\n/sell /sell.html 301\n/contact /contact.html 301\n/communities /communities.html 301\n/search /search.html 301\n/profile /about.html 301\n/contact-us /contact.html 301\n')
# GitHub Pages ignores _redirects, so old LP paths that matter get stub pages too
(out / 'home-search').mkdir(); (out / 'home-search' / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Home Search</title><meta http-equiv="refresh" content="0;url=https://search.calebjackson.org"><link rel="canonical" href="https://search.calebjackson.org"><a href="https://search.calebjackson.org">Search homes</a>\n')
# /profile and /contact-us are linked from old LP templates and 404 on the live site (2026-10-29 audit)
for old, new in (('profile', 'about.html'), ('contact-us', 'contact.html')):
    (out / old).mkdir()
    (out / old / 'index.html').write_text(f'<!doctype html><meta charset="utf-8"><title>Moved</title><meta http-equiv="refresh" content="0;url=/{new}"><link rel="canonical" href="https://{host}/{new}"><a href="/{new}">Continue</a>\n')
(out / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Cache-Control: public, max-age=86400\n')
(out / '404.html').write_text((out / 'index.html').read_text())
(out / 'CNAME').write_text(host + '\n')
(out / '.nojekyll').write_text('')
(out / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://' + host + '/sitemap.xml\n')
pages = ['index', 'search', 'communities', 'sell', 'about', 'contact']
(out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://' + host + '/{"" if p=="index" else p+".html"}</loc></url>\n' for p in pages) + '</urlset>\n')
print('dist built at', out, 'files', sum(1 for _ in out.rglob('*') if _.is_file()))
