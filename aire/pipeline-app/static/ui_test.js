// Renders every Pipeline page in Node with a stand-in DOM and checks the judge's round-1 fixes on the HTML.
// Run by ui_test.py, which starts the demo server and passes /api/state and /api/cc as JSON files.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const [stateFile, ccFile] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')), ccdata = JSON.parse(fs.readFileSync(ccFile, 'utf8'));

function el() {
  const target = function () {};
  const props = { children: [], style: {}, dataset: {}, hidden: true, value: '', textContent: '', innerHTML: '', className: '',
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false } };
  return new Proxy(target, {
    get: (t, k) => (k in props ? props[k] : k === Symbol.toPrimitive ? () => '' : typeof k === 'symbol' ? undefined : el()),
    set: (t, k, v) => { props[k] = v; return true; }, apply: () => el(),
  });
}
const ctx = { console, Intl, Date, Math, JSON, Promise, Set, Map, Number, String, Array, Object, RegExp, Error, encodeURIComponent,
  setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  performance: { now: () => 0 }, navigator: { clipboard: {} }, location: { hash: '#dash', host: '127.0.0.1' }, history: { replaceState() {} },
  innerWidth: 1440, devicePixelRatio: 1, fetch: async () => ({ json: async () => ({}) }), addEventListener() {}, matchMedia: () => ({ matches: false }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }) };
ctx.window = ctx;
ctx.document = { querySelector: () => el(), querySelectorAll: () => [], getElementById: () => el(), addEventListener() {}, createElement: () => el(), activeElement: null, body: el(), documentElement: el() };
vm.createContext(ctx);
const dir = __dirname;
for (const f of ['voice.js', 'app.js', 'cc.js', 'cc-pages.js', 'crm-pages.js', 'map.js', 'mapviews.js', 'cc-score.js', 'cc-life.js', 'cc-today.js', 'cc-sources.js'])
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
ctx.__state = state; ctx.__cc = ccdata;
const run = js => vm.runInContext(js, ctx);
run('S.data = __state; CC.data = __cc;');

let fails = 0;
const check = (ok, name, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || !detail ? '' : '\n     ' + detail)); if (!ok) fails++; };
const views = run('Object.keys(CC.views)');
const render = (v, priv) => run(`CC.priv = ${priv}; S.view = ${JSON.stringify(v)}; S.filter = 'all'; CC.views[${JSON.stringify(v)}]()`);

// 1. Privacy: with it on, no contact or dollar amount on any page.
const f = state.feed || {};
const people = [].concat(f.touches_due || [], f.tasks || [], f.new_leads || [], f.partners || [], (f.deals || []).map(d => ({ display: d.display })),
  ccdata.leads.map(l => ({ display: l.name, phone: l.phone, email: l.email })), (state.sent_today || []));
const names = [...new Set(people.map(p => p.display).filter(n => n && n.length > 3))];
const phones = [...new Set(people.map(p => String(p.phone || p.to || '').replace(/\D/g, '').slice(-7)).filter(p => p.length === 7))];
const emails = [...new Set(people.map(p => p.email).filter(Boolean))];
const msgs = [...new Set((f.touches_due || []).flatMap(r => (r.last_messages || []).map(m => String(m).replace(/^\d{4}-\d{2}-\d{2}: /, ''))).filter(m => m.length > 12))];
for (const v of views) {
  let html = '';
  try { html = render(v, true); } catch (e) { check(false, `${v} renders with privacy on`, e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
  const text = html.replace(/<[^>]+>/g, ' ');
  const leak = [].concat(names.filter(n => text.includes(n)), phones.filter(p => text.replace(/\D/g, '').includes(p)), emails.filter(e => text.includes(e)),
    msgs.filter(m => text.includes(m)), (text.match(/\$\s?\d[\d,]{2,}/g) || []));
  check(!leak.length, `${v}: privacy on hides names, phones, emails, messages and dollars`, leak.slice(0, 5).join(' / '));
  try { render(v, false); check(true, `${v} renders with privacy off`); } catch (e) { check(false, `${v} renders with privacy off`, e.message); }
  // 16. No developer text on any screen.
  const dev = text.match(/crm\.py|LaunchAgent|org\.calebjackson|\.json\b|PIPELINE_|API_KEY|~\/|aire\/[a-z-]+\/|monitor\.py|python3/g);
  check(!dev, `${v}: no developer text`, dev && dev.join(', '));
  // 8. Every page names a source with a time, except the pages that are settings.
  if (!['sources', 'health', 'life'].includes(v)) check(/cc-src/.test(html) || /cc-empty/.test(html), `${v}: shows a source line`);
}
// Map pin card: a person's card hides contact details too.
const pin = ((f.map || {}).pins || []).find(p => p.kind === 'person' && p.phone);
if (pin) {
  const card = run(`CC.priv = true; pinCard(${JSON.stringify(pin)})`);
  check(!card.includes(pin.display) && !card.replace(/\D/g, '').includes(String(pin.phone).replace(/\D/g, '').slice(-7)), 'map pin card hides the name and phone');
}

// 3. One lead count: the Dashboard tile, the nav and the Leads page agree.
const dash = render('dash', true), leadsPage = render('ccleads', true);
const tileN = (dash.match(/New leads, 14 days<\/span><b class="cc-num">(\d+)/) || [])[1];
const pageN = (leadsPage.match(/Leads <span class="cc-count">(\d+)/) || [])[1];
check(tileN && tileN === pageN && Number(tileN) === ccdata.leads.length, 'one lead count on the Dashboard and Leads', `tile ${tileN}, page ${pageN}, data ${ccdata.leads.length}`);
check(!views.includes('leads') && !views.includes('cc'), 'New leads and the HUD Command Center are gone (merged)');

// 2. One deal source: the Dashboard's under-contract count is the Deals sheet's.
const uc = ccdata.deals.filter(r => r.stage === 'contract').length;
check(new RegExp(`Under contract</span><b class="cc-num">${uc}<`).test(dash), 'Dashboard under contract matches the Deals sheet', `sheet ${uc}`);
// 5. Deadlines once per deal and day.
const dl = ccdata.deadlines.all.map(r => r.key + '|' + r.day);
check(dl.length === new Set(dl).size, 'deadlines are one per deal per day');

// 18. Nav: grouped, distinct icons, keys match.
const nav = run('NAV'), items = nav.flatMap(g => g[1]);
check(nav.length >= 5 && items.length <= 20, `nav is grouped (${nav.length} groups, ${items.length} items)`);
check(new Set(items.map(i => i[1])).size === items.length, 'every nav item has its own icon');
check(items.every(([k]) => views.includes(k)), 'every nav item opens a page');
check(run('KEYS').every(k => items.some(i => i[0] === k)), 'keyboard keys open pages that are in the nav');

// 8. The status never says OPTIMAL or "N connected".
const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
check(!/OPTIMAL|connected<\/span>/.test(appjs), 'no OPTIMAL and no "connected" count');
run(`S.data = Object.assign({}, __state, { feed_ok: false })`);
check(run('CC.failing()').length > 0, 'a failed CRM read is counted as failed');
run('S.data = __state');

// 10. Tags: only coral, tan and the neutral muted color.
const ui = fs.readFileSync(path.join(dir, 'ui.css'), 'utf8');
const kcolors = [...ui.matchAll(/--k:\s*(#[0-9a-f]{6})/gi)].map(m => m[1].toLowerCase());
check(kcolors.length && kcolors.every(c => ['#e87757', '#c8b596', '#aaa298'].includes(c)), 'tag colors are coral, tan or neutral', kcolors.join(' '));
check(!/text-decoration:\s*line-through/.test(ui) && /cc-filter\[aria-pressed="false"\][^}]*text-decoration:\s*none/.test(ui), 'filter chips are never struck through');
// 9. No particle orb.
check(!fs.existsSync(path.join(dir, 'core.js')) && !fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('src="core.js"'), 'the particle core is gone');
// 6. Map tiles come from a source that allows apps.
const mapjs = fs.readFileSync(path.join(dir, 'map.js'), 'utf8');
check(!mapjs.includes('tile.openstreetmap.org/${z}') && mapjs.includes('basemap.nationalmap.gov/arcgis/rest/services/USGSTopo'), 'street tiles are USGS, not tile.openstreetmap.org');
check(/function drawLabels/.test(mapjs) && /hit\(b\)/.test(mapjs), 'area labels are placed so they never overlap');
// 14 and 17: no arrow on 0%, and a photo-only text says so.
check(!/▲ 0%|▼ 0%/.test(render('ccmarket', false)), 'no arrow on 0%');
check(run(`CC.cleanMsg('2026-11-05: \\uFFFC')`) === 'Sent a photo or attachment', 'a photo-only text reads "Sent a photo or attachment"');
// 13. Commission says gross.
check(/gross/.test(render('commission', false)), 'commission is labelled gross');
// 12. Booked time says what it leaves out.
check(/invites you have not accepted are left out/.test(dash), 'Booked and On the calendar say work blocks and invites are left out');

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
