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
def fix(text):
    text = text.replace('../media/', '/media/').replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">')
    # canonical/og URLs are written for calebjackson.org by build.py; rewrite for a staging host
    return text.replace('https://calebjackson.org/', 'https://' + host + '/')
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
# Old LP URLs (live sitemap-static.xml and sitemap-neighborhoods-dpages.xml, read Oct 29 2026)
# mapped to the closest new page. GitHub Pages ignores _redirects, so each old path gets a
# meta-refresh stub page; _redirects carries the same map for a host that honors it.
# GitHub Pages serves /about from about.html on its own, so same-named pages need no stub.
# Old blog posts are not stubbed: they fall to 404.html, which shows the home page.
SEARCH = 'https://search.calebjackson.org'
REDIRECTS = {
    'home-search': SEARCH, 'home-search/listings': SEARCH,
    'buy': '/search.html', 'properties': '/search.html',
    'home-valuation': '/sell.html', 'seller-net-sheet': '/sell.html',
    'true-payment-calculator': '/sell.html', 'tools': '/sell.html',
    'market-report': '/sell.html',
    'testimonials': '/about.html', 'video-gallery': '/about.html',
    'relocate': '/communities.html', 'blog': '/',
    'ai-showing-plan': '/', 'flood-zone-check': '/',
    'neighborhood-match-quiz': '/', 'terms-and-conditions': '/',
}
for n in ['baton-rouge', 'false-river-waterfront', 'zachary-golf', 'historic-br', 'santa-maria',
          'university-club-plantation', 'country-club-of-louisiana', 'new-roads',
          'st-francisville', 'garden-district', 'bocage']:
    REDIRECTS['neighborhoods/' + n] = '/communities.html'
redirect_lines = []
for old, new in REDIRECTS.items():
    target = new if new.startswith('http') else 'https://' + host + new
    redirect_lines.append('/' + old + ' ' + target + ' 301')
    stub = out / old; stub.mkdir(parents=True, exist_ok=True)
    (stub / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' + target + '"><link rel="canonical" href="' + target + '"><a href="' + target + '">Continue</a>\n')
(out / '_redirects').write_text('\n'.join(redirect_lines) + '\n')
(out / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/media/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Cache-Control: public, max-age=86400\n')
(out / '404.html').write_text((out / 'index.html').read_text())
(out / 'CNAME').write_text(host + '\n')
(out / '.nojekyll').write_text('')
(out / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://' + host + '/sitemap.xml\n')
pages = ['index', 'search', 'communities', 'sell', 'about', 'contact']
(out / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>https://' + host + '/{"" if p=="index" else p+".html"}</loc></url>\n' for p in pages) + '</urlset>\n')
print('dist built at', out, 'files', sum(1 for _ in out.rglob('*') if _.is_file()))
