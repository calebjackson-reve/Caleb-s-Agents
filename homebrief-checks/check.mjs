// Home Brief acceptance checks. Usage:
//   node homebrief-checks/check.mjs <folder-or-url> [--out report-dir]
// Runs the automatable items of the Home Brief Build Standard against every
// HTML page it can reach, at 1440 and 390 wide, reduced motion off and on.
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Playwright: use the project's install, or point PLAYWRIGHT_PATH at a global one.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright').catch(async () => {
  const guesses = ['/opt/node22/lib/node_modules/playwright/index.mjs', '/usr/local/lib/node_modules/playwright/index.mjs', '/opt/homebrew/lib/node_modules/playwright/index.mjs'];
  for (const g of guesses) { try { return await import(g); } catch {} }
  console.error('Playwright not found. Run: npm i -D playwright   (or set PLAYWRIGHT_PATH)'); process.exit(2);
});

const target = process.argv[2];
if (!target) { console.error('usage: node check.mjs <folder-or-url> [--out dir]'); process.exit(2); }
const outIdx = process.argv.indexOf('--out');
const outDir = outIdx > -1 ? process.argv[outIdx + 1] : 'homebrief-report';
await fs.mkdir(outDir, { recursive: true });

const PHONE = '2257470303';
const MUST = ['81', '$25.1M', 'Keller Williams First Choice', '17111 Commerce Centre Drive', 'Prairieville'];
const BANNED = ['90+', '$24.5M', '54 sales', 'Market Place', 'RÊVE', 'Reve Realtors', 'New Orleans', '—'];
const ALLOWED = new Set(['#14100e', '#fbf8f3', '#fbefe9', '#e87757', '#c95f41', '#8d857b', '#ffffff', '#000000']);

const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff' };
let base = target, server;
if (!/^https?:/.test(target)) {
  const root = path.resolve(target);
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    try { const d = await fs.readFile(f); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(d); }
    catch { res.writeHead(404); res.end('nf'); }
  }).listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
}

const rgbToHex = s => { const m = s.match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return null; if (m[3] !== undefined && parseFloat(m[3]) === 0) return null; return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); };
const isGreen = hex => { if (!hex) return false; const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return g > 90 && g > r + 25 && g > b + 25; };

const browser = await chromium.launch();
const results = [];
const seen = new Set(); const queue = [base + '/'];
while (queue.length) {
  const url = queue.shift(); if (seen.has(url) || seen.size > 40) continue; seen.add(url);
  for (const width of [1440, 390]) for (const reduced of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: reduced });
    const page = await ctx.newPage();
    const consoleErrors = [], failed = [], requests = [];
    page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('response', r => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    page.on('request', r => requests.push(r.url()));
    let ok = true;
    try { await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) { ok = false; consoleErrors.push('load failed: ' + e.message); }
    const text = ok ? await page.evaluate(() => document.body.innerText) : '';
    const data = ok ? await page.evaluate((PHONE) => {
      const els = [...document.querySelectorAll('body *')];
      const colors = new Set(), greens = [], small = [], tiny = [];
      for (const el of els) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        for (const k of ['color', 'backgroundColor', 'borderTopColor']) colors.add(cs[k]);
        const r = el.getBoundingClientRect();
        if (el.matches('a,button,[role=button],input,select,textarea') && r.width && r.height && (r.width < 44 || r.height < 44)) small.push(el.tagName + ':' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30));
        if (el.childElementCount === 0 && (el.innerText || '').trim().length > 20 && parseFloat(cs.fontSize) < 17 && !el.closest('footer,small,figcaption,.hint')) tiny.push(el.tagName + ':' + el.innerText.trim().slice(0, 30));
      }
      const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
      const sms = links.filter(h => h.startsWith('sms:')), tel = links.filter(h => h.startsWith('tel:'));
      const internal = links.filter(h => h && !/^(https?:|mailto:|tel:|sms:|#|javascript:)/.test(h)).map(h => new URL(h, location.href).href.split('#')[0]);
      const media = [...document.querySelectorAll('img,video')].map(m => ({ tag: m.tagName, ok: m.tagName === 'IMG' ? (m.complete && m.naturalWidth > 0) : (m.readyState >= 1 || !!m.poster), muted: m.muted, autoplay: m.autoplay }));
      const emailFields = document.querySelectorAll('input[type=email]').length;
      return { colors: [...colors], small, tiny, sms, tel, internal, media, emailFields, phoneOk: [...sms, ...tel].every(h => h.replace(/\D/g, '').endsWith(PHONE)) };
    }, PHONE) : { colors: [], small: [], tiny: [], sms: [], tel: [], internal: [], media: [], emailFields: 0, phoneOk: false };
    if (width === 1440 && reduced === 'no-preference') data.internal.forEach(u => u.startsWith(base) && !seen.has(u) && queue.push(u));
    const hexes = data.colors.map(rgbToHex).filter(Boolean);
    const offPalette = [...new Set(hexes.filter(h => !ALLOWED.has(h)))];
    const greens = offPalette.filter(isGreen);
    const external = requests.filter(r => !r.startsWith(base) && !/fonts\.(googleapis|gstatic)\.com/.test(r));
    const shot = path.join(outDir, `${url.replace(base, '').replace(/[^a-z0-9]+/gi, '_') || 'home'}-${width}-${reduced}.png`);
    if (ok) await page.screenshot({ path: shot, fullPage: true });
    results.push({
      page: url.replace(base, '') || '/', width, reduced,
      loads: ok, consoleErrors: consoleErrors.length, failedRequests: failed.length, externalRequests: external.length,
      greens: greens.length, offPalette: offPalette.length, offPaletteSample: offPalette.slice(0, 6),
      smsLinks: data.sms.length, telLinks: data.tel.length, phoneOk: data.phoneOk,
      mediaBroken: data.media.filter(m => !m.ok).length, autoplayUnmuted: data.media.filter(m => m.autoplay && !m.muted).length,
      mustMissing: MUST.filter(s => !text.includes(s)), bannedFound: BANNED.filter(s => text.includes(s)),
      smallTargets: width === 390 ? data.small.length : null, smallText: width === 390 ? data.tiny.length : null,
      emailFields: data.emailFields, shot,
    });
    await ctx.close();
  }
}
await browser.close(); server?.close();
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));
const row = r => `| ${r.page} | ${r.width} | ${r.reduced === 'reduce' ? 'on' : 'off'} | ${r.loads ? 'yes' : 'NO'} | ${r.consoleErrors} | ${r.failedRequests} | ${r.externalRequests} | ${r.greens} | ${r.offPalette} | ${r.smsLinks}/${r.telLinks} ${r.phoneOk ? 'ok' : 'WRONG'} | ${r.mediaBroken} | ${r.mustMissing.join(', ') || 'none'} | ${r.bannedFound.join(', ') || 'none'} | ${r.smallTargets ?? '-'} | ${r.smallText ?? '-'} | ${r.emailFields} |`;
const md = ['# Home Brief check report', '', `Target: ${target}`, `Pages: ${seen.size}`, '', '| Page | Width | Reduced motion | Loads | Console errors | Failed requests | External requests | Greens | Off-palette colors | sms/tel links | Broken media | Missing required text | Banned text found | Small tap targets | Text under 17px | Email fields |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|', ...results.map(row)].join('\n');
await fs.writeFile(path.join(outDir, 'report.md'), md);
console.log(md);
const bad = results.filter(r => !r.loads || r.consoleErrors || r.failedRequests || r.greens || !r.phoneOk || r.mediaBroken || r.bannedFound.length);
console.log(`\n${bad.length ? 'FAIL' : 'PASS'}: ${bad.length} of ${results.length} page runs have blocking failures. Screenshots and report.json in ${outDir}/`);
process.exit(bad.length ? 1 : 0);
