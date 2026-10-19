// Capture the first 6 seconds after navigation starts, one frame every 250ms. Usage: node entrance.js <slug> <url>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [slug, url] = process.argv.slice(2);
const out = path.resolve(__dirname, '..', slug, 'entrance');
fs.mkdirSync(out, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  const page = await ctx.newPage();
  if (process.env.VIRTUAL === '1') await page.route(/\.mp4(\?|$)/, r => r.fulfill({ path: path.join(__dirname, 'stub.webm'), contentType: 'video/webm' }));
  const t0 = Date.now();
  const nav = page.goto(url, { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
  await nav;
  const timeline = [];
  for (let i = 0; i < 28; i++) {
    const t = Date.now() - t0;
    try { await page.screenshot({ path: path.join(out, `f${String(i).padStart(2, '0')}-${t}ms.png`), timeout: 2000 }); } catch (e) {}
    const st = await page.evaluate(() => ({ html: document.documentElement.className.slice(0, 100), h1: (() => { const h = document.querySelector('h1'); if (!h) return null; const c = getComputedStyle(h); return { opacity: c.opacity, transform: c.transform.slice(0, 40), clip: c.clipPath.slice(0, 30) }; })(), intro: (() => { const i = document.querySelector('.preloader--intro,[class*=loader]'); return i ? { opacity: getComputedStyle(i).opacity, display: getComputedStyle(i).display, h: Math.round(i.getBoundingClientRect().height) } : null; })() })).catch(() => null);
    timeline.push({ t, ...st });
    await page.waitForTimeout(250);
  }
  fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
  await ctx.close(); await browser.close();
  for (const f of fs.readdirSync(out)) if (f.endsWith('.webm')) fs.renameSync(path.join(out, f), path.join(out, 'entrance.webm'));
  console.log('done', timeline.length);
})();
