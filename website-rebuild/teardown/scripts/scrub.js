// Scroll choreography probe. Steps through the page and records which elements change transform, opacity, clip-path or size between steps.
// Usage: [VIRTUAL=1] node scrub.js <slug> <url>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [slug, url] = process.argv.slice(2);
const out = path.resolve(__dirname, '..', slug);
const VIRTUAL = process.env.VIRTUAL === '1';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const snapshot = () => {
  const vh = innerHeight;
  const res = [];
  const all = document.querySelectorAll('body *');
  let n = 0;
  for (const e of all) {
    if (n > 4000) break; n++;
    if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) continue;
    if (r.bottom < -vh || r.top > vh * 2) continue;
    const c = getComputedStyle(e);
    const sig = { tf: c.transform === 'none' ? '' : c.transform, op: c.opacity, cp: c.clipPath === 'none' ? '' : c.clipPath, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), pos: c.position, filt: c.filter === 'none' ? '' : c.filter, bg: c.backgroundColor, color: c.color };
    let key = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    key = key.slice(0, 90);
    res.push({ key, ...sig });
  }
  return res;
};

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
  const page = await ctx.newPage();
  if (VIRTUAL) await page.route(/\.mp4(\?|$)/, r => r.fulfill({ path: path.join(__dirname, 'stub.webm'), contentType: 'video/webm' }));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  if (VIRTUAL) await page.waitForFunction(() => { const i = document.querySelector('.preloader--intro'); return !i || i.getBoundingClientRect().height === 0; }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const docH = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  const stepPx = 300; // fine steps
  const steps = [];
  let prev = null;
  let y = 0;
  const maxSteps = Math.min(140, Math.ceil(docH / stepPx) + 2);
  // measure virtual scroll position via first section top
  const getPos = () => page.evaluate(() => { const s = document.querySelector('section') || document.body.firstElementChild; return s ? Math.round(-s.getBoundingClientRect().top) : scrollY; });
  for (let i = 0; i < maxSteps; i++) {
    if (VIRTUAL) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(650); }
    else { await page.mouse.wheel(0, stepPx); await page.waitForTimeout(300); }
    const pos = await getPos();
    const snap = await page.evaluate(snapshot);
    const changes = [];
    if (prev) {
      const pm = new Map(prev.map(x => [x.key + '@' + x.w, x]));
      for (const s of snap) {
        const p = pm.get(s.key + '@' + s.w);
        if (!p) continue;
        const ch = [];
        if (p.tf !== s.tf) ch.push('transform');
        if (p.op !== s.op) ch.push('opacity ' + p.op + '>' + s.op);
        if (p.cp !== s.cp) ch.push('clip');
        if (p.h !== s.h && Math.abs(p.h - s.h) > 4) ch.push('height ' + p.h + '>' + s.h);
        if (p.w !== s.w && Math.abs(p.w - s.w) > 4) ch.push('width');
        if (p.filt !== s.filt) ch.push('filter');
        if (p.bg !== s.bg) ch.push('bg ' + p.bg + '>' + s.bg);
        if (p.color !== s.color) ch.push('color');
        if (s.pos === 'fixed' || s.pos === 'sticky') ch.push('[' + s.pos + ']');
        if (ch.length) changes.push({ el: s.key, ch: ch.join(', '), tf: s.tf.slice(0, 60), top: s.top });
      }
    }
    steps.push({ i, pos, changes: changes.slice(0, 40) });
    prev = snap;
    if (pos >= docH - 1000 && i > 5) break;
  }
  fs.writeFileSync(path.join(out, 'scrub.json'), JSON.stringify(steps, null, 1));
  // summary: which elements change most, grouped by scroll range
  const agg = {};
  for (const s of steps) for (const c of s.changes) { const k = c.el + ' :: ' + c.ch.replace(/opacity [0-9.]+>[0-9.]+/, 'opacity').replace(/height \d+>\d+/, 'height').replace(/bg [^>]+>[^,]+/, 'bg'); agg[k] = agg[k] || { count: 0, from: s.pos, to: s.pos }; agg[k].count++; agg[k].to = s.pos; }
  const rows = Object.entries(agg).sort((a, b) => b[1].count - a[1].count).slice(0, 80).map(([k, v]) => `${String(v.count).padStart(3)}x  ${v.from}-${v.to}px  ${k}`);
  fs.writeFileSync(path.join(out, 'scrub-summary.txt'), rows.join('\n'));
  console.log(slug, 'steps', steps.length, 'docH', docH); console.log(rows.slice(0, 50).join('\n'));
  await browser.close();
})();
