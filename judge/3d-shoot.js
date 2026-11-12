// Shoots the evidence a 3D judge scores from: every chapter as a frame sequence, the explore mode in every look
// from every view, take-apart steps, pins, the phone, the fallbacks, and what the browser measured.
//
//   node judge/3d-shoot.js <base url of the page> <out dir> [part]
//   part is one of: desktop, phone, explore, explore-phone, extras, merge. Leave it out to run everything.
//   Each part writes its own report file, so a part that dies can be run again without redoing the rest.
//   node judge/3d-shoot.js http://127.0.0.1:8791/3d/index.html judge/out/round-1
//
// Needs Playwright. In a cloud session it is already installed. Output goes under judge/out/, which git ignores.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [base, out, part] = process.argv.slice(2);
const want = (name) => !part || part === name;
if (!base || !out) { console.error('usage: node judge/3d-shoot.js <url> <out dir>'); process.exit(2); }
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// Scroll positions inside each chapter. The two changes of light (day to dusk in sell, blueprint to model in explore)
// are shot every 4 to 6 points so a jump would show.
const SCENES = {
  hero: [0, 0.3, 0.5, 0.7, 0.9], form: [0.1, 0.3, 0.5, 0.7, 0.9], buy: [0.15, 0.4, 0.65, 0.9],
  sell: [0.1, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72, 0.8, 0.95], photo: [0.1, 0.2, 0.3, 0.5, 0.75, 0.85, 0.95],
  build: [0.15, 0.35, 0.55, 0.75, 0.9], explore: [0.05, 0.12, 0.17, 0.22, 0.27, 0.32, 0.37, 0.42, 0.5, 0.6],
};
const PHONE = { hero: [0, 0.6], form: [0.5], buy: [0.5], sell: [0.3, 0.5, 0.6, 0.95], photo: [0.2, 0.5, 0.9], build: [0.4, 0.75], explore: [0.27, 0.6] };
const EVERY = ['hero', 'form', 'buy', 'sell', 'photo', 'build', 'explore'];
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
  await page.evaluate(() => { const el = document.querySelector('[data-scene="explore"]'); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * 0.62); });
  await settle(page, 1500);
  await page.click('#open-viewer');
  await page.waitForTimeout(6000);
  const shot = async (name) => { await settle(page, 1800); await page.screenshot({ path: path.join(out, `${dir}/${name}.png`) }); report.states[`${dir}/${name}.png`] = await info(page); };
  const apart = (v) => page.evaluate((x) => { const el = document.querySelector('#apart'); el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await shot('00-opening-view');
  for (const look of (full ? LOOKS : ['drawing', 'day', 'dusk', 'blueprint'])) {
    await page.click(`[data-look="${look}"]`);
    await page.waitForTimeout(look === 'dusk' ? 5000 : 1500);
    for (const view of (full ? VIEWS : ['front', 'porch', 'above'])) {
      await page.evaluate((v) => window.__app.viewTo(v, true), view);
      await shot(`${look}-${view}`);
    }
  }
  if (!full) {
    await page.click('[data-look="day"]'); await page.waitForTimeout(1500);
    await page.evaluate(() => window.__app.viewTo('front', true));
    for (const v of [0.5, 1]) { await apart(v); await shot(`apart-day-${Math.round(v * 100)}`); }
    await apart(0); await settle(page, 800);
    try { const pins = await page.$$('.pinbtn'); await pins[1].click({ timeout: 4000 }); await shot('pin-porch-from-front'); } catch (e) { report.states['phone: porch pin not clickable'] = String(e.message).split('\n')[0]; }
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
    // pins: which ones show from each view, and every photo card opened from a view that shows it
    await page.click('[data-look="day"]'); await page.waitForTimeout(1500);
    const pins = await page.$$('.pinbtn');
    const names = ['front', 'porch', 'pool', 'patio', 'garage', 'barn', 'gazebo'];
    const from = { front: [0, 1, 5], pool: [2, 3], above: [4] };   // the barn is in frame from the front, the garage from above; the gazebo is too far off for any set view
    for (const view of Object.keys(from)) {
      await page.evaluate((v) => window.__app.viewTo(v, true), view); await settle(page, 1500);
      report.states[`pins shown from ${view}`] = await page.evaluate((nm) => Array.from(document.querySelectorAll('.pinbtn')).map((b, i) => (getComputedStyle(b).opacity === '1' ? nm[i] : null)).filter(Boolean), names);
      for (const i of from[view]) {
        try { await pins[i].click({ timeout: 4000 }); await shot(`pin-${names[i]}-from-${view}`); } catch (e) { report.states[`pin ${names[i]} is not shown from ${view} (behind something, or outside the frame)`] = true; }
      }
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    }
    // how far a drag can take the camera: all the way down, and all the way out
    await page.evaluate(() => { const s = window.__stage; s.camera.position.set(-60, -30, 60); });
    await page.mouse.move(700, 450); await page.mouse.down(); await page.mouse.move(701, 452, { steps: 2 }); await page.mouse.up();
    await shot('orbit-limit-low');
    // close and confirm the page comes back
    await page.keyboard.press('Escape'); await page.waitForTimeout(600); await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${dir}/zz-after-close.png`) });
    report.states['viewer closed with Escape'] = await page.evaluate('!document.body.classList.contains("is-exploring")');
  }
  await ctx.close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  if (part === 'merge') {   // join the part reports into one report.json
    const all = { url: base, when: new Date().toISOString(), errors: [], failed: [], states: {} };
    for (const f of fs.readdirSync(out).filter((x) => /^report-.*\.json$/.test(x)).sort()) {
      const r = JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));
      all.errors.push(...r.errors); all.failed.push(...r.failed); Object.assign(all.states, r.states);
      if (r.renderer) all.renderer = r.renderer; if (r.transfer) all.transfer = r.transfer; if (r.note) all.note = r.note;
    }
    all.errors = Array.from(new Set(all.errors)); all.failed = Array.from(new Set(all.failed));
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(all, null, 2));
    console.log('merged', Object.keys(all.states).length, 'entries, errors', all.errors.length, 'failed', all.failed.length);
    return;
  }
  const browser = await chromium.launch({ args });
  if (want('desktop')) await chapters(browser, 1440, 900, false, 'desktop', SCENES);
  if (want('phone')) await chapters(browser, 390, 844, true, 'phone', PHONE);
  if (want('explore')) await explore(browser, 1440, 900, false, 'explore', true);
  if (want('explore-phone')) await explore(browser, 390, 844, true, 'explore-phone', false);
  if (want('extras')) {

  // fallbacks: every chapter with WebGL off, and every chapter with the reduced motion setting on
  fs.mkdirSync(path.join(out, 'fallback'), { recursive: true });
  const at = (page, nm, tt) => page.evaluate(([n2, t2]) => { const el = document.querySelector(`[data-scene="${n2}"]`); const r = el.getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + r.height * t2); }, [nm, tt]);
  { const { ctx, page } = await open(browser, 1440, 900, false, '&nowebgl=1');
    for (const nm of EVERY) { await at(page, nm, nm === 'hero' ? 0 : nm === 'explore' ? 0.6 : 0.5); await page.waitForTimeout(1700); await page.screenshot({ path: path.join(out, `fallback/no-webgl-${nm}.png`) }); }
    report.states['no webgl: explore button shown'] = await page.evaluate(() => getComputedStyle(document.querySelector('#open-viewer')).display !== 'none');
    await ctx.close(); }
  { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push('reduced motion pageerror: ' + e.message));
    await page.goto(base + '?q=high'); await page.waitForFunction('window.__ready === true', { timeout: 120000 }); await page.waitForTimeout(3000);
    for (const nm of EVERY) { await at(page, nm, nm === 'hero' ? 0 : nm === 'explore' ? 0.6 : nm === 'sell' ? 0.95 : 0.5); await page.waitForTimeout(3500); await page.screenshot({ path: path.join(out, `fallback/reduced-motion-${nm}.png`) }); }
    await ctx.close(); }
  // a sharper screen: four frames at pixel ratio 2
  { fs.mkdirSync(path.join(out, 'retina'), { recursive: true });
    const { ctx, page } = await open(browser, 1440, 900, false, '', { deviceScaleFactor: 2 });
    for (const [nm, tt] of [['hero', 0], ['buy', 0.65], ['sell', 0.95], ['build', 0.9]]) { await at(page, nm, tt); await settle(page, 2500); await page.screenshot({ path: path.join(out, `retina/${nm}-${Math.round(tt * 100)}.png`) }); }
    await ctx.close(); }
  // the drone film: two frames a second and a half apart, to show it plays
  { fs.mkdirSync(path.join(out, 'film'), { recursive: true });
    const { ctx, page } = await open(browser, 1440, 900, false);
    await page.evaluate(() => { const el = document.querySelector('.film'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); });
    await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, 'film/a.png') });
    const t1 = await page.evaluate(() => document.querySelector('.film video').currentTime);
    await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, 'film/b.png') });
    const t2 = await page.evaluate(() => document.querySelector('.film video').currentTime);
    report.states['drone film seconds played between the two film shots'] = +(t2 - t1).toFixed(2);
    await ctx.close(); }

  // what the browser can tell us about weight and the renderer
  { const { ctx, page } = await open(browser, 1440, 900, false);
    report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    report.transfer = await page.evaluate(() => { const r = performance.getEntriesByType('resource'); const sum = (f) => Math.round(r.filter(f).reduce((a, x) => a + (x.transferSize || x.encodedBodySize || 0), 0) / 1024); return { requests: r.length, script_kb: sum((x) => /\.m?js/.test(x.name)), image_kb: sum((x) => /\.(webp|jpg|png|svg)/.test(x.name)), font_kb: sum((x) => /woff2/.test(x.name)), total_kb: sum(() => true) }; });
    await ctx.close(); }
  }
  report.note = 'Rendered in software (no graphics card on this machine). Frame timing was not measured and ready_ms is not what a visitor would see.';
  report.errors = Array.from(new Set(report.errors)); report.failed = Array.from(new Set(report.failed));
  fs.writeFileSync(path.join(out, part ? `report-${part}.json` : 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log('done', out, part || 'all', 'errors', report.errors.length, 'failed', report.failed.length);
})();
