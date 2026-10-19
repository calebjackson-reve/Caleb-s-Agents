// Stage 1 measurement harness. Usage: node measure.js <slug> <url>
// Writes website-rebuild/teardown/<slug>/{desktop,mobile}.json, screenshots, scroll video, resources.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [slug, url] = process.argv.slice(2);
const out = path.resolve(__dirname, '..', slug);
fs.mkdirSync(out, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, hasTouch: true },
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

async function measure(page) {
  return page.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const px = (v) => Math.round(parseFloat(v) * 100) / 100;
    const libs = {
      gsap: typeof window.gsap !== 'undefined' ? (window.gsap.version || true) : false,
      ScrollTrigger: typeof window.ScrollTrigger !== 'undefined',
      lenis: !!(window.lenis || window.Lenis || document.querySelector('html.lenis, .lenis')),
      three: typeof window.THREE !== 'undefined' || !!document.querySelector('canvas'),
      canvasCount: document.querySelectorAll('canvas').length,
      jquery: typeof window.jQuery !== 'undefined' ? window.jQuery.fn.jquery : false,
      next: !!document.getElementById('__next') || !!window.__NEXT_DATA__ || !!document.querySelector('script[src*="/_next/"]'),
      nuxt: !!window.__NUXT__,
      webflow: !!document.querySelector('html[data-wf-site]'),
      barba: !!window.barba,
      swiper: !!window.Swiper || !!document.querySelector('.swiper'),
      locomotive: !!document.querySelector('[data-scroll-container]'),
      smoothScrollbar: !!document.querySelector('.scroll-content'),
    };
    const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
    const links = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href);
    const fonts = {};
    try { for (const f of document.fonts) { const k = f.family + ' ' + f.weight + ' ' + f.style; fonts[k] = f.status; } } catch (e) {}
    const faceRules = [];
    for (const ss of document.styleSheets) {
      try { for (const r of ss.cssRules) { if (r instanceof CSSFontFaceRule) faceRules.push(r.cssText.slice(0, 300)); } } catch (e) {}
    }
    const rootVars = {};
    for (const ss of document.styleSheets) {
      try { for (const r of ss.cssRules) { if (r.selectorText === ':root' || r.selectorText === 'html') { for (const p of r.style) if (p.startsWith('--')) rootVars[p] = r.style.getPropertyValue(p).trim(); } } } catch (e) {}
    }
    const rootCS = cs(document.documentElement), bodyCS = cs(document.body);
    const base = { htmlFontSize: rootCS.fontSize, bodyFontFamily: bodyCS.fontFamily, bodyFontSize: bodyCS.fontSize, bodyLineHeight: bodyCS.lineHeight, bodyColor: bodyCS.color, bodyBg: bodyCS.backgroundColor, htmlBg: rootCS.backgroundColor };
    const typeSel = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'li', 'span', 'label', 'small'];
    const type = {};
    for (const sel of typeSel) {
      const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent && e.textContent.trim().length > 1).slice(0, 60);
      const seen = {};
      for (const e of els) {
        const c = cs(e);
        const k = [c.fontFamily.split(',')[0], c.fontSize, c.lineHeight, c.fontWeight, c.letterSpacing, c.textTransform].join('|');
        if (!seen[k]) seen[k] = { family: c.fontFamily.split(',')[0].replace(/"/g, ''), size: c.fontSize, lineHeight: c.lineHeight, weight: c.fontWeight, letterSpacing: c.letterSpacing, transform: c.textTransform, color: c.color, count: 0, sample: e.textContent.trim().slice(0, 60) };
        seen[k].count++;
      }
      type[sel] = Object.values(seen).sort((a, b) => b.count - a.count).slice(0, 6);
    }
    // sections: direct children of main or body wrapper with height > 120
    const main = document.querySelector('main') || document.body;
    let kids = [...main.children];
    if (kids.length < 3) { const deeper = kids.flatMap(k => [...k.children]); if (deeper.length > kids.length) kids = deeper; }
    if (kids.length < 3) { const deeper = kids.flatMap(k => [...k.children]); if (deeper.length > kids.length) kids = deeper; }
    const sections = kids.map(k => { const r = k.getBoundingClientRect(); const c = cs(k); return { tag: k.tagName.toLowerCase(), id: k.id, cls: (k.className && k.className.baseVal === undefined ? k.className : '').toString().slice(0, 80), top: Math.round(r.top + scrollY), height: Math.round(r.height), bg: c.backgroundColor, paddingTop: c.paddingTop, paddingBottom: c.paddingBottom, position: c.position, text: k.innerText ? k.innerText.trim().replace(/\s+/g, ' ').slice(0, 90) : '' }; }).filter(s => s.height > 60);
    // containers: most common max-width / padding among wide elements
    const widths = {};
    for (const e of document.querySelectorAll('div,section,header,footer,nav')) {
      const c = cs(e); const r = e.getBoundingClientRect();
      if (r.width > 200 && r.width < innerWidth - 10 && c.marginLeft === c.marginRight && c.marginLeft !== '0px') { const k = Math.round(r.width) + ' mx:' + c.marginLeft; widths[k] = (widths[k] || 0) + 1; }
      if (c.maxWidth !== 'none' && r.width > 300) { const k = 'max:' + c.maxWidth; widths[k] = (widths[k] || 0) + 1; }
    }
    const containers = Object.entries(widths).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const pads = {};
    for (const e of document.querySelectorAll('section,div,header,footer')) { const c = cs(e); const r = e.getBoundingClientRect(); if (r.width > innerWidth * 0.8) { for (const p of ['paddingLeft', 'paddingTop']) { if (c[p] !== '0px') { const k = p + ':' + c[p]; pads[k] = (pads[k] || 0) + 1; } } } }
    const padding = Object.entries(pads).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const images = [...document.querySelectorAll('img,video')].filter(i => i.getBoundingClientRect().width > 80).slice(0, 80).map(i => { const r = i.getBoundingClientRect(); const c = cs(i); return { tag: i.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), ratio: Math.round(r.width / r.height * 100) / 100, natural: i.naturalWidth ? i.naturalWidth + 'x' + i.naturalHeight : (i.videoWidth ? i.videoWidth + 'x' + i.videoHeight : ''), fit: c.objectFit, filter: c.filter, radius: c.borderRadius, src: (i.currentSrc || i.src || '').slice(0, 120), top: Math.round(r.top + scrollY) }; });
    const radii = {}; const borders = {};
    for (const e of document.querySelectorAll('button,a,div,img,section')) { const c = cs(e); if (c.borderRadius !== '0px' && e.getBoundingClientRect().width > 20) radii[c.borderRadius] = (radii[c.borderRadius] || 0) + 1; if (c.borderTopWidth !== '0px' && c.borderTopStyle !== 'none') { const k = c.borderTopWidth + ' ' + c.borderTopColor; borders[k] = (borders[k] || 0) + 1; } }
    const transitions = {};
    for (const e of document.querySelectorAll('a,button,img,div')) { const c = cs(e); if (c.transitionDuration !== '0s') { const k = c.transitionProperty.slice(0, 40) + ' ' + c.transitionDuration + ' ' + c.transitionTimingFunction.slice(0, 60); transitions[k] = (transitions[k] || 0) + 1; } }
    const colors = {};
    for (const e of document.querySelectorAll('*')) { const c = cs(e); for (const p of ['color', 'backgroundColor', 'borderTopColor']) { const v = c[p]; if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'rgb(0, 0, 0)' || p === 'color') colors[v] = (colors[v] || 0) + 1; } }
    const topColors = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 16);
    const header = document.querySelector('header, nav, [class*=header], [class*=nav]');
    const headerInfo = header ? (() => { const c = cs(header); const r = header.getBoundingClientRect(); return { tag: header.tagName, cls: String(header.className).slice(0, 80), position: c.position, height: Math.round(r.height), bg: c.backgroundColor, mixBlend: c.mixBlendMode, backdrop: c.backdropFilter, links: [...header.querySelectorAll('a')].map(a => a.textContent.trim()).filter(Boolean).slice(0, 12) }; })() : null;
    const cursor = { bodyCursor: bodyCS.cursor, customCursorEl: !!document.querySelector('[class*=cursor]') };
    const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return { title: document.title, url: location.href, viewport: [innerWidth, innerHeight], docHeight: docH, libs, scripts: scripts.slice(0, 40), stylesheets: links.slice(0, 20), fontsLoaded: fonts, fontFaces: faceRules.slice(0, 20), rootVars, base, type, sections, containers, padding, images, radii: Object.entries(radii).sort((a, b) => b[1] - a[1]).slice(0, 8), borders: Object.entries(borders).sort((a, b) => b[1] - a[1]).slice(0, 8), transitions: Object.entries(transitions).sort((a, b) => b[1] - a[1]).slice(0, 12), topColors, header: headerInfo, cursor, hasLoader: !!document.querySelector('[class*=loader],[class*=preload],[class*=intro]') };
  });
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const VIRTUAL = process.env.VIRTUAL === '1';
  for (const [name, vp] of Object.entries(VIEWPORTS)) { if (process.env.ONLY && process.env.ONLY !== name) continue;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1, userAgent: name === 'mobile' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' : UA, locale: 'en-US' });
    const page = await ctx.newPage();
    const resources = [];
    page.on('response', r => { try { const h = r.headers(); resources.push({ url: r.url().slice(0, 160), type: h['content-type'] ? h['content-type'].split(';')[0] : '', size: h['content-length'] ? +h['content-length'] : null, status: r.status() }); } catch (e) {} });
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)));
    if (VIRTUAL) await page.route(/\.mp4(\?|$)/, r => r.fulfill({ path: path.join(__dirname, 'stub.webm'), contentType: 'video/webm' }));
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(e => console.error('goto', e.message));
    if (VIRTUAL) {
      const gone = await page.waitForFunction(() => { const i = document.querySelector('.preloader--intro'); return !i || getComputedStyle(i).display === 'none' || getComputedStyle(i).opacity === '0' || i.getBoundingClientRect().height === 0; }, null, { timeout: 30000 }).then(() => true).catch(() => false);
      console.log('intro gone on its own:', gone);
      if (!gone) { await page.evaluate(() => { const i = document.querySelector('.preloader--intro'); if (i) i.remove(); document.documentElement.classList.add('is-intro-done'); }); }
    }
    const loadMs = Date.now() - t0;
    // first 3 seconds: frames every 500ms
    for (let i = 0; i < 7; i++) { await page.screenshot({ path: path.join(out, `${name}-t${i * 500}.png`) }); await page.waitForTimeout(500); }
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, `${name}-hero.png`) });
    // scroll through slowly, screenshot every viewport
    const docH = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    const step = Math.round(vp.height * 0.5);
    let shots = 0;
    const sectionsTop = await measure(page);
    fs.writeFileSync(path.join(out, `${name}-attop.json`), JSON.stringify({ sections: sectionsTop.sections, images: sectionsTop.images }, null, 1));
    for (let y = 0; y < docH + vp.height && shots < 60; y += step) {
      if (VIRTUAL) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(700); }
      else { await page.mouse.wheel(0, step); await page.waitForTimeout(350); }
      if (y % (vp.height) < step) { await page.screenshot({ path: path.join(out, `${name}-scroll-${String(shots).padStart(2, '0')}.png`) }); shots++; }
    }
    await page.waitForTimeout(1500);
    const m = await measure(page);
    m.loadMs = loadMs; m.consoleErrors = consoleErrors; m.resources = resources.filter(r => /font|image|video|javascript|css/.test(r.type)).slice(0, 120);
    m.resourceTotals = resources.reduce((a, r) => { const k = (r.type || 'other').split('/')[0]; a[k] = (a[k] || 0) + (r.size || 0); return a; }, {});
    fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(m, null, 1));
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${name}-full.png`), fullPage: true }).catch(e => console.error('full', e.message));
    console.log(name, 'docHeight', m.docHeight, 'sections', m.sections.length, 'shots', shots, 'load', loadMs + 'ms');
    await ctx.close();
  }
  await browser.close();
  // rename video
  for (const f of fs.readdirSync(out)) if (f.endsWith('.webm')) fs.renameSync(path.join(out, f), path.join(out, 'desktop-scroll.webm'));
})();
