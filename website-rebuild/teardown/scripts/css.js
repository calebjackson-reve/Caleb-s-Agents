// Pull the CSS facts the computed-style pass cannot see: root font-size rules, keyframes, hover rules, media queries, custom easings.
// Usage: [VIRTUAL=1] node css.js <slug> <url>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [slug, url] = process.argv.slice(2);
const out = path.resolve(__dirname, '..', slug);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
  const page = await ctx.newPage();
  if (process.env.VIRTUAL === '1') await page.route(/\.mp4(\?|$)/, r => r.fulfill({ path: path.join(__dirname, 'stub.webm'), contentType: 'video/webm' }));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    const res = { htmlFontSize: [], keyframes: [], hover: [], media: {}, easings: {}, fontFaces: [], vars: {}, sheets: [] };
    const walk = (rules, mq) => {
      for (const r of rules) {
        try {
          if (r instanceof CSSMediaRule) { res.media[r.conditionText] = (res.media[r.conditionText] || 0) + r.cssRules.length; walk(r.cssRules, r.conditionText); continue; }
          if (r instanceof CSSKeyframesRule) { res.keyframes.push({ name: r.name, css: r.cssText.slice(0, 600) }); continue; }
          if (r instanceof CSSFontFaceRule) { res.fontFaces.push(r.cssText.slice(0, 260)); continue; }
          if (!(r instanceof CSSStyleRule)) continue;
          const sel = r.selectorText; const st = r.style;
          if (/^(html|:root)(\s*,|$)/.test(sel) || sel === 'html' || sel === ':root') { if (st.fontSize) res.htmlFontSize.push({ mq: mq || '', fontSize: st.fontSize }); for (const p of st) if (p.startsWith('--')) res.vars[p] = st.getPropertyValue(p).trim().slice(0, 80); }
          if (/:hover/.test(sel) && res.hover.length < 60) res.hover.push({ sel: sel.slice(0, 100), css: st.cssText.slice(0, 200) });
          const tf = st.transitionTimingFunction || st.animationTimingFunction; if (tf && tf !== 'ease' && tf !== 'initial') res.easings[tf] = (res.easings[tf] || 0) + 1;
          const tr = st.transition; if (tr) { const m = tr.match(/cubic-bezier\([^)]*\)/g); if (m) for (const x of m) res.easings[x] = (res.easings[x] || 0) + 1; }
        } catch (e) {}
      }
    };
    for (const ss of document.styleSheets) { try { res.sheets.push((ss.href || 'inline').slice(-60) + ' ' + ss.cssRules.length); walk(ss.cssRules, ''); } catch (e) { res.sheets.push((ss.href || 'inline').slice(-60) + ' BLOCKED'); } }
    res.htmlComputed = getComputedStyle(document.documentElement).fontSize;
    return res;
  });
  fs.writeFileSync(path.join(out, 'css-facts.json'), JSON.stringify(data, null, 1));
  console.log(slug, 'html font-size rules', JSON.stringify(data.htmlFontSize.slice(0, 12)), 'computed', data.htmlComputed);
  console.log('keyframes', data.keyframes.map(k => k.name).slice(0, 30).join(', '));
  console.log('easings', JSON.stringify(Object.entries(data.easings).sort((a, b) => b[1] - a[1]).slice(0, 10)));
  console.log('media', JSON.stringify(Object.entries(data.media).sort((a, b) => b[1] - a[1]).slice(0, 12)));
  console.log('hover sample', JSON.stringify(data.hover.slice(0, 8)));
  console.log('sheets', data.sheets.slice(0, 10).join(' | '));
  await browser.close();
})();
