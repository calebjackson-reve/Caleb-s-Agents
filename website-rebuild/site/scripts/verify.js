// Stage 4 verification: open every page at desktop and phone, collect console errors,
// check horizontal overflow, confirm entrances fire after scrolling, take screenshots, record scroll video.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'http://localhost:8787/site/';
const PAGES = ['index','search','communities','sell','about','contact','listing-template','neighborhood-template'];
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const OUT = path.join(__dirname, '..', 'verification');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const report = { generated: new Date().toISOString(), base: BASE, pages: {} };
  for (const [vname, vp] of Object.entries(VIEWS)) {
    for (const p of PAGES) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vname === 'mobile', hasTouch: vname === 'mobile',
        userAgent: vname === 'mobile' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined,
        recordVideo: p === 'index' ? { dir: path.join(OUT, 'video-' + vname), size: vp } : undefined });
      const page = await ctx.newPage();
      const errors = [], failed = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('requestfailed', r => failed.push(r.url() + ' ' + (r.failure() || {}).errorText));
      page.on('response', r => { if (r.status() >= 400) failed.push(r.url() + ' ' + r.status()); });
      await page.goto(BASE + p + '.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1800);
      const top = path.join(OUT, `${p}-${vname}-top.png`);
      await page.screenshot({ path: top });
      // scroll through the page in steps, like a user
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const steps = Math.ceil(total / (vp.height * 0.8));
      for (let i = 1; i <= steps; i++) { await page.mouse.wheel(0, vp.height * 0.8); await page.waitForTimeout(220); }
      await page.waitForTimeout(800);
      const stats = await page.evaluate(() => {
        const q = s => document.querySelectorAll(s).length;
        const vids = [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || v.src || '').split('/').pop(), ready: v.readyState, paused: v.paused, w: v.videoWidth }));
        return {
          scrollHeight: document.documentElement.scrollHeight,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          reveals: q('.reveal'), revealsIn: q('.reveal.is-in'),
          words: q('.words'), wordsIn: q('.words.is-in'),
          fades: q('.fade'), fadesIn: q('.fade.is-in'),
          header: !!document.querySelector('.header'), footer: !!document.querySelector('.footer'),
          lenis: !!window.Lenis, gsap: !!window.gsap, scrollTrigger: !!(window.ScrollTrigger),
          triggers: window.ScrollTrigger ? ScrollTrigger.getAll().length : 0,
          fontsLoaded: document.fonts.check('20px "Instrument Serif"'),
          videos: vids,
          imgsBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
        };
      });
      const full = path.join(OUT, `${p}-${vname}-full.png`);
      await page.screenshot({ path: full, fullPage: true }).catch(() => {});
      report.pages[`${p}@${vname}`] = { consoleErrors: errors, failedRequests: failed, ...stats, screenshots: [path.relative(OUT, top), path.relative(OUT, full)] };
      await ctx.close();
      console.log(p, vname, 'errors', errors.length, 'failed', failed.length, 'overflowX', stats.overflowX, 'reveals', stats.revealsIn + '/' + stats.reveals, 'words', stats.wordsIn + '/' + stats.words, 'fades', stats.fadesIn + '/' + stats.fades, 'triggers', stats.triggers);
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
})();
