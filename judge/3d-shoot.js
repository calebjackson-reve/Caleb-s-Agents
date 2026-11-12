// Shoots the evidence a 3D judge scores from: every chapter as a frame sequence, the explore mode in every look
// from every view, take-apart steps, pins, the phone, the fallbacks, and what the browser measured.
//
//   node judge/3d-shoot.js <base url of the page> <out dir>
//   node judge/3d-shoot.js http://127.0.0.1:8791/3d/index.html judge/out/round-1
//
// Needs Playwright. In a cloud session it is already installed. Output goes under judge/out/, which git ignores.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error('usage: node judge/3d-shoot.js <url> <out dir>'); process.exit(2); }
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const SCENES = {
  hero: [0, 0.3, 0.5, 0.7, 0.9], form: [0.1, 0.3, 0.5, 0.7, 0.9], buy: [0.15, 0.4, 0.65, 0.9],
  sell: [0.1, 0.3, 0.42, 0.5, 0.58, 0.75, 0.95], photo: [0.1, 0.2, 0.3, 0.5, 0.75, 0.85, 0.95],
  build: [0.15, 0.35, 0.55, 0.75, 0.9], explore: [0.1, 0.25, 0.4],
};
const PHONE = { hero: [0, 0.6], form: [0.5], buy: [0.5], sell: [0.3, 0.6, 0.95], photo: [0.2, 0.5, 0.9], build: [0.4, 0.75], explore: [0.4] };
const LOOKS = ['drawing', 'day', 'dusk', 'blueprint'], VIEWS = ['front', 'porch', 'pool', 'above'];
const report = { url: base, when: new Date().toISOString(), errors: [], failed: [], states: {} };

const settle = (page, ms = 250) => page.evaluate((t) => new Promise((res) => {
  let n = 0; const tick = () => { if (++n >= 4) setTimeout(res, t); else requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}), ms);
const info = (page) => page.evaluate(() => (window.__stage ? window.__stage.info() : null));

async function open(browser, w, h, phone, extra = '', opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone }, opts));
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => report.failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) report.failed.push(r.status() + ' ' + r.url()); });
  const t0 = Date.now();
  await page.goto(base + '?still&q=high' + extra);
  await page.waitForFunction('window.__ready === true', { timeout: 120000 });
  const ready = Date.now() - t0;
  await page.waitForTimeout(2500);
  return { ctx, page, ready };
}

async function chapters(browser, w, h, phone, dir, plan) {
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  const { ctx, page, ready } = await open(browser, w, h, phone);
  report.states[dir + ' ready_ms (software rendering)'] = ready;
  let n = 0;
  for (const name of Object.keys(plan)) {
    for (const t of plan[name]) {
      await page.evaluate(([nm, tt]) => { const el = document.querySelector(`[data-scene="${nm}"]`); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * tt); }, [name, t]);
      await settle(page, 1400);
      const file = `${dir}/${String(++n).padStart(2, '0')}-${name}-${String(Math.round(t * 100)).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(out, file) });
      report.states[file] = await info(page);
    }
  }
  // the sections below the stage
  for (const sel of ['.inside', '.receipts', '.film', '.footer']) {
    await page.evaluate((s) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }, sel);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(out, `${dir}/${String(++n).padStart(2, '0')}-below${sel.replace('.', '-')}.png`) });
  }
  report.states[dir + ' sideways overflow px'] = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
  await ctx.close();
}

async function explore(browser, w, h, phone, dir, full) {
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  const { ctx, page } = await open(browser, w, h, phone);
  await page.evaluate(() => { const el = document.querySelector('[data-scene="explore"]'); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * 0.4); });
  await settle(page, 800);
  await page.click('#open-viewer');
  await page.waitForTimeout(6000);
  const shot = async (name) => { await settle(page, 1800); await page.screenshot({ path: path.join(out, `${dir}/${name}.png`) }); report.states[`${dir}/${name}.png`] = await info(page); };
  const apart = (v) => page.evaluate((x) => { const el = document.querySelector('#apart'); el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await shot('00-opening-view');
  for (const look of (full ? LOOKS : ['day', 'dusk', 'blueprint'])) {
    await page.click(`[data-look="${look}"]`);
    await page.waitForTimeout(look === 'dusk' ? 5000 : 1500);
    for (const view of (full ? VIEWS : ['front', 'pool'])) {
      await page.evaluate((v) => window.__app.viewTo(v, true), view);
      await shot(`${look}-${view}`);
    }
  }
  if (full) {
    // take it apart, in daylight then as a blueprint
    for (const look of ['day', 'blueprint']) {
      await page.click(`[data-look="${look}"]`); await page.waitForTimeout(1500);
      await page.evaluate(() => window.__app.viewTo('above', true));
      await page.evaluate(() => { const s = window.__stage; s.camera.position.set(-46, 34, 52); });
      for (const v of [0.33, 0.66, 1]) { await apart(v); await shot(`apart-${look}-${Math.round(v * 100)}`); }
      await apart(0);
    }
    // dusk while taken apart: a state a visitor will reach
    await page.click('[data-look="dusk"]'); await page.waitForTimeout(2500); await apart(0.7); await shot('apart-dusk-70'); await apart(0);
    // pins: open two photo cards
    await page.click('[data-look="day"]'); await page.waitForTimeout(1500);
    await page.evaluate(() => window.__app.viewTo('front', true)); await settle(page, 1200);
    const pins = await page.$$('.pinbtn');
    for (const i of [1, 0]) { try { await pins[i].click({ timeout: 4000 }); await shot(`pin-${i}-front-view`); } catch (e) { report.states[`pin ${i} not clickable from front view`] = String(e.message).split('\n')[0]; } }
    await page.evaluate(() => window.__app.viewTo('pool', true)); await settle(page, 1200);
    try { await pins[2].click({ timeout: 4000 }); await shot('pin-2-pool-view'); } catch (e) { report.states['pin 2 not clickable from pool view'] = String(e.message).split('\n')[0]; }
    // close and confirm the page comes back
    await page.keyboard.press('Escape'); await page.waitForTimeout(600); await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${dir}/zz-after-close.png`) });
    report.states['viewer closed with Escape'] = await page.evaluate('!document.body.classList.contains("is-exploring")');
  }
  await ctx.close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args });
  await chapters(browser, 1440, 900, false, 'desktop', SCENES);
  await chapters(browser, 390, 844, true, 'phone', PHONE);
  await explore(browser, 1440, 900, false, 'explore', true);
  await explore(browser, 390, 844, true, 'explore-phone', false);

  // fallbacks
  fs.mkdirSync(path.join(out, 'fallback'), { recursive: true });
  { const { ctx, page } = await open(browser, 1440, 900, false, '&nowebgl=1'); await page.screenshot({ path: path.join(out, 'fallback/no-webgl-hero.png') });
    await page.evaluate(() => { const el = document.querySelector('[data-scene="buy"]'); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * 0.5); }); await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(out, 'fallback/no-webgl-buy.png') }); await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push('reduced motion pageerror: ' + e.message));
    await page.goto(base + '?q=high'); await page.waitForFunction('window.__ready === true', { timeout: 120000 }); await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, 'fallback/reduced-motion-hero.png') });
    await page.evaluate(() => { const el = document.querySelector('[data-scene="sell"]'); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * 0.95); }); await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, 'fallback/reduced-motion-sell-end.png') }); await ctx.close(); }

  // what the browser can tell us about weight and the renderer
  { const { ctx, page } = await open(browser, 1440, 900, false);
    report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    report.transfer = await page.evaluate(() => { const r = performance.getEntriesByType('resource'); const sum = (f) => Math.round(r.filter(f).reduce((a, x) => a + (x.transferSize || x.encodedBodySize || 0), 0) / 1024); return { requests: r.length, script_kb: sum((x) => /\.m?js/.test(x.name)), image_kb: sum((x) => /\.(webp|jpg|png|svg)/.test(x.name)), font_kb: sum((x) => /woff2/.test(x.name)), total_kb: sum(() => true) }; });
    await ctx.close(); }
  report.note = 'Rendered in software (no graphics card on this machine). Frame timing was not measured and ready_ms is not what a visitor would see.';
  report.errors = Array.from(new Set(report.errors)); report.failed = Array.from(new Set(report.failed));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log('done', out, 'errors', report.errors.length, 'failed', report.failed.length);
})();
