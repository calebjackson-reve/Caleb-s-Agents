// Diagnose loader and scroll behaviour on a site. Usage: node diagnose.js <slug> <url>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [slug, url] = process.argv.slice(2);
const out = path.resolve(__dirname, '..', slug, 'diag');
fs.mkdirSync(out, { recursive: true });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 200)));
  page.on('pageerror', e => logs.push('ERR ' + String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const webgl = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return 'none'; const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl ok'; });
  console.log('webgl:', webgl);
  // poll loader state for 40s
  for (let t = 0; t <= 40; t += 5) {
    const s = await page.evaluate(() => {
      const cand = [...document.querySelectorAll('[class*=loader],[class*=preload],[class*=intro],[class*=loading],[class*=curtain]')].slice(0, 6).map(e => ({ cls: String(e.className).slice(0, 90), display: getComputedStyle(e).display, opacity: getComputedStyle(e).opacity, vis: getComputedStyle(e).visibility, h: Math.round(e.getBoundingClientRect().height), text: (e.innerText || '').trim().slice(0, 60) }));
      return { html: document.documentElement.className.slice(0, 120), body: document.body.className.slice(0, 120), cand, scrollY, canvases: document.querySelectorAll('canvas').length, videos: [...document.querySelectorAll('video')].map(v => ({ rs: v.readyState, paused: v.paused, src: (v.currentSrc || '').slice(-40) })).slice(0, 4), buttons: [...document.querySelectorAll('button,a')].map(b => b.innerText.trim()).filter(t => /enter|start|explore|skip|discover/i.test(t)).slice(0, 5) };
    });
    console.log('t=' + t + 's', JSON.stringify(s));
    await page.screenshot({ path: path.join(out, `loader-${t}s.png`) });
    await page.waitForTimeout(5000);
  }
  // scroll experiments
  const probe = async (label) => { const r = await page.evaluate(() => { const first = document.querySelector('section'); const m = document.querySelector('main') || document.body; return { scrollY, bodyTransform: getComputedStyle(m).transform, firstTop: first ? Math.round(first.getBoundingClientRect().top) : null, html: document.documentElement.className.slice(0, 80), scrollEl: document.scrollingElement && document.scrollingElement.tagName, overflowBody: getComputedStyle(document.body).overflow, overflowHtml: getComputedStyle(document.documentElement).overflow, containers: [...document.querySelectorAll('[data-scroll-container],[class*=scroll-container],[class*=smooth],[class*=scroller]')].map(e => String(e.className).slice(0, 60)).slice(0, 5) }; }); console.log(label, JSON.stringify(r)); return r; };
  await probe('before');
  for (let i = 0; i < 6; i++) { await page.mouse.move(720, 450); await page.mouse.wheel(0, 300); await page.waitForTimeout(400); }
  await probe('after wheel 1800');
  await page.waitForTimeout(2000); await probe('after wheel +2s');
  await page.screenshot({ path: path.join(out, 'after-wheel.png') });
  await page.keyboard.press('PageDown'); await page.waitForTimeout(1500); await probe('after pagedown');
  await page.evaluate(() => scrollTo(0, 2500)); await page.waitForTimeout(1500); await probe('after scrollTo 2500');
  await page.screenshot({ path: path.join(out, 'after-scrollto.png') });
  // dump js sources via in-page fetch
  const srcs = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(s => s && !/google|facebook|gtm|recaptcha|hotjar|vimeo|youtube/.test(s)));
  for (const s of srcs.slice(0, 8)) {
    const txt = await page.evaluate(async (u) => { try { const r = await fetch(u); return await r.text(); } catch (e) { return 'FETCHERR ' + e; } }, s);
    const name = s.split('/').pop().split('?')[0].replace(/[^a-z0-9._-]/gi, '_');
    fs.writeFileSync(path.join(out, name), txt);
    console.log('saved', name, txt.length);
  }
  fs.writeFileSync(path.join(out, 'console.txt'), logs.join('\n'));
  console.log('console lines', logs.length, logs.slice(0, 8).join(' | '));
  await browser.close();
})();
