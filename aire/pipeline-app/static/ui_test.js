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
const names = [...new Set(people.concat(f.people || []).map(p => p.display).filter(n => n && n.length > 3 && /\s/.test(n)))];
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
run(`CC.data = Object.assign({}, __cc, { fresh: Object.assign({}, __cc.fresh, { deals: { state: 'missing', source: 'AIRE Deals sheet' } }) })`);
check(run('CC.notCurrent()').includes('AIRE Deals sheet'), 'a source never synced is counted as not current, never as all clear');
run('CC.data = __cc');
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

// Round 2, item 1: free text that carries money or a name (a deal's next step, a bank alert subject, the brief) hides too.
{
  const dl = JSON.parse(JSON.stringify(ccdata.deals)); if (dl[0]) { dl[0].next = 'KW Command still shows $7,198 off the old list price'; dl[0].stage = 'contract'; }
  const bankRows = [{ type: 'Deposit', subject: 'You received a $12,053.16 deposit', received: ccdata.at, amount: 12053.16 }];
  run(`CC.data = Object.assign({}, __cc, { deals: ${JSON.stringify(dl)}, bank: Object.assign({}, __cc.bank, { rows: ${JSON.stringify(bankRows)} }) })`);
  for (const v of ['commission', 'deals', 'bank', 'dash']) {
    const t = render(v, true).replace(/<[^>]+>/g, ' ');
    check(!/7,198|12,053/.test(t), `${v}: a dollar amount inside a note or subject hides with privacy on`);
  }
  check(/7,198/.test(render('commission', false)), 'commission: the note shows in full with privacy off');
  run('var __briefHtml = ""; modal = (t, h) => { __briefHtml = h; return new Promise(() => {}); }; CC.priv = true; openBrief();');
  const brief = run('__briefHtml').replace(/<[^>]+>/g, ' ');
  const bleak = names.filter(x => brief.includes(x)).concat(brief.match(/\$\s?\d[\d,]{2,}/g) || []);
  check(!bleak.length, 'morning brief hides names and dollars with privacy on', bleak.slice(0, 3).join(' / '));
  check(/DEALS SHEET/.test(run('__briefHtml')) && !(f.deals || []).some(x => x.address && run('__briefHtml').includes(x.address)), 'morning brief lists the Deals sheet, not the CRM Deals tab');
  run('CC.data = __cc');
}

// Round 2, item 2: Add a lead is one click from the Dashboard and from Leads, a four-field form with one Save.
check(/onclick="CC\.addLead\(\)"/.test(render('dash', true)) && /onclick="CC\.addLead\(\)"/.test(render('ccleads', true)), 'Add a lead is one click from the Dashboard and Leads');
{
  run('var __leadForm = ""; modal = (t, h) => { __leadForm = t + "|" + h; return Promise.resolve(null); }; CC.addLead();');
  const form = run('__leadForm'), ids = [...form.matchAll(/<(?:input|select)[^>]*id="([^"]+)"/g)].map(m => m[1]);
  check(JSON.stringify(ids) === JSON.stringify(['m-lname', 'm-lphone', 'm-lemail', 'm-lsrc']) && /Do Not Contact/.test(form), 'the lead form is name, phone, email and source, and says Do Not Contact is checked', ids.join(','));
}

// Round 2, item 3: one deal source. The map pins, the deal form and the voice read the AIRE Deals sheet.
{
  const cases = { 'Act of Sale · 2179 South Fake': '2179 fake', 'Inspection 11/20 - 14150 Pretend Ln': '14150 pretend', '42553 Hwy 42': '42553 hwy',
    '2179 South Fake Avenue, Zachary, LA': '2179 fake', 'Commission for 41st': 'commission for' };  // the same cases as cc_test.JudgeRound2
  const bad = Object.entries(cases).filter(([t, k]) => run(`CC.dealKey(${JSON.stringify(t)})`) !== k);
  check(!bad.length, 'the screen keys a street the same way cc.deal_key does', bad.map(b => b[0]).join(' / '));
  const sheet = ccdata.deals.find(r => r.stage === 'contract'), closed = ccdata.deals.find(r => r.stage === 'closed');
  if (sheet) {
    const pins = [{ kind: 'deal', key: 'd1', address: sheet.deal + ', Somewhere, LA', stage: 'active', lat: 30.4, lng: -91.1 }]
      .concat(closed ? [{ kind: 'deal', key: 'd2', address: closed.deal, stage: 'under_contract', lat: 30.4, lng: -91.1 }] : []);
    const crmDeals = [{ address: pins[0].address, stage: 'active', price: '1', expected_close: '2099-01-01' }];
    run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { deals: ${JSON.stringify(crmDeals)}, map: Object.assign({}, __state.feed.map, { pins: ${JSON.stringify(pins)} }) }) }); S.mapF.deals = true;`);
    const got = run('JSON.stringify(dealPins().map(p => [p.key, p.stage]))');
    check(got === JSON.stringify([['d1', 'under_contract']]), 'a deal pin takes the sheet status and a closed sheet deal leaves the map', got);
    const pc = run(`CC.priv = false; pinCard(dealPins()[0])`);
    check(pc.includes(run(`esc(${JSON.stringify(sheet.status)})`)) && !pc.includes('>active<'), 'the deal pin card shows the sheet status and price');
    run('var __dealForm = ""; modal = (t, h) => { __dealForm = h; return Promise.resolve(null); };');
    run(`openDeal(${JSON.stringify(pins[0].address)})`);
    const fm = run('__dealForm');
    check(fm.includes(`id="m-price" value="${sheet.price}"`) && fm.includes(`value="${sheet.act}"`) && /Prefilled from the AIRE Deals sheet/.test(fm), 'the deal form is prefilled with the sheet price and act of sale');
    run('S.data = __state; CC.priv = true;');
  }
  const voicejs = fs.readFileSync(path.join(dir, 'voice.js'), 'utf8');
  check(!/f\.deals\b|feed\(\)\.deals|deals_live|f\.new_leads \|\| \[\]\)\.length|const l = f\.new_leads/.test(voicejs), 'voice answers about deals and leads read the Deals sheet and the one lead list');
}

// Round 2, item 4: one new-lead rule. The Dashboard, Scorecard, Leads and the nav all show lead_counts.
{
  const lc = ccdata.lead_counts, d = render('dash', true), sc = render('scorecard', true), lp = render('ccleads', true);
  check(lc && new RegExp(`New leads, 14 days</span><b class="cc-num">${lc.d14}<`).test(d) && d.includes(`${lc.d7} in the last 7 days`), 'Dashboard shows the 14 and 7 day lead counts', JSON.stringify(lc));
  check(new RegExp(`Leads per week</h2><b class="cc-num">${lc.d7}<`).test(sc), 'Scorecard leads per week is the 7 day count');
  check(new RegExp(`Leads <span class="cc-count">${lc.d14}<`).test(lp) && lp.includes(`${lc.d7} came in the last 7 days`), 'Leads page shows the same 14 and 7 day counts');
  check(run('CC.leadsIn(14).length') === lc.d14 && run('CC.leadsIn(7).length') === lc.d7, 'the screen windows leads the same way the server does');
}

// Round 2, item 6: stale and failed reads. Amber when late, red when stale or failed, never a green dot on a failure.
{
  const fr = JSON.parse(JSON.stringify(ccdata.fresh));
  fr.deals = Object.assign({}, fr.deals, { state: 'late', pace_min: 30 }); fr.calendar = Object.assign({}, fr.calendar, { state: 'stale' });
  fr.inbox = Object.assign({}, fr.inbox, { state: 'failed', error: 'quota' });
  run(`CC.data = Object.assign({}, __cc, { fresh: ${JSON.stringify(fr)} })`);
  const srcHtml = run(`CC.src(['deals', 'calendar', 'inbox'])`);
  check(/is-late[^]*late, reads every 30 min/.test(srcHtml) && /is-stale/.test(srcHtml) && /is-failed/.test(srcHtml) && !/is-ok/.test(srcHtml), 'a late read is amber, a stale or failed read is red, none is green');
  const css = fs.readFileSync(path.join(dir, 'cc.css'), 'utf8');
  check(/\.cc-src\.is-failed i, \.cc-src\.is-stale i \{ background: var\(--cc-bad\)/.test(css) && /\.cc-src\.is-late i[^{]*\{ background: var\(--cc-warn\)/.test(css), 'stale and failed dots are red, late dots amber');
  run('CC.data = __cc');
  // The CRM feed's failed rebuild shows on Sources and in the banner, and its dot is red.
  run(`S.data = Object.assign({}, __state, { feed_run: { state: 'failed', at: '2026-11-08T12:45:03-06:00', at_text: 'Nov 8, 12:45 PM', detail: 'crm.py feed failed' } })`);
  check(run(`CC.local('crm').state`) === 'failed' && /is-failed/.test(run(`CC.src('crm')`)), 'a failed CRM feed rebuild is red, not green');
  const srcPage = render('sources', true);
  check(/s-failed[^]*Failed[^]*rebuild at Nov 8, 12:45 PM failed/.test(srcPage), 'Sources names the failed CRM feed rebuild');
  check(/rebuild at Nov 8, 12:45 PM failed/.test(render('touches', true)), 'every page banner names the failed feed rebuild');
  // With no feed at all, the Dashboard says tasks did not load, not that nothing is urgent.
  run(`S.data = Object.assign({}, __state, { feed_ok: false, feed: {} })`);
  const d0 = render('dash', true);
  check(/Tasks didn.t load/.test(d0) && !/Nothing urgent/.test(d0), 'with the feed failed, the Dashboard says Tasks didn\'t load');
  run('S.data = __state');
}

// Round 2, item 7: street tiles that keep failing switch the map to Satellite by itself.
check(run('PMap.streetFailing(6, 0)') && run('PMap.streetFailing(9, 3)') && !run('PMap.streetFailing(5, 0)') && !run('PMap.streetFailing(6, 30)'), 'street tiles failing six times with none drawn switch the map to Satellite');
check(/onBase: b =>/.test(fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')) && /Street tiles didn't load, so this is Satellite/.test(mapjs), 'the switch is remembered and the map says why');

// Service worker: a new cache name, HTML and JS from the network every time, and the page reloads once when a new worker takes over.
const swjs = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
check(!swjs.includes('pipeline-shell-v1-judge1') && /fetch\(e\.request, \{ cache: 'no-store' \}\)/.test(swjs), 'service worker drops the round-1 shell and skips the browser cache');
check(/updateViaCache: 'none'/.test(indexHtml) && /controllerchange/.test(indexHtml), 'the page picks up a new worker and reloads once');
const shell = (swjs.match(/const FILES = \[([^\]]+)\]/) || [])[1] || '';
const scripts = [...indexHtml.matchAll(/<script src="([^"]+)"/g)].map(m => '/' + m[1]);
check(scripts.every(s => shell.includes(`'${s}'`)), 'every script the page loads is in the offline shell', scripts.filter(s => !shell.includes(`'${s}'`)).join(' '));

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
