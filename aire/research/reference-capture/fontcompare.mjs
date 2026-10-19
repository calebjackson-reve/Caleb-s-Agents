// Font comparison. Usage: node fontcompare.mjs <name> <url> <selector> "<Free Font Name>" [weight]
// Crops the live element (paid face, rendered by the site under its own license) and renders the same text
// in the free Google Font at the same computed size, weight, letter-spacing and line-height. Output: <name>/font-compare.png
import { chromium } from 'playwright';
import { dismissOverlays } from './dismiss.mjs';
const [name, url, selector, freeFont, weightArg] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' });
const p = await ctx.newPage();
try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
await p.waitForTimeout(2000);
await dismissOverlays(p);
const el = p.locator(selector).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
const info = await el.evaluate(e => { const s = getComputedStyle(e); return { text: e.innerText.trim(), fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textTransform: s.textTransform, color: s.color, bg: getComputedStyle(e.parentElement).backgroundColor, w: e.getBoundingClientRect().width } });
const refPng = await el.screenshot({ type: 'png' });
const refB64 = refPng.toString('base64');
const weight = weightArg || info.fontWeight;
const fam = encodeURIComponent(freeFont).replace(/%20/g, '+');
const html = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=${fam}&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=${fam}:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>body{margin:0;background:#fbf8f3;color:#14100e;font-family:Nunito,system-ui,sans-serif;padding:32px;width:1376px}
.lab{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#5a524b;margin:0 0 10px}.row{margin-bottom:36px}
.free{font-family:'${freeFont}',sans-serif;font-size:${info.fontSize};font-weight:${weight};line-height:${info.lineHeight};letter-spacing:${info.letterSpacing};text-transform:${info.textTransform};color:${info.color};width:${Math.round(info.w)}px;background:${info.bg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : info.bg};padding:12px 0}
img{max-width:100%;display:block}.meta{font-size:13px;color:#5a524b;margin-top:8px}</style></head><body>
<div class="row"><p class="lab">Reference as rendered live: ${info.fontFamily.split(',')[0]} ${info.fontSize} / ${info.fontWeight}</p><img src="data:image/png;base64,${refB64}"></div>
<div class="row"><p class="lab">Free alternative: ${freeFont} at the same size, weight, tracking and leading</p><div class="free">${info.text.replace(/</g,'&lt;')}</div></div>
<p class="meta">${url} · ${selector} · captured ${new Date().toISOString()} · the reference crop is a screenshot of the live site, no font file was copied</p></body></html>`;
const p2 = await ctx.newPage(); await p2.setContent(html, { waitUntil: 'networkidle' }); await p2.waitForTimeout(1500);
const faces = await p2.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight); }); console.log('free font faces loaded:', faces.join(', ') || 'none (fallback shown)');
await p2.screenshot({ path: `${name}/font-compare.png`, fullPage: true });
console.log(JSON.stringify(info)); await b.close();
