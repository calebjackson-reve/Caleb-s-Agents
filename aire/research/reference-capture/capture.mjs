// Reference capture rig. Usage: node capture.mjs <name> <url>
// Produces, per viewport (desktop 1440x900, mobile 390x844): full-page PNG, viewport PNG, a JSON evidence dump
// (fonts, type scale, section heights, grid columns, font-face URLs, hero geometry), and a 6 second scroll recording (webm).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, renameSync } from 'fs';
import { dismissOverlays } from './dismiss.mjs';
const [name, url] = process.argv.slice(2);
if (!name || !url) { console.error('usage: node capture.mjs <name> <url>'); process.exit(1); }
const VIEWPORTS = [{ tag: 'desktop', width: 1440, height: 900 }, { tag: 'mobile', width: 390, height: 844, mobile: true }];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const vp of VIEWPORTS) {
  const dir = `${name}/${vp.tag}`; mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, userAgent: UA, recordVideo: { dir, size: { width: vp.width, height: vp.height } } });
  const page = await ctx.newPage();
  const fontUrls = new Set(); const stylesheets = new Set();
  page.on('response', r => { const u = r.url(); const t = (r.headers()['content-type'] || ''); if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u) || /font/i.test(t)) fontUrls.add(u); if (/\.css(\?|$)/i.test(u) || /text\/css/.test(t)) stylesheets.add(u); });
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.screenshot({ path: `${dir}/viewport.png` });
  // scroll through to trigger lazy content and record motion (about 6 s)
  // Find the real scroller: the document, or the tallest scrollable wrapper (sites with inner scroll containers).
  const scroller = await page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement;
    if (doc.scrollHeight > innerHeight * 1.5) return { sel: null, height: doc.scrollHeight };
    let best = null;
    for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight * 1.5 && e.clientHeight > innerHeight * 0.5) { if (!best || e.scrollHeight > best.h) best = { e, h: e.scrollHeight }; } }
    if (!best) return { sel: null, height: doc.scrollHeight };
    best.e.setAttribute('data-capture-scroller', '1'); return { sel: '[data-capture-scroller]', height: best.h };
  });
  const total = scroller.height;
  const t0 = Date.now(); const steps = 24;
  for (let i = 1; i <= steps; i++) { await page.evaluate(([sel, y]) => { const el = sel ? document.querySelector(sel) : null; if (el) el.scrollTop = y; else window.scrollTo({ top: y, behavior: 'instant' }); }, [scroller.sel, Math.round(total * i / steps)]); await page.waitForTimeout(250); }
  await page.evaluate(sel => { const el = sel ? document.querySelector(sel) : null; if (el) el.scrollTop = 0; else window.scrollTo(0, 0); }, scroller.sel); await page.waitForTimeout(800);
  const scrollMs = Date.now() - t0;
  await page.screenshot({ path: `${dir}/fullpage.png`, fullPage: true });
  const evidence = await page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const pick = el => { if (!el) return null; const s = cs(el); const r = el.getBoundingClientRect(); return { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 80), fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textTransform: s.textTransform, color: s.color, top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }; };
    const body = cs(document.body);
    const sections = [...document.querySelectorAll('section, header, footer, main > div, body > div')].filter(e => e.getBoundingClientRect().height > 80).slice(0, 40).map(e => { const r = e.getBoundingClientRect(); const s = cs(e); return { tag: e.tagName.toLowerCase(), id: e.id || null, cls: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 60), top: Math.round(r.top + scrollY), height: Math.round(r.height), display: s.display, gridTemplateColumns: s.gridTemplateColumns !== 'none' ? s.gridTemplateColumns : null, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, background: s.backgroundColor } });
    const grids = [...document.querySelectorAll('*')].filter(e => cs(e).display === 'grid').slice(0, 20).map(e => ({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 60), columns: cs(e).gridTemplateColumns, gap: cs(e).gap, width: Math.round(e.getBoundingClientRect().width) }));
    const faces = []; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r instanceof CSSFontFaceRule) faces.push({ family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), src: r.style.getPropertyValue('src').slice(0, 300) }); } catch {} }
    const families = {}; for (const e of document.querySelectorAll('h1,h2,h3,p,a,button,nav,li,span')) { const f = cs(e).fontFamily; families[f] = (families[f] || 0) + 1; }
    const maxW = [...document.querySelectorAll('main, .container, .wrap, .wrapper, [class*="container"]')].slice(0, 5).map(e => ({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 60), width: Math.round(e.getBoundingClientRect().width), maxWidth: cs(e).maxWidth, paddingLeft: cs(e).paddingLeft }));
    return { viewport: { w: innerWidth, h: innerHeight }, pageHeight: document.documentElement.scrollHeight, base: { fontFamily: body.fontFamily, fontSize: body.fontSize, lineHeight: body.lineHeight, color: body.color, background: body.backgroundColor }, h1: pick(document.querySelector('h1')), h2: pick(document.querySelector('h2')), p: pick(document.querySelector('main p, p')), nav: pick(document.querySelector('nav a, header a')), button: pick(document.querySelector('button, a[class*="btn"], a[class*="button"]')), fontFamiliesInUse: families, fontFaces: faces, sections, grids, containers: maxW };
  });
  evidence.scroller = scroller; evidence.url = url; evidence.capturedAt = new Date().toISOString(); evidence.fontRequests = [...fontUrls]; evidence.stylesheets = [...stylesheets]; evidence.scrollRecordingMs = scrollMs;
  writeFileSync(`${dir}/evidence.json`, JSON.stringify(evidence, null, 2));
  await ctx.close();
  for (const f of readdirSync(dir)) if (f.endsWith('.webm') && f !== 'scroll.webm') renameSync(`${dir}/${f}`, `${dir}/scroll.webm`);
  console.log(`${name}/${vp.tag}: page ${evidence.pageHeight}px, h1 ${evidence.h1?.fontSize} ${evidence.h1?.fontFamily?.split(',')[0]}, ${evidence.fontRequests.length} font files, video in ${dir}/`);
}
await b.close();
