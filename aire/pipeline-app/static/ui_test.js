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
for (const f of ['voice.js', 'app.js', 'cc.js', 'cc-pages.js', 'crm-pages.js', 'map.js', 'mapviews.js', 'reach.js', 'fix.js', 'stage.js', 'person.js', 'cc-score.js', 'cc-life.js', 'cc-today.js', 'cc-sources.js'])
  vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
ctx.__state = state; ctx.__cc = ccdata;
const run = js => vm.runInContext(js, ctx);
run('S.data = __state; CC.data = __cc;');

let fails = 0;
const check = (ok, name, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || !detail ? '' : '\n     ' + detail)); if (!ok) fails++; };
const views = run('Object.keys(CC.views)');
const render = v => run(`S.view = ${JSON.stringify(v)}; S.filter = 'all'; CC.views[${JSON.stringify(v)}]()`);

// 1. Nothing hides behind a sitewide switch (Caleb, 2026-11-10): names, contacts and dollars show on every page.
// Only the Bank page has a Show and Hide, and only for its own figures.
const f = state.feed || {};
const people = [].concat(f.touches_due || [], f.tasks || [], f.new_leads || [], f.partners || [], (f.deals || []).map(d => ({ display: d.display })),
  ccdata.leads.map(l => ({ display: l.name, phone: l.phone, email: l.email })), (state.sent_today || []));
const names = [...new Set(people.concat(f.people || []).map(p => p.display).filter(n => n && n.length > 3 && /\s/.test(n)))];
const phones = [...new Set(people.map(p => String(p.phone || p.to || '').replace(/\D/g, '').slice(-7)).filter(p => p.length === 7))];
const emails = [...new Set(people.map(p => p.email).filter(Boolean))];
const msgs = [...new Set((f.touches_due || []).flatMap(r => (r.last_messages || []).map(m => String(m).replace(/^\d{4}-\d{2}-\d{2}: /, ''))).filter(m => m.length > 12))];
for (const v of views) {
  let html = '';
  try { html = render(v); check(true, `${v} renders`); } catch (e) { check(false, `${v} renders`, e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
  const text = html.replace(/<[^>]+>/g, ' ');
  check(!/Name hidden|Message hidden|Note hidden|Money and contacts hidden|cc-privnote|\$•••/.test(v === 'bank' ? html.replace(/\$•••/g, '') : html), `${v}: nothing is hidden behind a sitewide switch`);
  check(v === 'bank' ? /id="bank-show"/.test(html) : !/class="cc-priv"/.test(html), `${v}: ${v === 'bank' ? 'has its own Show for bank figures' : 'has no Show or Hide control'}`);
  // 16. No developer text on any screen.
  const dev = text.match(/crm\.py|LaunchAgent|org\.calebjackson|\.json\b|PIPELINE_|API_KEY|~\/|aire\/[a-z-]+\/|monitor\.py|python3/g);
  check(!dev, `${v}: no developer text`, dev && dev.join(', '));
  // 8. Every page names a source with a time, except the pages that are settings.
  if (!['sources', 'health', 'life'].includes(v)) check(/cc-src/.test(html) || /cc-empty/.test(html), `${v}: shows a source line`);
}
// Map pin card: a person's card shows the first and last name. A contact with no name on the sheet says so.
const pin = ((f.map || {}).pins || []).find(p => p.kind === 'person' && p.phone);
if (pin) {
  const card = run(`pinCard(${JSON.stringify(pin)})`);
  check(/\s/.test(pin.display) && card.includes(run(`esc(${JSON.stringify(pin.display)})`)) && !/Name hidden/.test(card), 'map pin card shows the first and last name');
  check(/No name on the sheet/.test(run(`pinCard(${JSON.stringify(Object.assign({}, pin, { display: '' }))})`)), 'a pin with no name on the sheet says so, and no name is made up');
}
{ const t0 = (f.touches_due || []).find(r => r.display && /\s/.test(r.display));
  if (t0) check(render('touches').includes(run(`esc(${JSON.stringify(t0.display)})`)), 'Touches due shows first and last names'); }

// 3. One lead count: the Dashboard tile, the nav and the Leads page agree.
const dash = render('dash'), leadsPage = render('ccleads');
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
// 21 since 2026-11-10: Home and People joined (the light look) on the same day as Grok calls (PR 104). Dashboard already gave up its slot.
check(nav.length >= 5 && items.length <= 21, `nav is grouped (${nav.length} groups, ${items.length} items)`);
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
// 2026-11-09: Caleb chose "keep black, add a color code". The palette is coral and tan plus the status colors below,
// nothing else (this replaces round 2's coral-and-tan-only rule).
const PALETTE = ['#e87757', '#c8b596', '#aaa298', '#ff5a5f', '#f5b041', '#4ea8ff', '#3ecf8e', '#a78bfa', '#2dd4bf', '#8f877e', '#8fa3b8'];
check(kcolors.length && kcolors.every(c => PALETTE.includes(c)), 'tag colors come only from the approved palette', kcolors.filter(c => !PALETTE.includes(c)).join(' '));
check(!/text-decoration:\s*line-through/.test(ui) && /cc-filter\[aria-pressed="false"\][^}]*text-decoration:\s*none/.test(ui), 'filter chips are never struck through');
// 9. No particle orb.
check(!fs.existsSync(path.join(dir, 'core.js')) && !fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('src="core.js"'), 'the particle core is gone');
// 6. The map's finished surface is Pipeline's own drawing, not street tiles (look approved 2026-11-10). Satellite, from a
// source that allows apps, stays as an option for drawing a farm.
const mapjs = fs.readFileSync(path.join(dir, 'map.js'), 'utf8');
check(!mapjs.includes('tile.openstreetmap.org') && !mapjs.includes('USGSTopo') && !/cartocdn|googleapis\.com\/maps|mapbox/i.test(mapjs) && /paper: \{ url: null/.test(mapjs) && /base: opts\.base \|\| 'paper'/.test(mapjs), 'the map opens on the drawn basemap, with no street tiles');
check(mapjs.includes('basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly'), 'satellite imagery is USGS, a source that allows apps');
check(/function drawLabels/.test(mapjs) && /hit\(b\)/.test(mapjs), 'area labels are placed so they never overlap');
// 14 and 17: no arrow on 0%, and a photo-only text says so.
check(!/▲ 0%|▼ 0%/.test(render('ccmarket')), 'no arrow on 0%');
check(run(`CC.cleanMsg('2026-11-05: \\uFFFC')`) === 'Sent a photo or attachment', 'a photo-only text reads "Sent a photo or attachment"');
// 13. Commission says gross.
check(/gross/.test(render('commission')), 'commission is labelled gross');
// 12. Booked time says what it leaves out.
check(/invites you have not accepted are left out/.test(dash), 'Booked and On the calendar say work blocks and invites are left out');

// Round 2, item 1: free text that carries money or a name (a deal's next step, a bank alert subject, the brief) hides too.
{
  const dl = JSON.parse(JSON.stringify(ccdata.deals)); if (dl[0]) { dl[0].next = 'KW Command still shows $7,198 off the old list price'; dl[0].stage = 'contract'; }
  const bankRows = [{ type: 'Deposit', subject: 'You received a $12,053.16 deposit', received: ccdata.at, amount: 12053.16 }];
  run(`CC.data = Object.assign({}, __cc, { deals: ${JSON.stringify(dl)}, bank: Object.assign({}, __cc.bank, { rows: ${JSON.stringify(bankRows)} }) })`);
  check(/7,198/.test(render('commission')), 'commission: a dollar amount inside a note shows in full');
  run('CC.bankHide = true');
  const bh = render('bank').replace(/<[^>]+>/g, ' ');
  check(!/12,053/.test(bh) && /Details hidden/.test(bh) && /Show bank figures/.test(bh), 'bank: balances, deposits and alert text stay hidden until Show is pressed on that page');
  run('CC.bankHide = false');
  const bs = render('bank').replace(/<[^>]+>/g, ' ');
  check(/12,053/.test(bs) && /Hide bank figures/.test(bs), 'bank: Show on the Bank page reveals its figures');
  run('CC.bankHide = true');
  run(`S.view = 'bank'; CC.bankHide = false; CC.asks.bank = { answer: 'Cash is $12,053.16' }; CC.leaveBank()`);
  check(run('CC.bankHide') === false && !!run('CC.asks.bank'), 'bank: figures stay shown while you are on the Bank page');
  run(`S.view = 'search'; CC.leaveBank()`);
  check(run('CC.bankHide') === true && run('CC.asks.bank') === undefined && /function render\(\) \{\s*if \(window\.CC && CC\.leaveBank\) CC\.leaveBank\(\);/.test(appjs),
    'bank: any way off the page (nav, search, a link) hides the figures again and drops an Ask answer that may quote them');
  run(`S.view = 'bank'; CC.bankHide = false; CC.asks.bank = { answer: 'x' }; var __r = CC.rerender; CC.rerender = () => {}; CC.toggleBank(); CC.rerender = __r;`);
  check(run('CC.bankHide') === true && run('CC.asks.bank') === undefined, 'bank: Hide on the Bank page hides the figures and drops the Ask answer');
  run(`S.view = 'dash'`);
  run('var __briefHtml = ""; modal = (t, h) => { __briefHtml = h; return new Promise(() => {}); }; openBrief();');
  const brief = run('__briefHtml').replace(/<[^>]+>/g, ' ');
  check(!/Name hidden|Message hidden|\$•••/.test(run('__briefHtml')), 'morning brief shows names and dollars as they are');
  check(/DEALS SHEET/.test(run('__briefHtml')) && !(f.deals || []).some(x => x.address && run('__briefHtml').includes(x.address)), 'morning brief lists the Deals sheet, not the CRM Deals tab');
  run('CC.data = __cc');
}

// Round 2, item 2: Add a lead is one click from the Dashboard and from Leads, a four-field form with one Save.
check(/onclick="CC\.addLead\(\)"/.test(render('dash')) && /onclick="CC\.addLead\(\)"/.test(render('ccleads')), 'Add a lead is one click from the Dashboard and Leads');
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
    const pc = run(`pinCard(dealPins()[0])`);
    check(pc.includes(run(`esc(${JSON.stringify(sheet.status)})`)) && !pc.includes('>active<'), 'the deal pin card shows the sheet status and price');
    run('var __dealForm = ""; modal = (t, h) => { __dealForm = h; return Promise.resolve(null); };');
    run(`openDeal(${JSON.stringify(pins[0].address)})`);
    const fm = run('__dealForm');
    check(fm.includes(`id="m-price" value="${sheet.price}"`) && fm.includes(`value="${sheet.act}"`) && /Prefilled from the AIRE Deals sheet/.test(fm), 'the deal form is prefilled with the sheet price and act of sale');
    run('S.data = __state; ');
  }
  const voicejs = fs.readFileSync(path.join(dir, 'voice.js'), 'utf8');
  check(!/f\.deals\b|feed\(\)\.deals|deals_live|f\.new_leads \|\| \[\]\)\.length|const l = f\.new_leads/.test(voicejs), 'voice answers about deals and leads read the Deals sheet and the one lead list');
}

// Round 2, item 4: one new-lead rule. The Dashboard, Scorecard, Leads and the nav all show lead_counts.
{
  const lc = ccdata.lead_counts, d = render('dash'), sc = render('scorecard'), lp = render('ccleads');
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
  const srcPage = render('sources');
  check(/s-failed[^]*Failed[^]*rebuild at Nov 8, 12:45 PM failed/.test(srcPage), 'Sources names the failed CRM feed rebuild');
  check(/rebuild at Nov 8, 12:45 PM failed/.test(render('touches')), 'every page banner names the failed feed rebuild');
  // With no feed at all, the Dashboard says tasks did not load, not that nothing is urgent.
  run(`S.data = Object.assign({}, __state, { feed_ok: false, feed: {} })`);
  const d0 = render('dash');
  check(/Tasks didn.t load/.test(d0) && !/Nothing urgent/.test(d0), 'with the feed failed, the Dashboard says Tasks didn\'t load');
  run('S.data = __state');
}

// Round 2, item 7 (street tiles that fail switch to Satellite) is retired with the street tiles: the drawn basemap needs
// no network, so there is nothing to fall back from. The two surfaces are still one tap apart.
check(!/streetFailing/.test(mapjs + fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')) && /mapBase\('paper'\)/.test(fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')) && /mapBase\('sat'\)/.test(fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')), 'the drawn map and Satellite are both one tap away, and no tile fallback is left over');

// Round 2, item 8: the header search works from every page and says No match when nothing is found.
{
  const pick = (f.touches_due || []).find(r => r.display && r.display.split(' ')[1]);
  if (pick) {
    run(`S.q = ${JSON.stringify(pick.display.split(' ')[1])}`);
    const hits = run(`CC.views.search()`);
    check(hits.includes(run(`esc(${JSON.stringify(pick.display)})`)) && /match/.test(hits), 'search from any page finds a person by name');
  }
  run(`S.q = 'zzqx no such thing'`);
  for (const v of ['search', 'touches', 'tasks', 'deals', 'ccleads', 'queue', 'monitor'])
    check(/No match for “zzqx no such thing”/.test(run(`CC.views[${JSON.stringify(v)}]()`)), `${v}: an empty search says No match`);
  run(`S.q = ''`);
  const own = run('CC.SEARCHES_ITSELF'), nonList = views.filter(v => !own.includes(v) && v !== 'search');
  check(nonList.length > 5 && /S\.view = 'search'/.test(appjs) && /S\.before \|\| 'home'/.test(appjs), 'typing on a page with no list opens Search, clearing it goes back');
}

// Round 2, item 9: one owe-a-reply number. Touches due's count shows on the Dashboard, Touches due and Drafts, even when
// the signals file and the reply-draft queue say something else.
{
  const owe = (f.touches_due || []).filter(r => r.owes_reply).length;
  const tq = Object.assign({}, state.text_queue || {}, { reply_first: ((state.text_queue || {}).reply_first || []).slice(0, Math.max(0, owe - 1)) });
  run(`S.data = Object.assign({}, __state, { text_queue: ${JSON.stringify(tq)}, feed: Object.assign({}, __state.feed, { signals: Object.assign({}, __state.feed.signals, { owes_reply: 999 }) }) })`);
  const dsh = render('dash'), tch = render('touches'), drf = render('queue');
  check(owe > 0 && dsh.includes(`${owe} owe a reply`) && tch.includes(`Owe a reply <b>${owe}</b>`) && drf.includes(`${owe} owe a reply (the same number as Touches due)`),
    'Dashboard, Touches due and Drafts show the same owe-a-reply number', `touches ${owe}`);
  check(/have no first name on file/.test(drf) && !/999/.test(dsh + tch + drf) && !/signals\.owes_reply/.test(appjs), 'Drafts explains the people with no reply draft, and nothing reads the signals count');
  run('S.data = __state');
}

// Round 2, item 10: the Scorecard uses the saved history and draws no trend line without two saved days.
{
  const hist = [{ day: '2026-11-02', gci: 1, pending: 0, closings: 1, leads7: 4, appts7: 0 }, { day: ccdata.today, gci: 1, pending: 0, closings: 1, leads7: 3, appts7: 0 }];
  run(`CC.data = Object.assign({}, __cc, { history: ${JSON.stringify(hist)}, history_saved: 1, deltas: { gci: {7: null, 30: null}, closings: {7: null, 30: null}, leads7: {7: null, 30: null}, appts7: {7: null, 30: null} },
    since: { leads7: { since: '2026-11-02', days: 1, value: -1 } } })`);
  const one = render('scorecard');
  check(!/<svg class="cc-spark"/.test(one) && /No trend line yet: one day is saved/.test(one), 'one saved day draws no trend line, it says so');
  check(/Since [A-Z][a-z]{2}, Nov 2: <b>−1<\/b>/.test(one) && !/no history yet/.test(one), 'with no day 7 days old, the change since the first saved day shows with its date');
  run(`CC.data = Object.assign({}, CC.data, { history: ${JSON.stringify([{ day: '2026-11-01', gci: 1, pending: 0, closings: 1, leads7: 2, appts7: 0 }].concat(hist))}, history_saved: 2 })`);
  check(/<svg class="cc-spark"/.test(render('scorecard')), 'two saved days draw the trend line');
  run('CC.data = __cc');
}

// Round 2, item 11: CRM pages say their source and time at the top, Tasks says where its count comes from, and the three
// people counts are explained in words.
{
  for (const v of ['touches', 'tasks', 'queue', 'sent', 'monitor', 'search']) {
    if (v === 'search') run(`S.q = 'a'`);
    check(/<section class="cc-card"><p class="cc-srcline"><span class="cc-src/.test(render(v)), `${v}: the source and as-of time are at the top of the list`);
    run(`S.q = ''`);
  }
  const tk = f.tasks || [], tab = tk.filter(t => t.task_id).length;
  check(render('tasks').includes(`${tk.length} open: ${tab} on the Tasks tab and ${tk.length - tab} from the Next_Action column on contacts`), 'Tasks says how many come from the Tasks tab and how many from Next_Action');
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { tasks: [{ person_id: '1', display: 'A Fixture', task: 'Call', due: '', source: 'Next_Action' }] }) })`);
  check(/That is why the Tasks tab itself shows none open/.test(render('tasks')), 'with every task from Next_Action, Tasks explains why the Tasks tab shows none');
  run('S.data = __state');
  const pl = run('CC.peopleLine()'), c = f.counts || {};
  check(pl.includes(c.contacts.toLocaleString() + ' contacts in the AIRE CRM sheet') && (!(f.signals || {}).people || pl.includes('have texts with you')) && pl.includes('placed on the map'), 'the people counts are explained in one sentence', pl);
  check(render('sources').includes(pl) && render('map').includes(pl), 'Sources and the Map carry that sentence');
}

// Round 2, item 12: phone width. The page itself is checked at 390 px in Chrome (no sideways scroll on any page); these keep
// the rules that make it so.
{
  const uiPhone = (ui.match(/@media \(max-width: 720px\) \{[^]*?\n\}/) || [''])[0];
  check(/\.side \.brand \{ position: sticky; left: 0;/.test(uiPhone) && /\.side \.brand-name, \.side \.brand-sub \{ display: none; \}/.test(uiPhone), 'phone: the P mark is pinned at the left of the nav, never clipped');
  check(/\.nav-h \{ display: inline-flex;/.test(uiPhone) && /\.nav-g \+ \.nav-g \{ border-left/.test(uiPhone), 'phone: nav groups keep their names as dividers');
  check(/\.cc-row-main, \.cc-what, \.cc-note, \.cc-row-why[^{]*\{ min-width: 0; overflow-wrap: anywhere; \}/.test(ui), 'long words in notes wrap instead of spilling sideways');
  const com = render('commission'), tds = (com.match(/<table class="cc-table cc-stack">[^]*?<\/table>/) || [''])[0].match(/<td[^>]*>/g) || [];
  check(tds.length > 0 && tds.every(t => /data-label="[^"]+"/.test(t)) && /td::before \{ content: attr\(data-label\)/.test(ui), 'phone: the Commission table stacks into rows with every cell labelled');
  check(/class="cc-rows cc-tasks"/.test(render('tasks')), 'Tasks rows get their phone spacing');
}

// Round 2, item 13: one visual style. Coral and tan, no blue or green anywhere (CSS or map pins), no strikethrough, no
// word "blank", and the CRM pages use the same head and card as the card pages.
{
  const hueOf = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return null; const sat = l > .5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn); if (sat < .3 || l < .15 || l > .93) return null;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h *= 60; return h < 0 ? h + 360 : h; };
  const coolIn = f => (fs.readFileSync(path.join(dir, f), 'utf8').match(/#[0-9a-f]{6}\b/gi) || []).filter(c => { const h = hueOf(c); return h !== null && h >= 75 && h <= 290; });
  // The light look adds the seven stage colors (stage.js). Those and the older color code are the only cool colors anywhere.
  const STAGE_HEX = run('Stage.TABS.map(t => t[1].toLowerCase())');
  const cool = ['ui.css', 'cc.css', 'map.js', 'mapviews.js', 'reach.js', 'fix.js', 'stage.js', 'light.css'].flatMap(f => coolIn(f).filter(c => !PALETTE.includes(c.toLowerCase()) && !STAGE_HEX.includes(c.toLowerCase())).map(c => f + ' ' + c));
  check(!cool.length, 'no blue or green outside the color code, in the page styles or the map pins', cool.join(' '));
  const cssAll = ['ui.css', 'cc.css', 'app.css'].map(x => fs.readFileSync(path.join(dir, x), 'utf8')).join('\n');
  check(!/line-through/.test(cssAll), 'no strikethrough rule anywhere');
  const words = [], strikes = [];
  for (const v of views) for (const p of [true, false]) { const h = render(v, p); if (/\bblank\b/i.test(h.replace(/<[^>]+>/g, ' ').replace(/_blank/g, ''))) words.push(v); if (/<s[\s>]/.test(h)) strikes.push(v); }
  check(!words.length, 'no page says "blank"', [...new Set(words)].join(' '));
  check(!strikes.length, 'no page draws a struck-through element', [...new Set(strikes)].join(' '));
  for (const v of ['touches', 'tasks', 'queue', 'sent']) { const h = render(v); check(/<header class="cc-head">/.test(h) && /<section class="cc-card">/.test(h), `${v}: the same head and card as the card pages`); }
}

// Round 2, items 14 and 15: no developer text, Escape closes the Keys window, and each Market tile has its own source.
{
  run('var __keys = ""; modal = (t, h) => { __keys = t + "|" + h; return Promise.resolve(null); }; openHelp();');
  const keysTxt = run('__keys');
  const kbds = [...keysTxt.matchAll(/<kbd>([^<]+)<\/kbd>/g)].map(m => m[1]);
  check(/^Keyboard shortcuts\|/.test(keysTxt) && kbds.every(k => !/^[a-z]$/.test(k)) && !/Backspace|\bEsc\b|Enter\b/.test(keysTxt), 'the Keys window names keys in plain words, no lowercase codes', kbds.join(' '));
  check(/if \(e\.key === 'Escape' && !\$\('#modal'\)\.hidden\) \{ e\.preventDefault\(\); closeModal\(\); return; \}/.test(appjs) && /'role', 'dialog'/.test(appjs), 'Escape closes an open window wherever the focus is');
  const mk = Object.assign({}, ccdata.market, { rate: null, warnings: ['The mortgage rate (Freddie Mac, via FRED) did not load: the site took too long to answer'],
    parts: { rate: { state: 'failed', note: 'x' }, areas: { state: 'ok' }, gbrar: { state: 'ok' } } });
  run(`CC.data = Object.assign({}, __cc, { market: ${JSON.stringify(mk)} })`);
  const mp = render('ccmarket'), tiles = (mp.match(/<div class="cc-tile">[^]*?<\/span><\/div>/g) || []);
  check(tiles.length >= 4 && tiles.every(t => /class="cc-src/.test(t)), 'every Market tile carries its own source line');
  check(/is-failed"><i aria-hidden="true"><\/i>Freddie Mac PMMS, via FRED[^<]*<b>did not load in the last read/.test(mp) && /is-ok"><i aria-hidden="true"><\/i>GBRAR/.test(mp), 'a failed source is red on its own tile, the others stay current');
  check(!/Error|Errno|urlopen|Traceback/.test(mp.replace(/<[^>]+>/g, ' ')), 'Market shows no Python error text');
  run('CC.data = __cc');
}

// Round 2, item 16: Commission flags a paid commission email with no closed deal on the Deals sheet.
{
  const cm = [{ subject: 'Commission for Fake Chapel', received: ccdata.today, status: 'No closed deal' }, { subject: 'Commission for 310 Sugar Mill', received: ccdata.today, status: 'Paid' }];
  run(`CC.data = Object.assign({}, __cc, { commission_mail: ${JSON.stringify(cm)} })`);
  const com = render('commission');
  check(/Paid, no closed deal<\/span><b class="cc-num">1</.test(com) && /class="cc-chip s-Nocloseddeal">No closed deal/.test(com) && /no deal on the Deals sheet with this street is Closed/.test(com), 'Commission flags a paid commission with no closed deal and says what to check');
  check(/\.cc-chip\.s-Nocloseddeal \{ color: var\(--cc-coral\)/.test(ui), 'the flag is coral like Not processed');
  run('CC.data = __cc');
}

// Reviewer findings on round 2: dialogs, toasts, the compose drawer, Market text, the map banner and counts.
{
  const tdp = (f.touches_due || []).find(r => r.display && /\s/.test(r.display) && r.phone);
  if (tdp) {
    check(run(`personSelect('')`).includes(run(`esc(${JSON.stringify(tdp.display)})`)), 'the task picker lists people by name');
    run('var __t = ""; modal = (t, h) => { __t = t + "|" + h; return Promise.resolve(null); };');
    run(`touched(${JSON.stringify(tdp.person_id)})`);
    check(run('__t').toUpperCase().includes(tdp.display.toUpperCase()), 'the Touched dialog names the person');
    run(`var __drawer = {}; var __q = document.querySelector; document.querySelector = s => s === '#drawer' ? __drawer : (s === '#c-body' ? { addEventListener() {}, focus() {}, setSelectionRange() {}, value: '' } : __q(s));`);
    run(`openCompose(${JSON.stringify(tdp.person_id)})`);
    const dh = run('__drawer.innerHTML || ""');
    check(dh && dh.includes(run(`esc(${JSON.stringify(tdp.display)})`)) && !/cc-masked|press the H key|Name hidden/.test(dh), 'the compose drawer shows the name, the number and their texts');
    run('document.querySelector = __q; S.compose = null;');
  }
  const mr = { kind: 'market', key: 'mx', type: 'permit', label: 'Roof', address: '1 Fixture Way', city: 'Zachary', date: '2026-11-01', subtype: 'Reroof', description: 'Reroof $350,000 for John Fixture', value: 350000, source: 'EBR permits', source_date: '2026-11-02' };
  const mc = run(`pinCard(${JSON.stringify(mr)})`);
  check(/350,000/.test(mc) && /John Fixture/.test(mc), 'Market Monitor detail text reads as the public record has it');
  const fr2 = JSON.parse(JSON.stringify(ccdata.fresh)); fr2.deals = Object.assign({}, fr2.deals, { state: 'failed', error: 'x', error_text: 'access to this source was refused' });
  run(`CC.data = Object.assign({}, __cc, { fresh: ${JSON.stringify(fr2)}, problems: [Object.assign({ name: 'deals' }, ${JSON.stringify(fr2.deals)})] })`);
  check(/cc-banner/.test(render('map')) && /access to this source was refused/.test(render('dash')), 'the map pages carry the banner, and read errors show in plain words');
  run('CC.data = __cc');
  run(`S.data = Object.assign({}, __state, { feed_age_minutes: null, feed: Object.assign({}, __state.feed, { generated_at: null }) })`);
  check(run(`CC.local('crm').state`) === 'missing', 'a feed with no build time is never green');
  run('S.data = __state');
  const cm = [{ subject: 'Commission for Fake Chapel', received: ccdata.today, status: 'No closed deal' }, { subject: 'x', received: ccdata.today, status: 'Not processed' }];
  run(`CC.data = Object.assign({}, __cc, { commission_mail: ${JSON.stringify(cm)} })`);
  check(/Commission to check<\/span><b class="cc-num">2</.test(render('dash')), 'the Dashboard commission tile counts the same two the nav does');
  run('CC.data = __cc');
}

// Free text (a task, a next step, a deal note) reads as written: names, dollars and dates included.
{
  const sc = t => run(`CC.scrub(${JSON.stringify(t)})`).replace(/&#39;/g, "'");
  check(sc('Ford offer expired Nov 4 9 AM, KW Command still shows $7,198') === 'Ford offer expired Nov 4 9 AM, KW Command still shows $7,198', 'free text shows as written, names and dollars included');
}

// Round 3, items 2 and 15: the chip, the bell and its window show the worst source. A failed part of Market and a
// never-run Command reader count, and an information window has one OK button.
{
  const fr = JSON.parse(JSON.stringify(ccdata.fresh)); Object.keys(fr).forEach(k => { fr[k].state = 'ok'; });
  const mk = Object.assign({}, ccdata.market, { parts: { rate: { state: 'failed', note: 'The mortgage rate (Freddie Mac, via FRED) did not load: the site took too long to answer' }, gbrar: { state: 'ok' } } });
  run(`CC.data = Object.assign({}, __cc, { fresh: ${JSON.stringify(fr)}, market: ${JSON.stringify(mk)}, sync: {} }); S.data = Object.assign({}, __state, { command: {}, problems: [] });`);
  const att = run('CC.attention()');
  check(att[0] && att[0].level === 'red' && /mortgage rate/.test(att[0].text), 'a failed part of Market is red at the top of the attention list', JSON.stringify(att[0]));
  check(att.some(x => x.level === 'amber' && /KW Command reader: never run/.test(x.text)), 'a never-run Command reader is on the list');
  check(/s-failed[^]*part of it did not load/.test(render('sources')), 'Sources shows Market as failed when part of it failed, not Current');
  check(/const att = window\.CC && CC\.data && CC\.attention \? CC\.attention\(\)/.test(appjs) && /bc\.textContent = att\.length/.test(appjs), 'the header chip and the bell count the one attention list');
  run('var __pm = null; modal = (t, h, ok, lbl, o) => { __pm = { t, h, lbl, o }; return Promise.resolve(null); }; openProblems();');
  check(run('__pm.o && __pm.o.info === true') && run('__pm.h').includes('mortgage rate'), 'What needs attention lists the same items and has one OK button');
  run('openHelp();'); check(run('__pm.o && __pm.o.info === true'), 'the Keys window has one OK button');
  run('CC.data = __cc; S.data = __state;');
}

// Round 3, item 3: a deadline written as words counts as "without a date", not as zero.
{
  const und = [{ deal: '100 Fixture Ln', key: '100 fixture', step: 'Inspection', note: '7 day due diligence from Nov 3 acceptance' }];
  run(`CC.data = Object.assign({}, __cc, { deadlines: Object.assign({}, __cc.deadlines, { d3: [], undated: ${JSON.stringify(und)} }) })`);
  const dp = render('deadlines'), dd = render('dash');
  check(/Without a date<\/span><b class="cc-num">1</.test(dp) && /1 more written without a date/.test(dp) && /Written without a date <span class="cc-count">1/.test(dp), 'Deadlines counts and lists the steps written without a date');
  check(/1 written without a date/.test(dd), 'the Dashboard deadline tile says how many have no date');
  run('CC.data = __cc');
}

// Round 3, item 4: reply-first rows (no template) are not drafts ready.
{
  const ready = run('readyDrafts().length'), all = run('drafts().length'), rep = all - ready;
  const dsh = render('dash'), q = render('queue');
  check(rep > 0 && new RegExp(`Drafts ready</span><b class="cc-num">${ready}<`).test(dsh), 'the Dashboard counts written drafts only, not reply-first rows', `ready ${ready}, all ${all}`);
  check(q.includes(`Ready to send <span class="cc-count">${ready}<`) && q.includes(`Replies to write <span class="cc-count">${rep}<`) && /They are not counted as drafts ready/.test(q), 'Drafts splits ready drafts from replies to write');
  check(/const dr = S\.data \? readyDrafts\(\) : \[\]/.test(appjs) && /\$\{ready\} ready/.test(appjs), 'the nav and the compose button count ready drafts only');
}

// Round 3, item 5: offers past their deadline show as expired, and an offer never counts down to close.
{
  const dl = JSON.parse(JSON.stringify(ccdata.deals));
  dl.push({ deal: '700 Fixture Rd', status: 'Offer', stage: 'offer', side: 'Buyer', price: 1, commission: null, act: ccdata.today, to_close: null,
    offer: { date: '2026-11-06', time: '5 PM', expired: true }, differs: [], checklist: [], key: '700 fixture', next: '' });
  run(`CC.data = Object.assign({}, __cc, { deals: ${JSON.stringify(dl)} })`);
  const dp = render('deals'), cp = render('commission');
  const row = (dp.match(/<li class="cc-row[^"]*"><span class="cc-av" aria-hidden="true">⌂<\/span>\s*<div class="cc-row-main"><h3>700 Fixture Rd[^]*?<\/li>/) || [''])[0];
  check(/Offer expired [A-Z][a-z]{2}, Nov 6 5 PM/.test(row) && !/days to close|Closes today/.test(row) && /Act of sale if accepted/.test(row), 'an expired offer says so on Deals, with no days to close');
  check(/Offer expired/.test(cp) && /if accepted/.test(cp), 'Commission shows the expired offer and the act date as if accepted');
  run('CC.data = __cc');
}

// Add a lead: no password-style field, and a lead copied from a card arrives with its details filled in.
{
  run('var __lf = null; modal = (t, h, ok) => { __lf = { h, ok }; return Promise.resolve(null); };');
  run('CC.addLead()');
  check(!/<input[^>]*cc-masked/.test(run('__lf.h')), 'Add a lead has no password-style field');
  const lead = (ccdata.leads || []).find(l => l.name && l.phone);
  if (lead) {
    run(`CC.leadsTest = ${JSON.stringify(ccdata.leads.indexOf(lead))}; CC.addLead(CC.leadsTest)`);
    const h = run('__lf.h');
    check(h.includes('value="' + run(`esc(${JSON.stringify(lead.name)})`) + '"') && !/placeholder="Hidden/.test(h), 'a lead copied from a card arrives with its name filled in');
  }
  run('CC.addLead()');
  const saved = run(`__lf.ok({ querySelector: s => ({ value: ({ '#m-lname': '  Pat Typed ', '#m-lphone': ' 225-555-0100 ', '#m-lemail': 'pat@example.com', '#m-lsrc': 'Referral' })[s] || '', focus() {} }) })`);
  check(saved && saved.name === 'Pat Typed' && saved.phone === '225-555-0100' && saved.email === 'pat@example.com' && /^Referral /.test(saved.source), 'Save in the lead form sends the values typed in the boxes', JSON.stringify(saved));
  check(run(`__lf.ok({ querySelector: s => ({ value: '', focus() {} }) })`) === false, 'Save with no name typed sends nothing');
  check(!/<input[^>]*\$\{maskAttr\(\)\}/.test(appjs) && /type="button" class="send-btn" id="m-ok"/.test(appjs), 'no masked input in the compose drawer, and dialog buttons are not submit buttons');
}

// Round 3, item 7: Tasks explains how the Next_Action tasks are chosen.
check(/How the \d+ from Next_Action are chosen\.<\/b> A contact's Next_Action becomes a task when the contact is hot or warm, is not on Do Not Contact, is not a vendor, agent or lender, and has no open task with the same words\. Hot ones are due today, warm ones in 3 days/.test(render('tasks')) || !(f.tasks || []).some(t => !t.task_id), 'Tasks says how the Next_Action tasks are chosen, matching crm.next_action_tasks');

// Round 3, item 8: Touched is a quick form (type and an optional note), and the Dashboard button says what it opens.
{
  run('var __tf = null; modal = (t, h, ok, lbl) => { __tf = { t, h, ok, lbl }; return Promise.resolve(null); }; touchForm("this person");');
  const types = [...run('__tf.h').matchAll(/data-touch="([^"]+)"/g)].map(m => m[1]);
  check(run('__tf.t') === 'Log a touch' && types.join('|') === 'Call|Text|Email|In person|Voicemail' && /aria-pressed="true" aria-checked="true" data-touch="Call"/.test(run('__tf.h')) && /Note \(optional\)/.test(run('__tf.h')), 'Touched opens a quick form: five touch types, Call picked, an optional note');
  const fake = (type, note) => `({ querySelector: s => s.startsWith('[data-touch]') ? { dataset: { touch: ${JSON.stringify(type)} } } : { value: ${JSON.stringify(note)} } })`;
  check(run(`__tf.ok(${fake('Text', '')})`) === 'Text' && run(`__tf.ok(${fake('Voicemail', 'about the inspection')})`) === 'Voicemail: about the inspection', 'the form saves the type, with the note after it when there is one');
  const dsh = render('dash');
  check(/onclick="go\('touches'\)">Touches due<\/button>/.test(dsh) && !/>Log a touch</.test(dsh), 'the Dashboard button is named for the page it opens');
}

// Round 3, item 9: the header search behaves the same on every page: typing opens Search, leaving Search clears it.
check(run('CC.SEARCHES_ITSELF.length') === 0 && /if \(S\.q && S\.view !== 'search'\) \{ S\.before = S\.view; S\.view = 'search'; \}/.test(appjs)
  && /function go\(v\) \{ if \(S\.view === 'search' && v !== 'search' && S\.q\) \{ S\.q = ''/.test(appjs), 'typing in the header opens Search from every page, and leaving Search clears the box');
{
  const d0 = run('drafts()[0] || null');
  if (d0 && d0.name) { run(`S.q = ${JSON.stringify(d0.name.split(' ')[0])}`); check(/<h3 class="cc-sub-h">Drafts <span class="cc-count">/.test(run('CC.views.search()')), 'Search finds drafts too'); run(`S.q = ''`); }
}

// Round 3, item 11: the permits feed is labelled with its real source and the date of its newest pull, not CRM feed.
{
  const rows = [{ source: 'EBR permits, data.brla.gov 7fq7-8j7r', source_date: '2026-10-27' }, { source: 'EBR permits, data.brla.gov 7fq7-8j7r', source_date: '2026-10-20' }];
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { market: { rows: ${JSON.stringify(rows)}, counts: {} } }) })`);
  const pm = run(`CC.local('permits')`);
  check(pm.source === 'EBR permits, data.brla.gov' && pm.at.startsWith('2026-10-27'), 'the permits source is EBR permits on data.brla.gov, as of its newest pull', JSON.stringify(pm));
  const mon = render('monitor');
  check(/class="cc-srcline"><span class="cc-src is-\w+"><i aria-hidden="true"><\/i><span class="cc-src-n">EBR permits, data\.brla\.gov · /.test(mon) && !/CRM feed, AIRE CRM sheet/.test(mon), 'Listings and permits names EBR permits, not the CRM feed');
  run('S.data = __state');
}

// Round 3, item 12: map labels never overlap each other, a pin or a cluster; one with no free spot is left off.
{
  const labels = [{ name: 'Baton Rouge city limits (East Baton Rouge)', x: 200, y: 200, on: false }, { name: 'Zachary city limits', x: 210, y: 205, on: false },
    { name: 'Central city limits', x: 190, y: 195, on: true }, { name: 'Boxed in', x: 600, y: 600, on: false }];
  const obstacles = [{ x: 200, y: 200, r: 26 }, { x: 260, y: 180, r: 12 }];
  for (let dx = -200; dx <= 200; dx += 20) for (let dy = -100; dy <= 100; dy += 20) obstacles.push({ x: 600 + dx, y: 600 + dy, r: 12 });
  const placed = run(`PMap.placeLabels(${JSON.stringify(labels)}, ${JSON.stringify(obstacles)}, t => t.length * 7)`);
  const ov = (a, b) => a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
  const obs = obstacles.map(o => ({ x0: o.x - o.r, x1: o.x + o.r, y0: o.y - o.r, y1: o.y + o.r }));
  const bad = placed.some((a, i) => placed.some((b, j) => i !== j && ov(a, b)) || obs.some(o => ov(a, o)));
  check(!bad && placed.length >= 2 && !placed.some(p => p.name === 'Boxed in'), 'map labels never overlap each other or a pin, and a boxed-in label is left off', placed.map(p => p.name).join(' | '));
  check(/drawLabels\(farmLabels\.concat\(named\), drawPlaces\(\)\);\s*cancelAnimationFrame/.test(mapjs) && !/rgba\(8,22,46/.test(mapjs) && !/CLUSTER_PAST|cluster:/.test(mapjs), 'labels are drawn after the pins, and no pins are merged into numbered discs');
  check(/people\.filter\(o => nameOf\(o\.p\) && \(people\.length <= NAME_ROOM \|\| o\.p\.key === st\.data\.selected\)\)/.test(mapjs) && /name: nameOf\(o\.p\)/.test(mapjs)
    && /const nameOf = p => String\(\(p && p\.display\) \|\| ''\)\.trim\(\);/.test(mapjs), 'pin labels are the whole display name, drawn once the pins have room, never shortened');
  check(/tip\.textContent = nameOf\(p\) \|\| NO_NAME/.test(mapjs) && /class="pm-tip" hidden/.test(mapjs), 'hovering a pin shows the full name at any zoom');
  { const two = run(`PMap.placeLabels([{ name: 'Avery Example', x: 100, y: 100, on: -1 }, { name: 'Jordan Sample', x: 102, y: 101, on: -1 }], [{ x: 100, y: 87, r: 8 }], t => t.length * 6, { w: 400, h: 300 })`);
    const over = two.length === 2 && two[0].x1 > two[1].x0 && two[0].x0 < two[1].x1 && two[0].y1 > two[1].y0 && two[0].y0 < two[1].y1;
    check(two.length >= 1 && !over && two.every(s => /^\S+ \S+$/.test(s.name)), 'two names that would collide never overlap, and each keeps its last name', two.map(s => s.name).join(' | ')); }
}

// Round 3, items 13 and 14 and one source line: no scrollbar line under the phone nav, News names its source once at the
// top, and a list page shows its source line once.
{
  const uiPhone = (ui.match(/@media \(max-width: 720px\) \{[^]*?\n\}/) || [''])[0];
  check(/\.side \{ scrollbar-width: none; \} \.side::-webkit-scrollbar \{ display: none;/.test(uiPhone), 'phone: no scrollbar line under the nav strip');
  const nw = render('news'), srcCount = h => (h.match(/<span class="cc-src /g) || []).length;
  check(/<\/header>[^]*?<p class="cc-srcline"><span class="cc-src/.test(nw) && srcCount(nw) === 1 && /Obituaries and school sports are left out/.test(nw), 'News shows its source and time once, at the top, and says what it leaves out');
  for (const v of ['touches', 'tasks', 'queue', 'sent', 'monitor']) check(srcCount(render(v).replace(/<div class="cc-banner"[^]*?<\/div>/, '')) === (v === 'queue' ? 2 : 1), `${v}: one source line, not two`);
}

// Round 3, item 15: no orphan tiles. Tiles sit in 4 columns on a desktop, 2 on a phone, so each page has a multiple of 4.
{
  const counts = views.map(v => [v, (render(v).match(/<(?:button|div) [^>]*class="cc-tile"/g) || []).length]).filter(([, n]) => n);
  const odd = counts.filter(([, n]) => n % 4);
  check(!odd.length, 'every tile row is full: each page has a multiple of 4 tiles', odd.map(([v, n]) => `${v}:${n}`).join(' '));
  check(/\.cc-tiles \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/.test(fs.readFileSync(path.join(dir, 'cc.css'), 'utf8')), 'desktop tiles sit in exactly 4 columns');
}

// Round 3, items 15 and 16: "1 timed event", the Workouts nav label matches its page, and lead cards are flat like
// every other card. The old Money and contacts hidden note is gone from every page (Caleb, 2026-11-10).
{
  const heads = views.map(v => render(v)).map(h => (h.match(/<header class="cc-head">[^]*?<\/header>/) || [''])[0]).filter(Boolean);
  check(heads.length > 10 && heads.every(h => !/cc-privnote|Money and contacts hidden/.test(h)), 'no page carries the old Money and contacts hidden note');
  const wk = (ccdata.week || [])[0] || {};
  run(`CC.data = Object.assign({}, __cc, { week: [Object.assign({}, ${JSON.stringify(wk)}, { events: 1, hours: 1 })].concat(__cc.week.slice(1)) })`);
  check(/1 timed event\./.test(render('dash')), 'Booked today says "1 timed event"');
  run('CC.data = __cc');
  const navLabel = run('NAV').flatMap(g => g[1]).find(i => i[0] === 'health')[2], h1 = (render('health').match(/<h1>([^<]+)<\/h1>/) || [])[1];
  check(navLabel === h1, 'the Workouts nav label matches its page title', `${navLabel} / ${h1}`);
  const css2 = ['ui.css', 'cc.css'].map(x => fs.readFileSync(path.join(dir, x), 'utf8')).join('\n');
  check(!/gradient\(/.test(css2), 'no gradient in the page styles, lead cards included');
}

// Round 3: the cache name moves on again so browsers drop the round 2 shell.
check(/pipeline-shell-v4-sendlog/.test(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8')), 'service worker cache is v4-sendlog');
// Service worker: a new cache name, HTML and JS from the network every time, and the page reloads once when a new worker takes over.
const swjs = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
check(!swjs.includes('pipeline-shell-v1-judge1') && /fetch\(e\.request, \{ cache: 'no-store' \}\)/.test(swjs), 'service worker drops the round-1 shell and skips the browser cache');
check(/updateViaCache: 'none'/.test(indexHtml) && /controllerchange/.test(indexHtml), 'the page picks up a new worker and reloads once');
check(!/id="privacy"/.test(indexHtml) && !/togglePriv|e\.key === 'h'/.test(appjs) && !/Press <kbd>H<\/kbd>/.test(appjs), 'the top bar has no Show or Hide button, and H is not a shortcut');
const shell = (swjs.match(/const FILES = \[([^\]]+)\]/) || [])[1] || '';
const scripts = [...indexHtml.matchAll(/<script src="([^"]+)"/g)].map(m => '/' + m[1]);
check(scripts.every(s => shell.includes(`'${s}'`)), 'every script the page loads is in the offline shell', scripts.filter(s => !shell.includes(`'${s}'`)).join(' '));
check(/const BUILD = '__BUILD__'/.test(swjs) && /'pipeline-shell-[^']*' \+ BUILD/.test(swjs), 'the cache name carries the build the Mac fills in');
check(/setInterval\(check, 5 \* 60 \* 1000\)/.test(indexHtml) && /visibilitychange/.test(indexHtml), 'an open page asks for a new build every 5 minutes and on return');
check(/Pipeline updated\. <button type="button">Reload<\/button>/.test(indexHtml), 'a new build shows a small Updated note with Reload');
check(/if \(u\.pathname\.startsWith\('\/api\/'\)\) return;/.test(swjs) && !/caches\.match\(e\.request\)\s*\|\|\s*fetch/.test(swjs), 'API reads go to the Mac first, never cache first');
// Round 4 item 13 reversed round 3's tile: the number stays big, "4 without a date" goes on the line beneath.
check(run('CC.dated(0, 4)') === '0' && run('CC.undatedLine(4)').includes('4 written without a date') && run('CC.undatedLine(0)') === '', 'a deadline tile keeps its number and says how many have no date beneath');

{ // Round 4 item 1: words holding a date Pipeline cannot read never say "No contract deadlines".
  const chk = [{ deal: '100 Fixture Ln', key: '100 fixture', step: 'Inspection', note: 'Signed Nov 3, sent Nov 4' }];
  run(`CC.data = Object.assign({}, __cc, { deadlines: Object.assign({}, __cc.deadlines, { d7: [], d3: [], all: [], check: ${JSON.stringify(chk)} }) })`);
  const dd = render('dash');
  check(!/No contract deadlines in this window/.test(dd) && /Contains a date, check it/.test(dd), 'a step whose words hold an unread date is shown as check it, never no deadlines');
  run(`CC.data = Object.assign({}, __cc, { deadlines: Object.assign({}, __cc.deadlines, { d7: [{ deal: '100 Fixture Ln', key: '100 fixture', day: __cc.today, what: 'Inspection', from: 'sheet', time: '11:59PM', said: 'Due diligence ends Nov 10, 11:59 PM' }], check: [] }) })`);
  check(/11:59PM/.test(render('dash')) && /Read from the words/.test(render('dash')), 'a date read from the words shows its time and where it came from');
  run('CC.data = __cc;');
}

{ // Round 4 item 2: a saved day that no longer matches the Deals sheet is flagged, never shown as growth.
  run(`CC.data = Object.assign({}, __cc, { deltas: { gci: {}, closings: {}, leads7: {}, appts7: {} }, since: {}, history_mismatch: [{ day: '2026-11-05', metrics: ['gci', 'closings'], saved: { gci: 19710, closings: 2 }, sheet_now: { gci: 30377.5, closings: 4 } }] })`);
  const sc = render('scorecard');
  check(/1 saved day no longer matches the Deals sheet/.test(sc) && !/\+2/.test(sc) && /\$30,377\.50/.test(sc), 'a saved day that no longer matches the sheet is flagged, not counted as growth');
  run('CC.data = __cc;');
}

// Round 4 item 3: a page left open past an offer's deadline counts it as past, by this device's clock.
check(run(`CC.offerExpired({ expired: false, at: '2000-01-01T12:00:00-06:00' })`) === true && run(`CC.offerExpired({ expired: false, at: '2999-01-01T12:00:00-06:00' })`) === false, 'an offer is past its deadline by the clock now, not the last read');

// Round 4 items 7 to 10.
check(run('statusWords(2, 1)') === '3 sources: 2 failed or out of date, 1 late or never read' && run('statusWords(1, 0)') === '1 source failed or out of date' && run('statusWords(0, 0)') === '', 'the chip counts the same list as the bell');
check(!/CC\.failing\(\)\.length \+/.test(appjs), 'the Sources nav count is the attention list, not its own sum');
check(run('CC.ago(18720)') === '13 days ago' && run('CC.ago(60)') === '1 hour ago' && run('CC.ago(300)') === '5 hours ago' && run('CC.ago(18)') === '18 min ago', 'ages read in minutes, then hours, then days');
check(run('CC.booked(0.2, 15)').startsWith('15<small> min') && run('CC.booked(1.5, 90)').startsWith('1.5<small> h'), 'booked time under an hour shows minutes');
{ const pages = ['touches', 'tasks', 'dash'].map(k => render(k).replace(/<[^>]*>/g, ' ')).join(' ');  // what shows on screen
  check(!/Note hidden|Task hidden/.test(pages) && run(`CC.note('Ask about the timeline')`) === 'Ask about the timeline', 'next-step notes read as written on Touches due, Tasks and the Dashboard'); }

{ const wp = render('health');
  check(/of 5<\/small>/.test(wp) && /Goal 5 a week/.test(wp) && /Mon 6 AM, Tue 6 AM, Wed 4 PM, Thu 6 AM, Fri 6 AM, 5 a week/.test(wp) && !/4 to 5/.test(wp), 'Workouts counts his 5-day plan and the goal agrees'); }

// Round 4 layout items. The live check at 390 and 1200 px is done in Chrome; these keep the rules from slipping.
check(/\.cc-ev:has\(> \.cc-chip:first-child\) \{ grid-template-columns: minmax\(0, 1fr\)/.test(ui), 'a row that leads with a badge puts it on its own line, never over the words');
check(/@media \(max-width: 1300px\) \{ \.top \.clock \.date, \.top \.operator \{ display: none; \} \}/.test(ui) && /\.top \.clock \.date, \.top \.clock \.time \{ white-space: nowrap; \}/.test(ui), 'the header clock is one line and the date steps aside below 1300 px');
check(/\.cc-days\.week \{ grid-template-columns: repeat\(auto-fit, minmax\(9\.5rem, 1fr\)\); \}/.test(ui) && /\.cc-list\.tight \.cc-chip \{ white-space: normal/.test(ui), 'calendar week columns grow and wrap instead of cutting titles and badges');
check(/\.side \.nav \{ overflow-x: auto/.test(ui) && /\.side \.brand \{ position: static/.test(ui) && /\.top \{ flex-wrap: nowrap/.test(ui), 'phone: the nav scrolls beside the logo and the header is one row');
{ const dpg = render('deals');
  check((dpg.match(/class="cc-srcline"/g) || []).length >= 1 && /<p class="cc-srcline">[^]*<footer>/.test(dpg), 'Deals shows its source line at the top as well as the bottom');
  const rows = dpg.split('<li class="cc-row').slice(1).filter(r => /class="cc-pills" id="deal-/.test(r));
  check(rows.length > 0 && rows.every(r => /Edit in the CRM/.test(r) && /Message/.test(r)) && (!/disabled/.test(dpg) || /cc-off" disabled aria-disabled="true" title="[^"]+">[^<]+<small>[^<]+<\/small>/.test(dpg)), 'every Deals row shows the same buttons, and a greyed one says why');
  check(/CC\.showDeal\(/.test(fs.readFileSync(path.join(dir, 'crm-pages.js'), 'utf8')) && /id="deal-/.test(dpg), "search's Open Deals goes to that deal, not the top"); }
{ const lab = [{ name: 'Edge Farm Name Here', x: 2, y: 40, on: false }];
  const pl = run(`PMap.placeLabels(${JSON.stringify(lab)}, [], t => t.length * 7, { w: 400, h: 300 })`);
  check(pl.length === 1 && pl[0].x0 >= 4 && pl[0].x1 <= 396, 'a map label near the left edge slides inside the map, never cut off'); }
check(run('CC.bookedText(0.2, 15)') === '15 min', 'calendar day headers show minutes under an hour too');

// One-tap Text and Email. Only Caleb's own number and address.
check(run(`normPhone('225-747-0303')`) === '+12257470303' && run(`normPhone('1 (225) 747-0303')`) === '+12257470303' && run(`normPhone('747-0303')`) === null, 'numbers normalize to +1 and 10 digits');
check(run(`smsLink('+12257470303', 'Hi there & thanks?')`) === 'sms:+12257470303&body=Hi%20there%20%26%20thanks%3F', 'Text opens an sms: link with the body url-encoded');
check(run(`gmailLink('aire@calebjackson.org', 'Quick question', 'Line one\\nLine two')`) === 'https://mail.google.com/mail/?authuser=aire%40calebjackson.org&view=cm&fs=1&to=aire%40calebjackson.org&su=Quick%20question&body=Line%20one%0ALine%20two', 'Email opens a Gmail compose for aire@ with To, Subject and Body filled in');
{ const b = run(`contactBtns('', { display: 'Caleb Jackson', phone: '225-747-0303', email: 'aire@calebjackson.org' })`);
  check(/class="text-btn" onclick="openContact\('text', 'c\d+'\)"/.test(b) && /openContact\('email', 'c\d+'\)/.test(b) && !/747/.test(b) && !/aire@/.test(b), 'Text and Email buttons, with no number or address in the page');
  const g = run(`contactBtns('', { display: 'X', phone: '747-03', email: '' })`);
  check(/cc-off" disabled[^>]*>Text<small>Not a valid US number<\/small>/.test(g) && /Email<small>No email on file<\/small>/.test(g), 'a contact with no valid number or email gets greyed buttons that say why'); }
{ const pages = ['touches', 'tasks', 'queue', 'dash'].map(k => render(k)).join(' ');
  check((pages.match(/>Text</g) || []).length > 3 && (pages.match(/>Email</g) || []).length > 3, 'Text and Email show on touches, tasks, drafts and the Dashboard'); }
{ run(`S.data = Object.assign({}, S.data, { local: true, sender: 'dry', demo: false }); S.compose = { kind: 'text', person_id: '118', name: 'Caleb Jackson', row: {}, to: '+12257470303' }`);
  check(/disabled aria-disabled="true" title="Sending is off \(dry mode\)">Send now<small>Sending is off \(dry mode\)/.test(run('sendNowBtn(true)')), 'Send now is greyed in dry mode and says so');
  run(`S.data = Object.assign({}, S.data, { local: false })`);
  check(/Send now works on the Mac only/.test(run('sendNowBtn(false)')), 'Send now is the Mac only, never from the phone');
  run(`S.data = Object.assign({}, S.data, { local: true })`);
  check(/onclick="confirmSendNow\(\)"/.test(run('sendNowBtn(false)')), 'live on the Mac, Send now goes to the confirm step first');
  run(`S.data = __state; S.compose = null;`); }
{ const tds = (state.feed.touches_due || []).filter(r => r.phone);
  if (tds.length) { const ph = tds[0].phone;
    run(`S.data = JSON.parse(JSON.stringify(__state)); S.data.feed.touches_due.push({ person_id: 'dup1', display: 'Dup Fixture', phone: ${JSON.stringify(ph)} })`);
    check(run(`sharers('text', ${JSON.stringify(ph)})`).length >= 2, 'two contacts with one number are flagged');
    run('S.data = __state;'); } }
check(/confirmSendNow[^]*?modal\(`Send this \$\{v\.kind\} now\?`[^]*?esc\(v\.to\)[^]*?send-preview">\$\{esc\(v\.body\)\}/.test(appjs), 'the confirm step names the recipient and shows the full text');

// The color code and deal photos.
check(/body\[data-sec="people"\] \{ --sec: var\(--c-purple\); \}/.test(ui) && /\.st-closed \{ --st: var\(--c-green\); \}/.test(ui) && /\.st-offer \{ --st: var\(--c-amber\); \}/.test(ui), 'sections and stages each have their own color');
check(/class="nav-g g-\$\{g\.toLowerCase\(\)\}"/.test(appjs) && /document\.body\.dataset\.sec = sec/.test(appjs), 'each nav group carries its section class and the page takes its color');
{ run(`CC.photos = { '100 fixture': 3 }`);
  check(run(`CC.thumb('100 Fixture Ln')`) === '<img class="cc-thumb" src="/photo/100-fixture/0" alt="" loading="lazy">' && run(`CC.thumb('9 Nowhere Rd')`) === '<span class="cc-av" aria-hidden="true">⌂</span>', 'a deal with a photo shows it, one without keeps the house mark');
  check(/class="cc-photo ph st-offer"/.test(run(`CC.cover('9 Nowhere Rd', 'offer')`)), 'a card with no photo gets its stage color');
  const dp = render('deals');
  check(/<li class="cc-row st-(contract|offer|closed|appointment|out|other)/.test(dp) && /cc-pill st-/.test(dp), 'every Deals row and status pill carries its stage color');
  run('CC.photos = {}'); }
check(run(`(() => { const r = { what: 'Act of sale' }; return 1; })()`) === 1 && /return \/act of sale\|closing\/i\.test\(t\) \? 'sale'/.test(fs.readFileSync(path.join(dir, 'cc.js'), 'utf8')), 'act of sale reads green, deadlines stay coral');

// Round 5: a later counter replaces an offer's deadline, a wrong weekday is flagged, overdue dates and unaccepted invites show.
{
  check(/Countered since, no deadline on the sheet/.test(run(`CC.offerPill({ stage: 'offer', offer: { superseded: true, expired: false } })`)) && !run(`CC.offerExpired({ superseded: true, expired: false, at: null })`), 'an offer countered since its deadline is not past its deadline');
  check(/Sheet says Sun, but [A-Z][a-z]{2}, Nov 9 is the date/.test(run(`CC.offerPill({ stage: 'offer', offer: { date: '2026-11-09', time: '12 PM', expired: true, wrong_weekday: 'Sun' } })`)), 'a weekday that does not match the date is flagged on the offer');
  const d5 = JSON.parse(JSON.stringify(ccdata));
  d5.deadlines.overdue = [{ deal: '100 Fixture Ln', key: '100 fixture', day: '2026-11-07', what: 'Inspection', said: 'reply due Nov 7', from: 'sheet' }];
  d5.scorecard.appts7.invites = 1; d5.scorecard.gci.blank = 5;
  run(`CC.data = ${JSON.stringify(d5)}`);
  const dl = render('deadlines'), ds = render('dash'), sc = render('scorecard');
  check(/Overdue <span class="cc-count">1</.test(dl) && /<span class="cc-chip">Overdue<\/span>/.test(dl) && /1 overdue/.test(ds), 'a contract date that has gone by is an Overdue row on Deadlines and on the Dashboard tile');
  check(/1 invite not accepted, not counted/.test(ds) && /1 more invite not accepted, not counted/.test(sc), 'an invite not accepted is named, never counted as an appointment');
  check(/5 closed with no commission/.test(ds) && /5 closed with no commission on the sheet/.test(sc), 'every GCI tile says when closed deals have no commission');
  run('CC.data = __cc');
  check(/Your note: \$\{C2 \? C2\.note\(/.test(appjs), 'the compose drawer shows your note');
  check(/filter\(s => s\.status === 'sent'\)\.length, false\]/.test(appjs) && /dry run\$\{/.test(fs.readFileSync(path.join(dir, 'crm-pages.js'), 'utf8')), 'a dry run is never counted as sent');
  check(/res\.parts \? Object\.keys\(res\.parts\)/.test(fs.readFileSync(path.join(dir, 'cc-sources.js'), 'utf8')), 'Sources counts the rows in each tab, not the tabs');
}

// A permit's type is public record and reads as written.
check(/esc\(r\.subtype\)/.test(fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')), 'a permit type is shown as the public record has it');

// Hand-off log: a Text or Email click shows as opened, a confirmed send says who confirmed it, and the app asks.
{ const keep = run('JSON.stringify([S.data.sent_today, S.data.handoff || null, S.data.sent_log || null])');
  const at = new Date().toISOString();
  ctx.__rows = [{ id: 'a1', at, kind: 'text', person_id: '247', display: 'Taylor Sample', to: '+12255550142', text: 'Hey Taylor', status: 'opened', delivery: 'opened', via: 'handoff' },
    { id: 'a2', at, kind: 'email', person_id: '312', display: 'Morgan Demo', to: 'morgan.demo@example.com', subject: 'Checking in', text: 'Hi Morgan', status: 'sent', delivery: 'sent', via: 'handoff', confirmed_by: 'Gmail', sent_at: at, service: 'Gmail' }];
  run(`S.data.sent_today = __rows; S.data.handoff = { messages_ok: false, gmail_ok: null, pending: [{ id: 'a1', at: __rows[0].at, kind: 'text', display: 'Taylor Sample' }] }; S.data.sent_log = { '247': [__rows[0]], '312': [__rows[1]] }`);
  const sp = render('sent');
  check(/Opened, waiting for your send/.test(sp) && /answerSent\('a1', true\)/.test(sp) && /answerSent\('a1', false\)/.test(sp), 'Sent today shows an opened text with Sent and Not sent');
  check(/confirmed by Gmail/.test(sp) && (sp.match(/answerSent/g) || []).length === 2, 'a confirmed email says Gmail confirmed it and asks nothing');
  const bar = run(`askSentHTML(S.data.handoff.pending[0])`);
  check(/Did the text to <b>Taylor Sample<\/b> send\?/.test(bar) && />Sent<\/button>/.test(bar) && />Not sent<\/button>/.test(bar), 'the Did that send bar names the person and offers Sent and Not sent');
  check(/Taylor/.test(run(`askSentHTML(S.data.handoff.pending[0])`)) && /Hey Taylor|Hi Morgan|morgan\.demo/.test(render('sent')), 'the bar and Sent today show the name and the message');
  check(/can't read Messages history/.test(render('sources')), 'Sources says in one line when Messages history cannot be read');
  check(/SENT FROM PIPELINE/.test(run(`logLines('247')`)) && /opened, waiting for your send/.test(run(`logLines('247')`)) && /confirmed by Gmail/.test(run(`logLines('312')`)) && run(`logLines('999')`) === '', "the compose sheet lists that person's sends");
  check(run(`TEXT_STATES.opened[1]`) === 'Opened' && /api\('\/api\/opened', \{ kind: v\.kind/.test(appjs) && /logOpened\(v\);/.test(appjs) && /draft: c\.body \|\| '', pool: c\.pool \|\| ''/.test(appjs), 'Open in Messages and Open in Gmail log the click, with the draft Pipeline wrote');
  check(/#sent-ask \{[^}]*background: var\(--cc-ink\)[^}]*border: 1px solid var\(--cc-coral\)/.test(ui) && /#sent-ask small \{ color: var\(--cc-tan\)/.test(ui), 'the bar is black with coral, tan only on the small time');
  ctx.__keep = JSON.parse(keep); run('S.data.sent_today = __keep[0]; S.data.handoff = __keep[1]; S.data.sent_log = __keep[2]'); }

// Round 5, look and flow: the Today list follows the four headline tiles, Touches due pages, A adds a lead, and a tall dialog scrolls.
{ const ds = render('dash');
  check(ds.indexOf('GCI this year') < ds.indexOf('cc-todaycard') || ds.indexOf('GCI this year') < ds.indexOf('Under contract</span>') && ds.split('class="cc-tiles"').length === 3, 'the Dashboard shows four headline tiles, then Today, then the rest');
  check(/e\.key === 'a' && window\.CC && CC\.addLead/.test(appjs) && /<kbd>A<\/kbd> to add a lead/.test(appjs), 'the A key adds a lead and the shortcuts list says so');
  check(/Show 200 more/.test(fs.readFileSync(path.join(dir, 'crm-pages.js'), 'utf8')), 'Touches due can load more than the first 200');
  check(/\.modal \.dbody \{ overflow-y: auto; min-height: 0; \}/.test(ui) && /\.k-inspection, \.k-finance, \.cc-ev\.k-inspection, \.cc-ev\.k-finance \{ --k: #e87757/.test(ui) && /\.st-appointment \{ --st: var\(--cc-tan\); \}/.test(ui), 'a tall dialog scrolls, deadlines are one color, an active listing is tan');
  check(/, pulled ' \+ C\.day\(m\.gbrar\.pulled\)/.test(fs.readFileSync(path.join(dir, 'cc-life.js'), 'utf8')), 'the GBRAR tiles say when the numbers were pulled'); }

check(/strip = \$\('#nav'\)/.test(appjs) && /strip\.scrollLeft \+=/.test(appjs), 'the phone nav strip scrolls to the page you are on');
check(/@media \(max-width: 720px\) \{ \.cc-tiles \{ grid-template-columns: 1fr 1fr;/.test(ui) && /\.cc-kpi > footer \{ margin-top: auto; \}/.test(ui), 'phone tiles sit two to a row and Scorecard cards line up');

// The light look (approved 2026-11-10): Home, Map and People on an ivory canvas, one bold color per CRM stage.
{
  const stagejs = fs.readFileSync(path.join(dir, 'stage.js'), 'utf8'), light = fs.readFileSync(path.join(dir, 'light.css'), 'utf8'), mv = fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8');
  const crm = fs.readFileSync(path.join(dir, '..', '..', 'crm', 'crm.py'), 'utf8'), SEVEN = JSON.parse((crm.match(/^STAGES = (\[[^\]]+\])/m) || [])[1] || '[]');
  const WANT = { 'new lead': '#F5C518', contacted: '#3A8FDD', nurture: '#2DB87A', 'showing scheduled': '#8B5CF6', 'under contract': '#E04E28', closed: '#14100E', 'past client': '#D4537E' };
  const tabs = run('Stage.TABS');
  check(SEVEN.length === 7 && JSON.stringify(tabs.map(t => t[0])) === JSON.stringify(SEVEN), 'the stage tabs are the CRM writer\'s seven stages, same names, same order', tabs.map(t => t[0]).join(', '));
  check(tabs.every(t => WANT[t[0]] === t[1]), 'each stage has its approved color');
  check(tabs.every(t => new RegExp(`\\.stg-${t[0].replace(/ /g, '-')} \\{ --stg: ${t[1]}; --stg-ink: ${t[2]}; \\}`).test(light)), 'the stylesheet carries the same stage hexes and type colors as the script');
  check(/stage\(\)\.hex\(k\)/.test(mapjs) && !/\bBAND\b/.test(mapjs) && /k === 'closed'/.test(mapjs) && /k === 'new lead' \? INK/.test(mapjs), 'map pins take the stage color: closed is an ink square, a new lead gets an ink ring, temperature colors nothing');
  check(/SLATE = '#8A9AA0'/.test(mapjs) && /ribbon\(RIVER/.test(mapjs) && /ribbon\(FALSE_RIVER/.test(mapjs) && ['Baton Rouge', 'Zachary', 'St. Francisville', 'New Roads', 'The Felicianas'].every(n => mapjs.includes(`name: '${n}'`)), 'the basemap draws the river and False River in neutral slate and sets the five place names');
  check(/toScreen\(p\.lat, p\.lng\)/.test(mapjs), 'every pin is placed from its own coordinates');
  check(/\.cad-hot \{ font-weight: 700; \}/.test(light) && !/\.cad-(hot|warm|lukewarm|cold|ice-cold)[^{]*\{[^}]*color/.test(light) && !/class="tag \$\{(p\.band|b)\}/.test(mv)
    && /\.tag\.hot, \.tag\.warm, \.tag\.lukewarm, \.tag\.cold, \.tag\.ice-cold[^{]*\{ color: var\(--graphite\) !important; background: none !important;/.test(light), 'cadence is a word, never a color, on the new screens and on the person sheet');
  // People: exactly seven columns, real people only, search filters, a row opens the person.
  run('Stage.q = ""');
  const ppl = render('people'), cols = [...ppl.matchAll(/<section class="ppl-col" aria-label="([^"]+)">/g)].map(m => m[1]);
  check(JSON.stringify(cols) === JSON.stringify(SEVEN), 'People has exactly the seven stage columns', cols.join(', '));
  const known = new Set(run('Stage.people().map(r => r.display)')), shown = [...ppl.matchAll(/<li><button type="button" onclick="Stage\.open\([^)]*\)"><b>([^<]*)<\/b>/g)].map(m => m[1]);
  check(shown.length > 0 && shown.every(n => known.has(n.replace(/&#39;/g, "'").replace(/&amp;/g, '&'))), 'every name on the board is a person in the feed', shown.filter(n => !known.has(n)).slice(0, 3).join(', '));
  check(run(`Stage.groups(Stage.people())['new lead'].length`) === (f.new_leads || []).length || (f.new_leads || []).length === 0, 'new leads sit under new lead, and nobody is given a stage the CRM does not have');
  check(!/Sam Newlead|Taylor Sample|Morgan Demo|Riley Quiet|Casey Night/.test(stagejs + mv + mapjs), 'no fixture name is written into the live screens');
  const one = shown[0]; run(`Stage.q = ${JSON.stringify(one)}`);
  const filtered = [...run('CC.views.people()').matchAll(/onclick="Stage\.open/g)].length; run('Stage.q = ""');
  check(filtered >= 1 && filtered < shown.length && /oninput="Stage\.find\(this\.value\)"/.test(ppl) && /placeholder="Find someone"/.test(ppl), 'Find someone filters the board');
  check(/ST\.open = id => openPerson\(id\)/.test(stagejs) && /function openPerson\(id\) \{[^}]*Person\.open\(id\); \}/.test(appjs), 'a row opens that person\'s contact card, never straight into the message box');
  // Home: the Claude and Grok lists lead into what already exists. No second way to call or send.
  const hm = render('home');
  check(/>Claude<\/span>/.test(hm) && /onclick="openBrief\(\)"/.test(hm) && /go\('scorecard'\)/.test(hm) && /go\('queue'\)/.test(hm), 'Home\'s Claude list opens the brief, the Scorecard and the drafts');
  check(/go\('people'\)/.test(hm) && /go\('map'\)/.test(hm) && /id="mini-map"/.test(hm) && ['dash', 'touches', 'tasks', 'sent', 'grok', 'hot', 'warm', 'deals', 'deadlines', 'calendar', 'commission', 'bank', 'ccleads', 'sources'].every(k => hm.includes(`go('${k}')`)), 'Home links to People, the Map, Grok calls, Hot, Warm and every older page');
  check(/onclick="go\('grok'\)">Review calls</.test(hm), 'Review calls opens the Grok calls page');
  { const all = run('NAV').slice(1).flatMap(g => g[1]).flatMap(i => [i[0]].concat((i[3] || []).map(k => k[0]))); check(['grok', 'hot', 'warm'].every(k => all.includes(k) && views.includes(k)), 'Grok calls, Hot and Warm are pages under More'); }
  run(`var __jobs = S.data.bridge.jobs; S.data.bridge.jobs = { [S.data.feed.touches_due[0].person_id]: { job_id: 'j1', job_type: 'call', at: new Date().toISOString(), state: 'waiting', ask: 'Check on the counter' } }`);
  const hg = render('home'); run('S.data.bridge.jobs = __jobs');
  check(/<b>Call [^<]+<\/b>/.test(hg) && new RegExp(`openGrok\\(&quot;${f.touches_due[0].person_id}&quot;, 'call'\\)`).test(hg) && /Grok is holding the calls\./.test(hg), 'a call waiting with Grok shows on Home and opens that person\'s Grok panel on the Call tab');
  { const now = Date.now(), iso = ms => new Date(ms).toISOString(), w = (j) => run(`Stage.isWaiting(${JSON.stringify(j)}, ${now})`);
    check(!w({ job_type: 'call', state: 'dry-run', at: iso(now) }) && !w({ job_type: 'hard_draft', state: 'dry-run', at: iso(now) }), 'a dry-run job never shows as waiting with Grok: nothing left the Mac');
    check(w({ job_type: 'call', state: 'waiting', at: iso(now - 5 * 60e3) }) && !w({ job_type: 'call', state: 'waiting', at: iso(now - 50 * 60e3) }) && !w({ job_type: 'hard_draft', state: 'draft_ready', at: '2020-01-01T10:00:00-06:00' }), 'a call waits 45 minutes and a hard draft only today, then leaves Home');
    run(`var __j2 = S.data.bridge.jobs; S.data.bridge.jobs = { [S.data.feed.touches_due[0].person_id]: { job_id: 'j2', job_type: 'hard_draft', at: todayISO() + 'T08:00:00', state: 'draft_ready' } }`);
    const hd = render('home'); run('S.data.bridge.jobs = __j2');
    check(/Grok has a hard draft for you\./.test(hd) && !/holding the calls/.test(hd), 'with only a hard draft waiting, Home does not say calls'); }
  check(!run('Stage.people().some(r => PARTNER.has(r.type))'), 'partners are left off the People board, as on the map');
  check(!/\/api\/(send|call|draft)/.test(stagejs) && !/fetch\(|api\(/.test(stagejs), 'Home and People call no send, call or draft endpoint themselves');
  check(/Nothing is waiting with Grok\./.test(hm) || /Grok is holding the calls\./.test(hm), 'the one-line duet says what is true right now');
  // The person card on the map.
  const pp = (f.map.pins || []).find(p => p.kind === 'person' && p.stage === 'past client');
  check(!!pp, 'the demo has a past client on the map to check the card with');
  if (pp) { const pc = run(`pinCard(${JSON.stringify(pp)})`);
    check(/class="stg-chip stg-past-client">Past client</.test(pc) && /class="pc-cad"/.test(pc) && /<dt>Type<\/dt>/.test(pc) && /<dt>Last touch<\/dt>/.test(pc) && /<dt>Next<\/dt>/.test(pc) && /<dt>Address<\/dt>/.test(pc)
      && /class="pc-compose" onclick="openPerson\(/.test(pc) && /onclick="openNote\(/.test(pc), 'the map card shows the stage chip, the cadence word, the facts, a button to their card and plan, and Note'); }
  const lg = run('mapLegend()');
  check(SEVEN.every(s2 => lg.includes(`</i>${s2}</li>`)) && /Pins by stage/.test(lg), 'the map legend lists the seven stages');
  const mapPage = run('viewMap()');
  check(!/drawFarm\(/.test(mapPage) && !/map3d\(/.test(mapPage) && !/2D map/.test(mapPage) && !/id="pmap"/.test(mapPage) && /id="map-home-ground"/.test(mapPage), 'the Map tab has no 2D map UI: Home Ground is the only view');
  check(!/function map3d\(/.test(mv) && !/S\.map3d/.test(mv) && /map3dSync\(\)/.test(mv), 'the Map tab has no 2D toggle; Home Ground always fills #main');
  const m3 = fs.readFileSync(path.join(dir, 'map3d.html'), 'utf8');
  check(/location\.replace\('\/#map'\)/.test(m3), 'opening /map3d.html on its own takes you to the Map tab in the Pipeline shell');
  check(!/id="b2d"/.test(m3) && !/HOST\.map3d\(false\)/.test(m3) && !/>2D map</.test(m3), 'Home Ground has no button back to the 2D map');
  check(/const fail =/.test(m3) && /could not start 3D graphics, so the map cannot draw here/.test(m3), 'if WebGL cannot start, Home Ground shows a short message instead of a 2D map');
  check(/src=['"]three-0.160.0.min.js['"]/.test(m3) && /fetch\('\/api\/state'/.test(m3) && !/\/api\/(send|call|draft)/.test(m3), 'the 3D map reads /api/state and starts no send, call or draft path');
  // Home Ground Map: local three.js, people only from /api/state on any host, no baked book of business, contact card through openPerson.
  check(fs.existsSync(path.join(dir, 'three-0.160.0.min.js')) && !/<script[^>]+src=["']https?:/.test(m3), 'the Home Ground Map loads three.js from the local file, no script CDN');
  check(!/location\.hostname/.test(m3) && !/GEO\.(pts|meta|farms|cityNames|pipeRiver)/.test(m3) && !/"(pts|meta|farms|cityNames|pipeRiver)":/.test(m3), 'the Home Ground Map reads people from /api/state on every host and bakes in no CRM snapshot');
  check(/HOST\.openPerson\(p\.id\)/.test(m3) && /typeof window\.parent\.openPerson === 'function'/.test(m3) && /const fail =/.test(m3) && /new THREE\.WebGLRenderer/.test(m3), 'the Home Ground Map opens the contact card with openPerson and says so when WebGL cannot start');
  check(/Home <i>ground<\/i>/.test(m3) && /<title>Home Ground Map<\/title>/.test(m3), 'the 3D view carries the Home ground name');
  {
    const pure = (/<script id="m3pure">([\s\S]*?)<\/script>/.exec(m3) || [])[1] || '';
    const sb = { window: {} }; vm.createContext(sb); vm.runInContext(pure, sb);
    const M3 = sb.window.M3, capf = s => s.replace(/\b[a-z]/g, c => c.toUpperCase());
    const fixture = (((state.feed.map || {}).pins || []).find(p => p.display && /\s/.test(p.display)) || { display: 'Fixture Person' }).display;
    const person = { name: fixture, rel: 'client', city: 'baton rouge', next: 'Call about the listing' }, w = M3.where(person, capf);
    const pubText = [M3.title(person, 'public', w), M3.tip(person, 'public', 'Client', w), M3.note(person, 'public')].join('|');
    check(!pubText.includes(fixture) && !pubText.includes('Call about'), 'in Public mode no title, tooltip or note carries a person\'s name');
    check(M3.title(person, 'crm', w) === fixture && M3.tip(person, 'crm', 'Client', w).includes(fixture), 'in CRM mode the name shows on the card and tooltip');
    check(/state\.view === 'public' \? 'Pipeline feed, ' \+ asOf \+ '\. Names and details are left off.'/.test(m3), 'in Public mode the source line does not claim that names are shown');
  }
  // The shell.
  check(/<meta name="theme-color" content="#FBF8F3">/.test(indexHtml) && /Instrument\+Serif/.test(indexHtml) && /Nunito/.test(indexHtml) && indexHtml.indexOf('href="light.css"') > indexHtml.indexOf('href="ui.css"'), 'the page reads as the light canvas and loads the two typefaces');
  check(/--ivory: #FBF8F3; --ink: #14100E; --hair: #F1EFEC;/.test(light), 'canvas, ink and hairline are the approved three');
  const main3 = run('NAV')[0][1].map(i => i[2]);
  check(JSON.stringify(main3) === JSON.stringify(['Home', 'Map', 'People']) && run('S.view = "home"; 1') && views.includes('dash'), 'the main nav is Home, Map, People, and the older Dashboard is still a page');
}

// The contact card (person.js): a person's real facts and a plan built only from their record.
{
  const pjs = fs.readFileSync(path.join(dir, 'person.js'), 'utf8');
  const P = id => run(`JSON.stringify(Person.plan(Person.get(${JSON.stringify(id)})))`), plan = id => JSON.parse(P(id));
  const card = id => run(`Person.html(${JSON.stringify(id)})`), txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const td = state.feed.touches_due || [], owes = td.find(r => r.owes_reply && (r.last_messages || []).length);
  if (owes) { const pl = plan(owes.person_id), said = run(`CC.cleanMsg(${JSON.stringify(owes.last_messages.slice(-1)[0])})`);
    check(pl.now === `Answer their last message: “${said}”` && /^Now\./.test(pl.when) && pl.why.length > 10, 'plan, a reply is owed: answer their last message, now, with the real reason', JSON.stringify(pl)); }
  const lead = (state.feed.new_leads || [])[0];
  if (lead) { const pl = plan(lead.person_id);
    check(pl.now === 'Send the first reply.' && /^Now\./.test(pl.when) && (!lead.source || pl.why.includes(lead.source)), 'plan, a new lead: the first reply, now, naming where the lead came from', JSON.stringify(pl)); }
  const dealRow = (state.feed.deals || []).find(d => d.person_id && !td.some(r => r.person_id === d.person_id && r.owes_reply) && !(state.feed.new_leads || []).some(r => r.person_id === d.person_id) && run(`!!Person.get(${JSON.stringify(d.person_id)})`));
  if (dealRow) { const pl = plan(dealRow.person_id);
    check(pl.now.includes(dealRow.address) && /^Live deal, /.test(pl.why), 'plan, a live deal: the deal\'s own next step or date', JSON.stringify(pl)); }
  else check(false, 'plan, a live deal: the demo feed has a person with a live deal to test');
  const pl2 = o => JSON.parse(run(`JSON.stringify(Person.plan(${JSON.stringify(Object.assign({ deals: [] }, o))}, '2026-11-10'))`));
  const hotP = pl2({ temp: 'hot', band: 'hot', reasons: ['Texting both ways, 4 from them in 30 days', 'Talked about selling 12 days ago'], last_touch: '2026-11-08' });
  check(hotP.now === 'Reach out about it: talked about selling 12 days ago.' && hotP.why === 'Talked about selling 12 days ago.', 'plan, hot with a selling reason: reach out about that reason, quoted as the feed has it', JSON.stringify(hotP));
  const warmP = pl2({ band: 'warm', last_touch: '2026-11-01', next_action: 'Send the Zachary comps' });
  check(warmP.now === 'Do your logged next step: Send the Zachary comps' && warmP.why === 'Last touch 9 days ago, on Sun, Nov 1.' && warmP.when === 'Due Sun, Nov 15, in 5 days (warm cadence, every 14 days).', 'plan, otherwise: the logged next step, the last touch, and the due date from their cadence', JSON.stringify(warmP));
  const lateP = pl2({ band: 'hot', last_touch: '2026-10-20' });
  check(lateP.now === 'Check in. No next step logged.' && lateP.when === 'It was due Tue, Oct 27, 14 days ago (hot cadence, every 7 days).', 'plan, overdue with no next step: says no next step is logged and how late it is', JSON.stringify(lateP));
  const bare = pl2({});
  check(bare.now === 'Check in. No next step logged.' && bare.why === 'No last touch on the sheet.' && bare.when === 'No cadence on the sheet, so there is no due date.', 'plan, missing data: each missing fact is said, nothing is padded', JSON.stringify(bare));
  const noPhone = td.find(r => !r.phone);
  if (noPhone) { const h = card(noPhone.person_id);
    check(/No phone on the sheet/.test(h) && !/, 'call'\)/.test(h), 'the card says No phone on the sheet and shows no Call button without a valid number'); }
  if (owes) { const h = card(owes.person_id), t2 = txt(h);
    check(h.includes(run(`CC.pname(${JSON.stringify(owes.display)})`)) && /class="stg-chip/.test(h) && /Plan for /.test(t2) && /Now /.test(t2) && /Why /.test(t2) && /When /.test(t2)
      && ['Heat', 'Phone', 'Email', 'Place', 'Last touch', 'Next step', 'Reply', 'Last message', 'Grok'].every(k => h.includes(`<dt>${k}</dt>`)) && /You owe them a reply/.test(h),
      'the card shows the name, stage chip, cadence, the plan and every fact row');
    check(/class="pc-primary" onclick="openCompose\(/.test(h) && /onclick="openGrok\([^)]*, 'call'\)"/.test(h) && /onclick="openNote\(/.test(h) && /onclick="touched\(/.test(h) && /onclick="openGrok\([^)]*, 'draft'\)"/.test(h)
      && (h.match(/class="pc-primary"/g) || []).length === 1, 'the card has Text as its one primary button, then Call, Note, Log touch and Hard draft, all on sheets that already exist'); }
  check(!/\/api\//.test(pjs) && !/fetch\(|XMLHttpRequest/.test(pjs), 'the contact card starts no send, call or draft path of its own');
  const pinOnly = pl2({ band: 'warm', days_quiet: 40 });
  check(pinOnly.why === 'Last touch 40 days ago.' && pinOnly.when === 'It was due Thu, Oct 15, 26 days ago (warm cadence, every 14 days).', 'plan, a map pin with days quiet but no date: the due date is worked back from the days, never called missing', JSON.stringify(pinOnly));
  const pinP = ((state.feed.map || {}).pins || []).find(x => x.kind === 'person' && x.days_quiet != null && !td.some(r => r.person_id === x.person_id));
  if (pinP) check(!/No last touch on the sheet/.test(card(pinP.person_id)) && new RegExp(`<dt>Last touch</dt><dd>${pinP.days_quiet} days? ago</dd>`).test(card(pinP.person_id)), 'the card of a person known only from the map shows how long they have been quiet');
  run(`var __dr = {}, __q2 = document.querySelector; document.querySelector = s => s === '#drawer' ? __dr : (s === '#c-body' ? { addEventListener() {}, focus() {}, setSelectionRange() {}, value: '' } : __q2(s));`);
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { touches_due: [${JSON.stringify(Object.assign({}, td[0], { person_id: 'zz-raw', display: '' }))}].concat(__state.feed.touches_due) }) }); openCompose('zz-raw')`);
  check(run('S.compose.name') === '' && /No name on the sheet/.test(run('__dr.innerHTML')) && run('S.queueIdx') === -1 && /if \(c\.fromCard \|\| S\.queueIdx < 0\) \{ closeDrawer\(\);/.test(appjs),
    'a message for someone with no name shows No name on the sheet but never sends or logs that as their name, and it closes after sending');
  run(`openPerson('zz-raw')`);
  check(run('S.card') === 'zz-raw' && run('S.compose') === null && /Plan for No name on the sheet/.test(run('__dr.innerHTML').replace(/<[^>]+>/g, '')), 'opening a person shows their card and clears any open message');
  run(`document.querySelector = __q2; S.compose = null; S.card = null; S.data = __state;`);
  const eid = 'x"\'><b', erow = { person_id: eid, display: '<img src=x onerror=1>', band: 'hot', stage: 'nurture', next_action: '<script>1</script>', last_messages: ['2026-11-01: <i>hi</i>'], owes_reply: true, phone: '2255550100' };
  const evil = () => run(`(() => { S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { touches_due: [${JSON.stringify(erow)}] }) }); const h = Person.html(${JSON.stringify(eid)}); S.data = __state; return h; })()`);
  const eh = evil();
  check(!/<img src=x|<script>|<i>hi<\/i>|"'><b/.test(eh) && /&lt;img src=x/.test(eh), 'a name, id, note or message with markup in it is shown as text on the card, never run');
  check(/Not in the feed/.test(card('no-such-id')), 'a person who is not in the feed gets a card that says so, with nothing made up');
  // The name fallback everywhere a person shows: the sheet's name, or it says there is none.
  const blank = Object.assign({}, td[0], { person_id: 'zz-blank', display: '', stage: 'nurture', owes_reply: false, last_messages: [] });
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { touches_due: [${JSON.stringify(blank)}].concat(__state.feed.touches_due), heat: Object.assign({}, __state.feed.heat, { hot: [Object.assign({ temp: 'hot', heat: 90, reasons: ['Talked about buying 2 days ago'] }, ${JSON.stringify(blank)})].concat((__state.feed.heat || {}).hot || []) }) }) })`);
  const shows = ['touches', 'home', 'people', 'hot'].filter(v => !/No name on the sheet/.test(render(v)));
  run(`S.q = 'zz-none'`);
  check(!shows.length && /No name on the sheet/.test(card('zz-blank')) && run(`CC.pname('')`) === 'No name on the sheet' && run(`CC.pname('  Pat Fixture ')`) === 'Pat Fixture',
    'a person with no name on the sheet reads No name on the sheet on Touches due, Home, People, Hot and their card', shows.join(', '));
  run(`S.q = ''; S.data = __state;`);
}

// Coral, hover, motion, color in More, Start here, and Text and Call beside a name (2026-11-10, later).
{
  const light = fs.readFileSync(path.join(dir, 'light.css'), 'utf8'), stagejs = fs.readFileSync(path.join(dir, 'stage.js'), 'utf8');
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  check(/--coral: #E04E28;/.test(light) && /\.stg-under-contract \{ --stg: #E04E28; --stg-ink: #14100E; \}/.test(light) && /\['under contract', '#E04E28', '#14100E'\]/.test(stagejs)
    && !/E87757/i.test(light + stagejs + fs.readFileSync(path.join(dir, 'person.js'), 'utf8')), 'coral is #E04E28 for the wordmark period, the under contract stage and the highlight, and the old coral is gone from the light look');
  check(ratio('#E04E28', '#14100E') >= 4.5, 'ink type on the coral tab and the coral button reads at 4.5 to 1 or better', ratio('#E04E28', '#14100E').toFixed(2));
  const stg = (light.match(/\.stg-[a-z-]+ \{ --stg: #[0-9A-Fa-f]{6}/g) || []).filter(s => /E04E28/i.test(s));
  check(stg.length === 1 && /under-contract/.test(stg[0]) && !/cad[^{]*\{[^}]*coral/.test(light), 'coral is on no other stage tab and never on a cadence word');
  check(/\.nav button:hover[^{]*\{ color: var\(--coral\); \}/.test(light) && /button:focus-visible, a:focus-visible[^{]*\{ outline: 2px solid var\(--coral\)/.test(light)
    && /\.cc-page button:hover[^{]*\{ border-color: var\(--coral\); \}/.test(light), 'buttons and links take a coral highlight on hover and on keyboard focus');
  check(/\.send-btn:hover[^{]*\{ border-color: var\(--coral\) !important; box-shadow: inset 0 -3px 0 var\(--coral\); \}/.test(light) && !/\.send-btn:hover[^{]*\{[^}]*background/.test(light), 'hovering a send button draws a coral line and never fills it, so it cannot read as sent');
  const durs = (light.match(/(?:animation: lt-[a-z]+ |--t: |transform )(\d+)ms/g) || []).map(s => Number(s.match(/(\d+)ms/)[1]));
  check(durs.length >= 4 && durs.every(d => d >= 150 && d <= 220) && !/cubic-bezier|bounce/.test(light.slice(light.indexOf('2026-11-10, later'))), 'motion runs 150 to 220ms with a plain ease and no bounce', durs.join(', '));
  const rm = (light.match(/@media \(prefers-reduced-motion: reduce\) \{[^]*?\n\}/) || [''])[0];
  check(/animation: none !important/.test(rm) && /transition-property: color, background-color, border-color !important/.test(rm) && /transform: none/.test(rm), 'with reduced motion only color changes: no slide, no fade, no press shift');
  check(/\.g-today \{ --grp: #F5C518; \} \.g-deals \{ --grp: #8B5CF6; \} \.g-numbers \{ --grp: #3A8FDD; \} \.g-you \{ --grp: #2DB87A; \} \.g-system \{ --grp: #14100E; \}/.test(light)
    && /button\.nav-hot \.lbl::before \{ background: #D4537E; \}/.test(light) && /button\.nav-warm \.lbl::before \{ background: #F5C518; \}/.test(light)
    && /\.nav-h \{[^}]*color: var\(--ink\); \}/.test(light) && /class="\$\{sub \? `sub nav-\$\{k\} ` : ''\}/.test(appjs), 'More shows a tab of stage color on each group and a dot on Hot and Warm, with the words still ink');
  // Start here
  const first = JSON.parse(run('JSON.stringify(Stage.startHere())')), home = render('home');
  const owing = (state.feed.touches_due || []).some(r => r.owes_reply);
  check(first && (!owing || first.owes_reply), 'Start here picks the most pressing due person, a reply owed first', first && first.display);
  const sh = (home.match(/<section class="lt-start"[^]*?<\/section>/) || [''])[0];
  check(sh.includes(run(`CC.pname(${JSON.stringify(first.display)})`)) && /class="lt-go" onclick="openCompose\(/.test(sh) && />(Text|Email) them<\/button>/.test(sh)
    && (!run(`normPhone(${JSON.stringify(first.phone || '')})`) || /onclick="openGrok\([^)]*, 'call'\)">Call<\/button>/.test(sh)) && /onclick="Stage\.open\(/.test(sh), 'Start here shows their name, a Text them button and Call when they have a number');
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { touches_due: [], new_leads: [] }) })`);
  check(run('Stage.startHere()') === null && !/lt-start/.test(render('home')), 'Start here is left out when nobody is due');
  run('S.data = __state');
  const ppl = render('people'), rows = (home + ppl).match(/<li><button type="button" onclick="Stage\.open\([^]*?<\/li>/g) || [];
  check(rows.length > 5 && rows.some(r => /class="ra" onclick="openCompose\(/.test(r)) && rows.some(r => /class="ra" onclick="openGrok\([^)]*, 'call'\)"/.test(r))
    && rows.every(r => !/<button[^>]*>(?:(?!<\/button>)[^])*<button/.test(r)), 'Home due rows and People rows carry Text and Call beside the name, and no button sits inside another');
  check(!/\/api\/(send|call|draft)/.test(stagejs), 'stage.js still calls no send, call or draft endpoint');
}

// ---------------- Round 5, fixes 1 to 4: New leads, Call these 10, the fuller card, Likely sellers
{
  const reachjs = fs.readFileSync(path.join(dir, 'reach.js'), 'utf8'), txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  run('S.data = __state; CC.data = __cc; Stage.sellers = false; Stage.q = ""');
  const home = render('home'), speed = ccdata.speed || [], lead = home.slice(home.indexOf('aria-label="New leads"'), home.indexOf('aria-label="Call these 10 today"'));
  check(home.indexOf('aria-label="New leads"') > 0 && home.indexOf('aria-label="New leads"') < home.indexOf('aria-label="Call these 10 today"')
    && home.indexOf('aria-label="Call these 10 today"') < home.indexOf('<h1>') && home.indexOf('<h1>') < home.indexOf('aria-label="Start here"'),
    'Home opens with New leads, then Call these 10, above everything else');
  check(speed.length > 0 && speed.slice(0, 5).every(l => lead.includes(run(`CC.pname(${JSON.stringify(l.name)})`)) && lead.includes(run(`esc(${JSON.stringify(l.source)})`))
    && (!l.asked || lead.includes(run(`esc(${JSON.stringify(l.asked)})`)))), 'each new lead shows the name, the source and what they asked');
  check(speed.some(l => !l.asked) ? /What they asked: unknown/.test(lead) : true, 'a lead whose form carried no message says unknown');
  check((lead.match(/class="sl-timer/g) || []).length === Math.min(5, speed.length), 'every lead row has a timer, or says the time is unknown');
  const t0 = Date.parse('2026-11-11T12:00:00-06:00'), tm = sec => run(`Reach.timer({ timed: true, received: '2026-11-11T12:00:00-06:00' }, ${t0 + sec * 1000})`);
  check(/>4:59</.test(tm(299)) && !/late/.test(tm(299)) && />5:00</.test(tm(300)) && /sl-timer late/.test(tm(300)) && />2h 05m</.test(tm(7500)), 'the timer counts up from when the lead came in and turns red at five minutes');
  check(/sl-timer late/.test(run(`Reach.timer({ timed: false, received: '2020-01-01' })`)) && /time unknown/.test(run(`Reach.timer({ timed: false, received: todayISO() })`)) && !/\d:\d\d/.test(run(`Reach.timer({ timed: false, received: todayISO() })`)),
    'a lead with a day and no clock time never shows a made-up timer');
  const mine = speed.findIndex(l => l.in_crm), loose = speed.findIndex(l => !l.in_crm && l.draft.kind);
  check((lead.match(/onclick="Reach\.add\(/g) || []).length === speed.slice(0, 5).filter(l => !l.in_crm && (l.phone || l.email)).length && /Add to CRM/.test(lead), 'only a lead that is not in the CRM, with a phone or an email to add, shows Add to CRM');
  if (loose >= 0) { run(`Reach.reply(${loose})`); const c = JSON.parse(run('JSON.stringify(S.compose)'));
    check(c.kind === speed[loose].draft.kind && c.body === speed[loose].draft.body && c.to === speed[loose].draft.to && c.person_id === '', 'one tap opens the message box with the first reply written, for a lead not in the CRM too'); run('S.compose = null'); }
  if (mine >= 0) { run(`Reach.reply(${mine})`); const c = JSON.parse(run('JSON.stringify({ kind: S.compose.kind, body: S.compose.body, id: S.compose.person_id })'));
    check(c.id === speed[mine].person_id && c.body === speed[mine].draft.body, 'a lead already in the CRM opens the same message box, tied to that person'); run('S.compose = null'); }
  check(!/api\('[^']+',\s*\{/.test(reachjs) && !/\/api\/(send|call|draft|lead|opened|touch)/.test(reachjs), 'reach.js sends nothing and writes nothing: its one server call is a read');
  run('CC.data = Object.assign({}, __cc, { speed: [] })');
  check(/No new lead is waiting on a first reply/.test(render('home')) && /aria-label="New leads"/.test(render('home')), 'with no lead waiting the New leads card stays and says so');
  run('CC.data = __cc');

  const c10 = (state.call10 || {}).rows || [], call = home.slice(home.indexOf('aria-label="Call these 10 today"'), home.indexOf('<h1>')), lis = call.match(/<li>[^]*?<\/li>/g) || [];
  check(c10.length > 0 && c10.length <= 10 && lis.length === c10.length, `Call these 10 lists ${c10.length} people, never more than ten`);
  check(lis.every((li, i) => li.includes(run(`esc(${JSON.stringify(c10[i].reason)})`)) && /class="ra" onclick="openCompose\(/.test(li) && /class="ra" onclick="openGrok\([^)]*, 'call'\)"/.test(li)
    && !/<button[^>]*>(?:(?!<\/button>)[^])*<button/.test(li)), 'each row shows its reason with Text and Call, on the message box and Grok panel that already exist');
  const partner = new Set((f.partners || []).map(p => String(p.person_id)));
  check(c10.every(r => !partner.has(r.person_id) && run(`normPhone(${JSON.stringify(r.phone)})`)), 'no vendor, agent or lender is on the call list, and everyone on it has a valid phone');

  const sel = state.sellers || [];
  run('Stage.sellers = true'); const sp = render('people'); run('Stage.sellers = false');
  check(sel.length > 0 && sel.length <= 25 && (sp.match(/class="sel-score"/g) || []).length === sel.length && sel.every(r => sp.includes(`>${r.score}</b>`) && r.reasons.every(x => sp.includes(run(`esc(${JSON.stringify(x)})`))))
    && /aria-pressed="true" onclick="Stage\.showSellers\(true\)"/.test(sp), `the Likely sellers filter lists the top ${sel.length} with score and reasons`);
  check(!/class="sel-score"/.test(render('people')) && /Likely sellers/.test(render('people')), 'People opens on the stage board, with the Likely sellers filter one tap away');

  const who = (f.touches_due || [])[0], cardHTML = x => { run(`Reach.cards[${JSON.stringify(String(who.person_id))}] = ${JSON.stringify(x)}`); return run(`Person.html(${JSON.stringify(who.person_id)})`); };
  const facts = [['phone', 'Phone', 'On the sheet', 'CRM sheet'], ['email', 'Email', null, ''], ['value', 'Home value', '$412,000', 'parish assessment'], ['equity', 'Equity', null, ''],
    ['years', 'Years owned', '8 years, since 2018-05-20', 'bought with you, CRM Deals tab'], ['source', 'Lead source', 'Referral 2017-03-02', 'CRM sheet'], ['deal', 'Last deal with you', null, ''], ['household', 'Household', 'Jamie Example', 'same address on the CRM sheet']]
    .map(([key, label, value, from]) => ({ key, label, value, from, why: value ? '' : 'no source has it' }));
  const full = cardHTML({ ok: true, facts, known: 5, total: 8, homeowner: true, seller: { score: 65, reasons: ['Owned 8 years, bought with you 2018-05-20', 'Past client'] } }), ft = txt(full);
  check(/5 of 8 known/.test(ft) && (full.match(/<i class="on"/g) || []).length === 5 && (full.match(/<i class="/g) || []).length === 8, 'the card shows a completeness meter: 5 of 8 known, one mark per fact');
  check(['Home value', 'Equity', 'Years owned', 'Lead source', 'Last deal with you', 'Household'].every(k => full.includes(`<dt>${k}</dt>`)) && /\$412,000\s*parish assessment/.test(ft), 'the card adds home value (labeled parish assessment), equity, years owned, lead source, last deal and household');
  check(/<dt>Equity<\/dt><dd class="pc-missing">unknown<small>no source has it<\/small>/.test(full) && /<dt>Last deal with you<\/dt><dd class="pc-missing">unknown/.test(full), 'a fact with no source reads unknown with the reason, never a number');
  check(/class="pc-score">65<\/b>/.test(full) && /Likely-seller score, of 100/.test(ft) && /Owned 8 years, bought with you 2018-05-20/.test(ft) && /Past client/.test(ft), 'the card shows the likely-seller score and its top 2 reasons');
  check(/class="pc-score">unknown<\/b>/.test(cardHTML({ ok: true, facts, known: 5, total: 8, homeowner: false, seller: null })), 'someone with no address gets no seller score, and the card says why');
  run(`delete Reach.cards[${JSON.stringify(String(who.person_id))}]`);
  check(/Reading the rest of the record/.test(run(`Person.html(${JSON.stringify(who.person_id)})`)), 'until the record arrives the card says it is reading, and shows no placeholder numbers');

  const so = render('sources'), st2 = txt(so);
  check(/How the scores work/.test(st2) && ccdata.formula.seller.parts.every(p => so.includes(run(`esc(${JSON.stringify(p.rule)})`))) && /7\+ years scores 30/.test(st2) && /Call these 10 today/.test(st2),
    'the Sources page shows the likely-seller formula and the call list ranking, as the code has them');
  check(/New lead alert/.test(st2) && /to nobody else|Only the one Mac that sends/.test(st2), 'the Sources page says where the new lead alert goes');
}

// ---------------- Fixes 5 to 8 and the learning loop (2026-11-11)
{
  const fixjs = fs.readFileSync(path.join(dir, 'fix.js'), 'utf8'), txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  run('S.data = __state; CC.data = __cc; Stage.sellers = false; Stage.q = ""; S.q = ""');
  const home = render('home'), at = k => home.indexOf(`aria-label="${k}"`);
  check(at('Money first') > 0 && at('Money first') < at('New leads') && at('New leads') < at('Call these 10 today') && at('Call these 10 today') < home.indexOf('<h1>'),
    'Home is money first: paydays and this week\'s deadlines, then new leads, then Call these 10, then everything else');
  const mf = home.slice(at('Money first'), at('New leads')), pay = ccdata.closings || [], d7 = (ccdata.deadlines || {}).d7 || [];
  check(/Paydays, next 30 days/.test(mf) && pay.slice(0, 4).every(r => mf.includes(run(`esc(${JSON.stringify(r.deal)})`))) && /Deadlines this week/.test(mf) && new RegExp(`class="mf-big">${d7.length}<`).test(mf),
    'the money block lists each payday in 30 days and counts the deadlines in 7');
  check(d7.length === 0 || /Inspection|Appraisal|Financing|Act of sale|Deadline/.test(mf), 'each deadline says what kind it is');
  { // The Deals sheet and the calendar disagree on a closing day and one of the two is this week: Home shows it, flagged.
    const row = { deal: '100 Fixture Ln', key: '100 fixture', day: '2026-11-13', time: '10:30AM', what: 'Act of sale', title: '100 Fixture Ln - Act of sale', from: 'sheet', note: 'the calendar has act of sale on 2026-11-13',
      disagree: { sheet: '2026-11-20', calendar: '2026-11-13', time: '10:30AM', days: [{ day: '2026-11-13', time: '10:30AM' }, { day: '2026-11-27', time: null }] } };
    run(`CC.data = Object.assign({}, __cc, { deadlines: Object.assign({}, __cc.deadlines, { all: [${JSON.stringify(row)}], d7: [${JSON.stringify(row)}], d3: [], overdue: [] }) })`);
    const h2 = render('home'), m2 = txt(h2.slice(h2.indexOf('aria-label="Money first"'), h2.indexOf('aria-label="New leads"')));
    check(/class="mf-big">1</.test(h2) && /100 Fixture Ln/.test(m2) && /dates disagree/.test(m2) && /Nov 13 10:30AM and \S+ Nov 27 on the calendar/.test(m2) && /Nov 20 on the Deals sheet/.test(m2) && !/No contract deadline in the next 7 days/.test(m2),
      'a closing whose sheet and calendar dates disagree shows on Home as a deadline with every day and a dates disagree flag', m2.slice(0, 400));
    const says = /Dates disagree\. Deals sheet: \S+ Nov 20\. Calendar: \S+ Nov 13 10:30AM and \S+ Nov 27\./;
    check(says.test(txt(render('deadlines'))), 'the Deadlines page says the dates disagree and names each day', txt(render('deadlines')).slice(0, 300));
    check(says.test(txt(render('dash'))), 'the Dashboard deadline list says the dates disagree');
    run('CC.data = __cc');
  }
  run('CC.data = Object.assign({}, __cc, { closings: [{ deal: "1 Blank Way", day: __cc.today, money: null }] })');
  check(/unknown/.test(render('home').split('aria-label="New leads"')[0]) && /commission unknown/.test(render('home')), 'a payday with no commission on the sheet reads unknown, never $0');
  run('CC.data = __cc');

  const c10 = (state.call10 || {}).rows || [], call = home.slice(at('Call these 10 today'), home.indexOf('<h1>'));
  check(c10.length > 0 && (call.match(/onclick="Fix\.feedback\('call10', [^)]*'good'\)"/g) || []).length === c10.length && (call.match(/'not_useful'\)"/g) || []).length === c10.length,
    'every Call these 10 row has Good call and Not useful');
  const sc = run(`(Reach.cards['503'] = { ok: true, facts: [], known: 0, total: 8, homeowner: true, seller: { score: 65, reasons: ['Owned 8 years'], sources: ['sales record'] } }, Person.moreHTML('503'))`);
  check(/onclick="Fix\.feedback\('seller', [^)]*'good'\)"/.test(sc) && /Not useful/.test(sc) && /from the sales record/.test(txt(sc)), 'the seller card has the two buttons and marks each reason\'s source');
  check(!/\/api\/(send|call|draft|touch|lead|note|stage|deal|relabel|dnc)\b/.test(fixjs) && (fixjs.match(/api\('\/api\/[a-z]+', \{/g) || []).join() === "api('/api/feedback', {,api('/api/fix', {",
    'fix.js writes two things only, both local logs: a feedback tap and a Fix list tap');

  // 5. deals tied to people, one set of counts
  const dc = state.deal_counts, bc = state.board_contract || [];
  run('Stage.sellers = false'); const board = render('people'), ucCol = board.slice(board.indexOf('aria-label="under contract"'), board.indexOf('aria-label="closed"'));
  check(dc && bc.length === dc.contract && new RegExp(`<b>${dc.contract}</b>`).test(ucCol) && (ucCol.match(/<li>/g) || []).length === dc.contract, `the Board's Under contract column has ${dc.contract} rows, one per deal under contract`);
  const dealsPg = render('deals');
  check(new RegExp(`>${dc.open} open<`).test(dealsPg) && run('CC.openDeals().length') === dc.open, `the Deals page says ${dc.open} open, the same count`);
  run(`CC.data = Object.assign({}, __cc, { deals: __cc.deals.concat([{ deal: '700 Fixture Rd', key: '700 fixture', status: 'Offer', stage: 'offer', side: 'Buyer', price: 1, commission: 1, differs: [], checklist: [], next: '', offer: { date: '2026-11-06', time: '5 PM', expired: true } }]),
    ties: __cc.ties.concat([{ key: '700 fixture', deal: '700 Fixture Rd', stage: 'offer', expired_offer: true, people: [] }]) })`);
  const dp2 = render('deals');
  check(new RegExp(`>${dc.open} open<`).test(dp2), 'an offer past its deadline drops out of the open count and shows under Expired, confirm');
  check(/Expired, confirm <span class="cc-count">1</.test(dp2) && dp2.indexOf('Expired, confirm') < dp2.indexOf('700 Fixture Rd') && run('CC.openDeals().length') === dc.open, 'the expired offer is still listed, under Expired, confirm');
  check(/1 expired, confirm on the Fix list/.test(render('dash')), 'the Dashboard says how many offers expired');
  run('CC.data = __cc');

  // 6. the Fix list
  const fx = ccdata.fixes, fp = render('fixes'), ft = txt(fp);
  check(/Fix list/.test(ft) && fx.open.length > 0 && fx.open.slice(0, 5).every(r => fp.includes(run(`esc(${JSON.stringify(r.problem)})`)) && fp.includes(run(`esc(${JSON.stringify(r.fix)})`))),
    'the Fix list shows each row\'s problem and suggested fix');
  check((fp.match(/onclick="Fix\.decide\('[0-9a-f]{12}', 'approve'\)"/g) || []).length === Math.min(fx.open.length, (fp.match(/class="cc-row fx-row"/g) || []).length) && /Not a problem/.test(fp) && /never edits the sheets/.test(ft),
    'each row has its own Approve, one tap at a time, and the page says the sheets are never edited');
  const cn = ccdata.cap_note;
  check(cn && ft.includes(`Cap from Goals: $${Number(cn.amount).toLocaleString()}`) && (!cn.differs || /\$20,000 plus the \$3,000 royalty/.test(ft)), 'the cap shows the Goals value, with a note when it is not $20,000 plus the $3,000 royalty');
  check(!cn.differs || /\$20,000 plus the \$3,000 royalty/.test(txt(render('scorecard'))), 'the Scorecard carries the same cap note');
  run(`CC.data = Object.assign({}, __cc, { fixes: { open: [], approved: [Object.assign({ at: '2026-11-11T09:00:00' }, __cc.fixes.open[0])], dismissed: 2, resolved: 1 } })`);
  const fp2 = txt(render('fixes'));
  check(/No row looks wrong right now/.test(fp2) && /Approved, yours to change in the sheet 1/.test(fp2) && /2 set aside as not a problem. 1 approved and since fixed/.test(fp2), 'approved rows wait in their own list, and the page counts what was set aside and fixed');
  run('CC.data = __cc');

  // 8. the weekly proof line
  const pr = ccdata.proof;
  run('CC.data = Object.assign({}, __cc, { proof: Object.assign({}, __cc.proof, { monday: true }) })'); const hm = render('home');
  run('CC.data = Object.assign({}, __cc, { proof: Object.assign({}, __cc.proof, { monday: false }) })'); const ht = render('home'), so = render('sources');
  run('CC.data = __cc');
  check(/aria-label="Weekly proof"/.test(hm) && !/aria-label="Weekly proof"/.test(ht) && /aria-label="Weekly proof"/.test(so), 'the proof line is on Home on Mondays and on Sources every day');
  const pt = txt(so.slice(so.indexOf('aria-label="Weekly proof"'), so.indexOf('How the scores work')));
  check(['leads in', 'median first reply', 'texts sent', 'calls through Grok', 'appointments', 'deals from Pipeline', 'GCI tied to them'].every(k => pt.includes(k)), 'it has leads in, first reply, texts and calls, appointments, deals from Pipeline and GCI');
  check(pr.first_reply.value != null || (/unknown/.test(pt) && pt.includes(pr.first_reply.why)), 'a first reply time with no record reads unknown with the reason');

  // C. the learning scorecard
  const L = ccdata.learn, lt = txt(so.slice(so.indexOf('What the scores learned')));
  check(/What the scores learned/.test(lt) && L.current.seller.words.every(w => lt.includes(w)) && /Years owned counts \d+%/.test(lt), 'Sources shows the current weights in plain words');
  check(/Of the top 25 last month: unknown\./.test(lt) || /Of the top \d+ a month ago: \d+ replied, \d+ set an appointment, \d+ listed\./.test(lt), 'it says how last month\'s top 25 did, or unknown with why');
  check(/never inputs/.test(lt) && /kept on this Mac/.test(lt) && /tests worse than last week's is not used/.test(lt) && /Every Monday at 6 AM/.test(lt), 'it states the rules: no protected traits, local only, a worse version is not used, Monday 6 AM');
  ctx.__learn2 = { changed: { seller: { activity: 2.5, past: -2.5 }, call10: {} }, versions: [{ version: 3, date: '2026-11-09', weights: {}, lists: {
    seller: { rows: 60, yes: 9, old_auc: 0.61, new_auc: 0.58, used: false, note: "The new weights tested worse on the last 90 days (0.58 against 0.61), so last week's weights stay." },
    call10: { rows: 4, yes: 0, used: false, note: 'Not enough outcomes yet.' } } }] };
  run('CC.data = Object.assign({}, __cc, { learn: Object.assign({}, __cc.learn, __learn2) })');
  const l2 = txt(render('sources'));
  run('CC.data = __cc');
  check(/activity up 2\.5, past down 2\.5/.test(l2) && /Kept the old weights/.test(l2) && /tested worse on the last 90 days/.test(l2) && /0\.61 before, 0\.58 after/.test(l2), 'a version that tested worse is shown as not used, with both test numbers and what changed');
}

// ---- One deal record: the contact card, the nav count and the open list read links.records, never the CRM tab's own
// close date, price, side or stage. Made-up people: the CRM tab says Nov 29 and active, the Deals sheet says otherwise.
{
  ctx.__recs = [
    { key: '410 heron', deal: '410 S Heron Ln', side: 'Listing', side_word: 'selling', close: '2026-11-23', price: 300000, status: 'Under Contract', stage: 'contract', expired_offer: false, open: true, next: '', people: [{ person_id: '9001', display: 'Ann Example' }, { person_id: '9003', display: 'Abe Example' }] },
    { key: '77 egret', deal: '77 Egret Rd', side: 'Listing', side_word: 'selling', close: '2026-11-16', price: 475000, status: 'Offer', stage: 'offer', expired_offer: true, open: false, next: '', people: [{ person_id: '9002', display: 'Bea Sample' }] }];
  ctx.__rfeed = Object.assign({}, state.feed, {
    touches_due: [{ person_id: '9001', display: 'Ann Example', band: 'warm', stage: 'nurture' }, { person_id: '9002', display: 'Bea Sample', band: 'warm', stage: 'nurture' },
      { person_id: '9003', display: 'Abe Example', band: 'warm', stage: 'nurture' }, { person_id: '9004', display: 'Fay Nobody', band: 'warm', stage: 'nurture' }],
    new_leads: [],
    deals: [{ person_id: '9001', address: '410 South Heron Lane, Zachary, LA 70791', side: 'Buyer', stage: 'active', price: '310000', expected_close: '2026-11-29', next_step: '' },
      { person_id: '9002', address: '77 Egret Road, Saint Francisville, LA 70775', side: 'Listing', stage: 'active', price: '510000', expected_close: '', next_step: '' },
      { person_id: '9004', address: '300 Teal Dr, New Roads, LA 70760', side: 'Buyer', stage: 'active', price: '150000', expected_close: '2026-12-20', next_step: '' }] });
  run('S.data = Object.assign({}, __state, { feed: __rfeed, deal_records: __recs }); CC.data = Object.assign({}, __cc, { deal_records: __recs, ties: [], deals: __recs.map(r => ({ key: r.key, deal: r.deal, stage: r.stage, status: r.status, side: r.side, act: r.close, price: r.price })) })');
  const get = id => JSON.parse(run(`JSON.stringify(Person.get('${id}'))`)), planOf = id => JSON.parse(run(`JSON.stringify(Person.plan(Person.get('${id}'), '2026-11-11'))`));
  const a = get('9001').deals, pa = planOf('9001');
  check(a.length === 1 && a[0].expected_close === '2026-11-23' && a[0].price === 300000 && a[0].side === 'Listing' && a[0].status === 'Under Contract' && a[0].record === 'AIRE Deals sheet',
    'contact card: the deal comes from the one deal record, not the CRM tab row', JSON.stringify(a));
  check(/Nov 23/.test(pa.now + pa.why) && !/Nov 29/.test(pa.now + pa.why) && /^Live deal, under contract/.test(pa.why), 'contact card: the plan names the record\'s close date (Nov 23), never the CRM tab\'s (Nov 29)', JSON.stringify(pa));
  check(get('9003').deals.length === 1 && get('9003').deals[0].expected_close === '2026-11-23', 'contact card: everyone tied to a deal sees it, with the same date');
  const b = get('9002').deals, pb = planOf('9002');
  check(b.length === 1 && b[0].expired_offer && !b[0].open && b[0].price === 475000 && !/^Live deal/.test(pb.why) && /past its deadline/.test(pb.why) && /Confirm the offer at 77 Egret Road/.test(pb.now),
    'contact card: an expired offer is not a live deal, the same as the Fix list', JSON.stringify(pb));
  const c = get('9004').deals;
  check(c.length === 1 && c[0].record === 'CRM Deals tab' && c[0].expected_close === '2026-12-20' && /^Live deal, active/.test(planOf('9004').why), 'contact card: a deal only in the CRM tab still shows, marked as CRM only');
  check(run('CC.openDeals().length') === 1 && run('CC.isExpired(CC.data.deals[1])') === true && run('CC.dealRecord("77 Egret Road, Saint Francisville").price') === 475000,
    'the open deals list and the expired check read the record');
  for (const f of ['person.js', 'app.js', 'mapviews.js', 'voice.js', 'crm-pages.js', 'cc-pages.js', 'cc-today.js', 'fix.js', 'stage.js']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l) && !/function openDeal|const crmRow|const x = sh \?|m-close/.test(l)).join('\n');
    check(!/\.filter\(\s*\w+ => !\['closed', 'out'\]\.includes\(\w+\.stage\)\)/.test(src), `${f}: open deals are counted with CC.openDeals(), so an expired offer is never counted as live`);
  }
  const pj = fs.readFileSync(path.join(dir, 'person.js'), 'utf8');
  check(!/\(f\.deals \|\| \[\]\)\.filter\(d => same\(d\)/.test(pj) && /C\.dealRecords\(\)/.test(pj), 'person.js: the card no longer reads its deals straight from the CRM tab rows');
  run('S.data = __state; CC.data = __cc;');
}

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
