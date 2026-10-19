#!/usr/bin/env python3
"""Build the launch bundle: built pages + assets + only the media the pages reference,
with media paths made absolute, indexing switched on, and a CNAME for the domain.
Usage: python3 site/scripts/dist.py [out_dir] (default website-rebuild/dist)"""
import re, shutil, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]          # website-rebuild/
site = root / 'site'
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist'
if out.exists(): shutil.rmtree(out)
(out / 'assets').mkdir(parents=True)
def fix(text): return text.replace('../media/', '/media/').replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">')
for f in site.glob('*.html'): (out / f.name).write_text(fix(f.read_text()))
for f in (site / 'assets').glob('*'): (out / 'assets' / f.name).write_text(fix(f.read_text()))
refs = set()
for f in list(out.glob('*.html')) + list((out / 'assets').glob('*')):
    refs.update(re.findall(r'/media/[^"\' )]+', f.read_text()))
for r in sorted(refs):
    src = root / r.lstrip('/')
    if src.exists():
        dst = out / r.lstrip('/'); dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dst)
    else: print('missing', r)
(out / 'CNAME').write_text('calebjackson.org\n')
(out / '404.html').write_text((out / 'index.html').read_text())
(out / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://calebjackson.org/sitemap.xml\n')
pages = ['index', 'search', 'communities', 'sell', 'about', 'contact']
(out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://calebjackson.org/{"" if p=="index" else p+".html"}</loc></url>\n' for p in pages) + '</urlset>\n')
print('dist built at', out, 'files', sum(1 for _ in out.rglob('*') if _.is_file()))
