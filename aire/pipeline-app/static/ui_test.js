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
// 2026-11-09: Caleb chose "keep black, add a color code". The palette is coral and tan plus the status colors below,
// nothing else (this replaces round 2's coral-and-tan-only rule).
const PALETTE = ['#e87757', '#c8b596', '#aaa298', '#ff5a5f', '#f5b041', '#4ea8ff', '#3ecf8e', '#a78bfa', '#2dd4bf', '#8f877e', '#8fa3b8'];
check(kcolors.length && kcolors.every(c => PALETTE.includes(c)), 'tag colors come only from the approved palette', kcolors.filter(c => !PALETTE.includes(c)).join(' '));
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

// Round 2, item 8: the header search works from every page and says No match when nothing is found.
{
  const pick = (f.touches_due || []).find(r => r.display && r.display.split(' ')[1]);
  if (pick) {
    run(`S.q = ${JSON.stringify(pick.display.split(' ')[1])}`);
    const hits = run(`CC.priv = false; CC.views.search()`);
    check(hits.includes(run(`esc(${JSON.stringify(pick.display)})`)) && /match/.test(hits), 'search from any page finds a person by name');
  }
  run(`S.q = 'zzqx no such thing'`);
  for (const v of ['search', 'touches', 'tasks', 'deals', 'ccleads', 'queue', 'monitor'])
    check(/No match for “zzqx no such thing”/.test(run(`CC.priv = true; CC.views[${JSON.stringify(v)}]()`)), `${v}: an empty search says No match`);
  run(`S.q = ''`);
  const own = run('CC.SEARCHES_ITSELF'), nonList = views.filter(v => !own.includes(v) && v !== 'search');
  check(nonList.length > 5 && /S\.view = 'search'/.test(appjs) && /S\.before \|\| 'dash'/.test(appjs), 'typing on a page with no list opens Search, clearing it goes back');
}

// Round 2, item 9: one owe-a-reply number. Touches due's count shows on the Dashboard, Touches due and Drafts, even when
// the signals file and the reply-draft queue say something else.
{
  const owe = (f.touches_due || []).filter(r => r.owes_reply).length;
  const tq = Object.assign({}, state.text_queue || {}, { reply_first: ((state.text_queue || {}).reply_first || []).slice(0, Math.max(0, owe - 1)) });
  run(`S.data = Object.assign({}, __state, { text_queue: ${JSON.stringify(tq)}, feed: Object.assign({}, __state.feed, { signals: Object.assign({}, __state.feed.signals, { owes_reply: 999 }) }) })`);
  const dsh = render('dash', true), tch = render('touches', true), drf = render('queue', true);
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
  const one = render('scorecard', false);
  check(!/<svg class="cc-spark"/.test(one) && /No trend line yet: one day is saved/.test(one), 'one saved day draws no trend line, it says so');
  check(/Since [A-Z][a-z]{2}, Nov 2: <b>−1<\/b>/.test(one) && !/no history yet/.test(one), 'with no day 7 days old, the change since the first saved day shows with its date');
  run(`CC.data = Object.assign({}, CC.data, { history: ${JSON.stringify([{ day: '2026-11-01', gci: 1, pending: 0, closings: 1, leads7: 2, appts7: 0 }].concat(hist))}, history_saved: 2 })`);
  check(/<svg class="cc-spark"/.test(render('scorecard', false)), 'two saved days draw the trend line');
  run('CC.data = __cc');
}

// Round 2, item 11: CRM pages say their source and time at the top, Tasks says where its count comes from, and the three
// people counts are explained in words.
{
  for (const v of ['touches', 'tasks', 'queue', 'sent', 'monitor', 'search']) {
    if (v === 'search') run(`S.q = 'a'`);
    check(/<section class="cc-card"><p class="cc-srcline"><span class="cc-src/.test(render(v, true)), `${v}: the source and as-of time are at the top of the list`);
    run(`S.q = ''`);
  }
  const tk = f.tasks || [], tab = tk.filter(t => t.task_id).length;
  check(render('tasks', true).includes(`${tk.length} open: ${tab} on the Tasks tab and ${tk.length - tab} from the Next_Action column on contacts`), 'Tasks says how many come from the Tasks tab and how many from Next_Action');
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { tasks: [{ person_id: '1', display: 'A Fixture', task: 'Call', due: '', source: 'Next_Action' }] }) })`);
  check(/That is why the Tasks tab itself shows none open/.test(render('tasks', true)), 'with every task from Next_Action, Tasks explains why the Tasks tab shows none');
  run('S.data = __state');
  const pl = run('CC.peopleLine()'), c = f.counts || {};
  check(pl.includes(c.contacts.toLocaleString() + ' contacts in the AIRE CRM sheet') && (!(f.signals || {}).people || pl.includes('have texts with you')) && pl.includes('placed on the map'), 'the people counts are explained in one sentence', pl);
  check(render('sources', true).includes(pl) && render('map', true).includes(pl), 'Sources and the Map carry that sentence');
}

// Round 2, item 12: phone width. The page itself is checked at 390 px in Chrome (no sideways scroll on any page); these keep
// the rules that make it so.
{
  const uiPhone = (ui.match(/@media \(max-width: 720px\) \{[^]*?\n\}/) || [''])[0];
  check(/\.side \.brand \{ position: sticky; left: 0;/.test(uiPhone) && /\.side \.brand-name, \.side \.brand-sub \{ display: none; \}/.test(uiPhone), 'phone: the P mark is pinned at the left of the nav, never clipped');
  check(/\.nav-h \{ display: inline-flex;/.test(uiPhone) && /\.nav-g \+ \.nav-g \{ border-left/.test(uiPhone), 'phone: nav groups keep their names as dividers');
  check(/\.cc-row-main, \.cc-what, \.cc-note, \.cc-row-why[^{]*\{ min-width: 0; overflow-wrap: anywhere; \}/.test(ui), 'long words in notes wrap instead of spilling sideways');
  const com = render('commission', false), tds = (com.match(/<table class="cc-table cc-stack">[^]*?<\/table>/) || [''])[0].match(/<td[^>]*>/g) || [];
  check(tds.length > 0 && tds.every(t => /data-label="[^"]+"/.test(t)) && /td::before \{ content: attr\(data-label\)/.test(ui), 'phone: the Commission table stacks into rows with every cell labelled');
  check(/class="cc-rows cc-tasks"/.test(render('tasks', true)), 'Tasks rows get their phone spacing');
}

// Round 2, item 13: one visual style. Coral and tan, no blue or green anywhere (CSS or map pins), no strikethrough, no
// word "blank", and the CRM pages use the same head and card as the card pages.
{
  const hueOf = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return null; const sat = l > .5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn); if (sat < .3 || l < .15 || l > .93) return null;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h *= 60; return h < 0 ? h + 360 : h; };
  const coolIn = f => (fs.readFileSync(path.join(dir, f), 'utf8').match(/#[0-9a-f]{6}\b/gi) || []).filter(c => { const h = hueOf(c); return h !== null && h >= 75 && h <= 290; });
  const cool = ['ui.css', 'cc.css', 'map.js'].flatMap(f => coolIn(f).filter(c => !PALETTE.includes(c.toLowerCase())).map(c => f + ' ' + c));
  check(!cool.length, 'no blue or green outside the color code, in the page styles or the map pins', cool.join(' '));
  const cssAll = ['ui.css', 'cc.css', 'app.css'].map(x => fs.readFileSync(path.join(dir, x), 'utf8')).join('\n');
  check(!/line-through/.test(cssAll), 'no strikethrough rule anywhere');
  const words = [], strikes = [];
  for (const v of views) for (const p of [true, false]) { const h = render(v, p); if (/\bblank\b/i.test(h.replace(/<[^>]+>/g, ' ').replace(/_blank/g, ''))) words.push(v); if (/<s[\s>]/.test(h)) strikes.push(v); }
  check(!words.length, 'no page says "blank"', [...new Set(words)].join(' '));
  check(!strikes.length, 'no page draws a struck-through element', [...new Set(strikes)].join(' '));
  for (const v of ['touches', 'tasks', 'queue', 'sent']) { const h = render(v, true); check(/<header class="cc-head">/.test(h) && /<section class="cc-card">/.test(h), `${v}: the same head and card as the card pages`); }
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
  const mp = render('ccmarket', true), tiles = (mp.match(/<div class="cc-tile">[^]*?<\/span><\/div>/g) || []);
  check(tiles.length >= 4 && tiles.every(t => /class="cc-src/.test(t)), 'every Market tile carries its own source line');
  check(/is-failed"><i aria-hidden="true"><\/i>Freddie Mac PMMS, via FRED[^<]*<b>did not load in the last read/.test(mp) && /is-ok"><i aria-hidden="true"><\/i>GBRAR/.test(mp), 'a failed source is red on its own tile, the others stay current');
  check(!/Error|Errno|urlopen|Traceback/.test(mp.replace(/<[^>]+>/g, ' ')), 'Market shows no Python error text');
  run('CC.data = __cc');
}

// Round 2, item 16: Commission flags a paid commission email with no closed deal on the Deals sheet.
{
  const cm = [{ subject: 'Commission for Fake Chapel', received: ccdata.today, status: 'No closed deal' }, { subject: 'Commission for 310 Sugar Mill', received: ccdata.today, status: 'Paid' }];
  run(`CC.data = Object.assign({}, __cc, { commission_mail: ${JSON.stringify(cm)} })`);
  const com = render('commission', false);
  check(/Paid, no closed deal<\/span><b class="cc-num">1</.test(com) && /class="cc-chip s-Nocloseddeal">No closed deal/.test(com) && /no deal on the Deals sheet with this street is Closed/.test(com), 'Commission flags a paid commission with no closed deal and says what to check');
  check(/\.cc-chip\.s-Nocloseddeal \{ color: var\(--cc-coral\)/.test(ui), 'the flag is coral like Not processed');
  run('CC.data = __cc');
}

// Reviewer findings on round 2: dialogs, toasts, the compose drawer, Market text, the map banner and counts.
{
  const tdp = (f.touches_due || []).find(r => r.display && /\s/.test(r.display) && r.phone);
  if (tdp) {
    run('CC.priv = true');
    check(!run(`personSelect('')`).includes(run(`esc(${JSON.stringify(tdp.display)})`)), 'the task picker hides names with privacy on');
    run('var __t = ""; modal = (t, h) => { __t = t + "|" + h; return Promise.resolve(null); };');
    run(`touched(${JSON.stringify(tdp.person_id)})`);
    check(/this person/i.test(run('__t')) && !run('__t').toUpperCase().includes(tdp.display.toUpperCase()), 'the Touched dialog says this person, not the name');
    run(`var __drawer = {}; var __q = document.querySelector; document.querySelector = s => s === '#drawer' ? __drawer : (s === '#c-body' ? { addEventListener() {}, focus() {}, setSelectionRange() {}, value: '' } : __q(s));`);
    run(`openCompose(${JSON.stringify(tdp.person_id)})`);
    const dh = run('__drawer.innerHTML || ""');
    check(dh && !dh.includes(tdp.display) && /class="cc-masked"/.test(dh) && !(tdp.last_messages || []).some(m => m.length > 15 && dh.includes(m.slice(12))), 'the compose drawer hides the name, masks the number and hides their texts');
    run('document.querySelector = __q; S.compose = null;');
  }
  const mr = { kind: 'market', key: 'mx', type: 'permit', label: 'Roof', address: '1 Fixture Way', city: 'Zachary', date: '2026-11-01', subtype: 'Reroof', description: 'Reroof $350,000 for John Fixture', value: 350000, source: 'EBR permits', source_date: '2026-11-02' };
  const mc = run(`CC.priv = true; pinCard(${JSON.stringify(mr)})`);
  check(!/350,000|John Fixture/.test(mc), 'Market Monitor detail text hides dollars and names');
  const fr2 = JSON.parse(JSON.stringify(ccdata.fresh)); fr2.deals = Object.assign({}, fr2.deals, { state: 'failed', error: 'x', error_text: 'access to this source was refused' });
  run(`CC.data = Object.assign({}, __cc, { fresh: ${JSON.stringify(fr2)}, problems: [Object.assign({ name: 'deals' }, ${JSON.stringify(fr2.deals)})] })`);
  check(/cc-banner/.test(render('map', true)) && /access to this source was refused/.test(render('dash', true)), 'the map pages carry the banner, and read errors show in plain words');
  run('CC.data = __cc');
  run(`S.data = Object.assign({}, __state, { feed_age_minutes: null, feed: Object.assign({}, __state.feed, { generated_at: null }) })`);
  check(run(`CC.local('crm').state`) === 'missing', 'a feed with no build time is never green');
  run('S.data = __state');
  const cm = [{ subject: 'Commission for Fake Chapel', received: ccdata.today, status: 'No closed deal' }, { subject: 'x', received: ccdata.today, status: 'Not processed' }];
  run(`CC.data = Object.assign({}, __cc, { commission_mail: ${JSON.stringify(cm)} })`);
  check(/Commission to check<\/span><b class="cc-num">2</.test(render('dash', true)), 'the Dashboard commission tile counts the same two the nav does');
  run('CC.data = __cc');
}

// Round 3, items 1 and 10: names inside free text hide, and masking never eats a word, a digit or a date.
{
  run('CC.priv = true');
  const sc = t => run(`CC.scrub(${JSON.stringify(t)})`).replace(/&#39;/g, "'");
  check(sc('Ford offer expired Nov 4 9 AM, counter still waiting') === '••• offer expired Nov 4 9 AM, counter still waiting', 'a name that starts a sentence hides, the date stays', sc('Ford offer expired Nov 4 9 AM, counter still waiting'));
  check(sc('KW Command still shows $7,198 off the old list price') === 'KW Command still shows $••• off the old list price', 'a masked dollar amount keeps the space after it');
  check(sc('median list price $285,000, 78 median days') === 'median list price $•••, 78 median days', 'a masked dollar amount never swallows the next number');
  check(sc('Seller countered at $2.8M as is, open until Fri Nov 6 5 PM') === 'Seller countered at $••• as is, open until Fri Nov 6 5 PM', 'a weekday and month are never masked');
  check(sc("FORD check-in: 'how yall been?'") === "FORD check-in: 'how yall been?'", 'an acronym like FORD stays');
  check(sc('Text Jessamyn Quill back about the open house') === 'Text ••• back about the open house', 'a full name the CRM does not know hides as one mask');
  run('CC.priv = false');
  check(sc('Ford offer expired') === 'Ford offer expired', 'with privacy off, free text shows as written');
  run('CC.priv = true');
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
  check(/s-failed[^]*part of it did not load/.test(render('sources', true)), 'Sources shows Market as failed when part of it failed, not Current');
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
  const dp = render('deadlines', true), dd = render('dash', true);
  check(/Without a date<\/span><b class="cc-num">1</.test(dp) && /1 more written without a date/.test(dp) && /Written without a date <span class="cc-count">1/.test(dp), 'Deadlines counts and lists the steps written without a date');
  check(/1 written without a date/.test(dd), 'the Dashboard deadline tile says how many have no date');
  run('CC.data = __cc');
}

// Round 3, item 4: reply-first rows (no template) are not drafts ready.
{
  const ready = run('readyDrafts().length'), all = run('drafts().length'), rep = all - ready;
  const dsh = render('dash', true), q = render('queue', true);
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
  const dp = render('deals', true), cp = render('commission', true);
  const row = (dp.match(/<li class="cc-row[^"]*"><span class="cc-av" aria-hidden="true">⌂<\/span>\s*<div class="cc-row-main"><h3>700 Fixture Rd[^]*?<\/li>/) || [''])[0];
  check(/Offer expired [A-Z][a-z]{2}, Nov 6 5 PM/.test(row) && !/days to close|Closes today/.test(row) && /Act of sale if accepted/.test(row), 'an expired offer says so on Deals, with no days to close');
  check(/Offer expired/.test(cp) && /if accepted/.test(cp), 'Commission shows the expired offer and the act date as if accepted');
  run('CC.data = __cc');
}

// Round 3, item 6: no password-style dots in a form field (iCloud Passwords read them as a login and opened an empty grey
// menu over Phone). A hidden prefilled lead keeps its details out of the boxes and Save still sends them.
{
  run('CC.priv = true; var __lf = null; modal = (t, h, ok) => { __lf = { h, ok }; return Promise.resolve(null); };');
  run('CC.addLead()');
  check(!/<input[^>]*cc-masked/.test(run('__lf.h')), 'Add a lead has no password-style field with privacy on');
  const lead = (ccdata.leads || []).find(l => l.name && l.phone);
  if (lead) {
    run(`CC.leadsTest = ${JSON.stringify(ccdata.leads.indexOf(lead))}; CC.addLead(CC.leadsTest)`);
    const h = run('__lf.h');
    check(!h.includes(run(`esc(${JSON.stringify(lead.name)})`)) && /placeholder="Hidden · press Show at the top to see it"/.test(h), 'a hidden prefilled lead shows a placeholder, not the name or a masked value');
    const v = run('__lf.ok(document)');
    check(v && v.name === lead.name && v.phone === lead.phone.trim(), 'Save still sends the hidden lead details', JSON.stringify(v && { n: !!v.name, p: !!v.phone }));
  }
  check(!/<input[^>]*\$\{maskAttr\(\)\}/.test(appjs) && /type="button" class="send-btn" id="m-ok"/.test(appjs), 'no masked input in the compose drawer, and dialog buttons are not submit buttons');
}

// Round 3, item 7: Tasks explains how the Next_Action tasks are chosen.
check(/How the \d+ from Next_Action are chosen\.<\/b> A contact's Next_Action becomes a task when the contact is hot or warm, is not on Do Not Contact, is not a vendor, agent or lender, and has no open task with the same words\. Hot ones are due today, warm ones in 3 days/.test(render('tasks', true)) || !(f.tasks || []).some(t => !t.task_id), 'Tasks says how the Next_Action tasks are chosen, matching crm.next_action_tasks');

// Round 3, item 8: Touched is a quick form (type and an optional note), and the Dashboard button says what it opens.
{
  run('var __tf = null; modal = (t, h, ok, lbl) => { __tf = { t, h, ok, lbl }; return Promise.resolve(null); }; touchForm("this person");');
  const types = [...run('__tf.h').matchAll(/data-touch="([^"]+)"/g)].map(m => m[1]);
  check(run('__tf.t') === 'Log a touch' && types.join('|') === 'Call|Text|Email|In person|Voicemail' && /aria-pressed="true" aria-checked="true" data-touch="Call"/.test(run('__tf.h')) && /Note \(optional\)/.test(run('__tf.h')), 'Touched opens a quick form: five touch types, Call picked, an optional note');
  const fake = (type, note) => `({ querySelector: s => s.startsWith('[data-touch]') ? { dataset: { touch: ${JSON.stringify(type)} } } : { value: ${JSON.stringify(note)} } })`;
  check(run(`__tf.ok(${fake('Text', '')})`) === 'Text' && run(`__tf.ok(${fake('Voicemail', 'about the inspection')})`) === 'Voicemail: about the inspection', 'the form saves the type, with the note after it when there is one');
  const dsh = render('dash', true);
  check(/onclick="go\('touches'\)">Touches due<\/button>/.test(dsh) && !/>Log a touch</.test(dsh), 'the Dashboard button is named for the page it opens');
}

// Round 3, item 9: the header search behaves the same on every page: typing opens Search, leaving Search clears it.
check(run('CC.SEARCHES_ITSELF.length') === 0 && /if \(S\.q && S\.view !== 'search'\) \{ S\.before = S\.view; S\.view = 'search'; \}/.test(appjs)
  && /function go\(v\) \{ if \(S\.view === 'search' && v !== 'search' && S\.q\) \{ S\.q = ''/.test(appjs), 'typing in the header opens Search from every page, and leaving Search clears the box');
{
  const d0 = run('drafts()[0] || null');
  if (d0 && d0.name) { run(`S.q = ${JSON.stringify(d0.name.split(' ')[0])}`); check(/<h3 class="cc-sub-h">Drafts <span class="cc-count">/.test(run('CC.priv = true; CC.views.search()')), 'Search finds drafts too'); run(`S.q = ''`); }
}

// Round 3, item 11: the permits feed is labelled with its real source and the date of its newest pull, not CRM feed.
{
  const rows = [{ source: 'EBR permits, data.brla.gov 7fq7-8j7r', source_date: '2026-10-27' }, { source: 'EBR permits, data.brla.gov 7fq7-8j7r', source_date: '2026-10-20' }];
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { market: { rows: ${JSON.stringify(rows)}, counts: {} } }) })`);
  const pm = run(`CC.local('permits')`);
  check(pm.source === 'EBR permits, data.brla.gov' && pm.at.startsWith('2026-10-27'), 'the permits source is EBR permits on data.brla.gov, as of its newest pull', JSON.stringify(pm));
  const mon = render('monitor', true);
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
  check(/drawLabels\(farmLabels\);\s*cancelAnimationFrame/.test(mapjs) && !/rgba\(8,22,46/.test(mapjs), 'labels are drawn after the pins, and clusters are not navy');
}

// Round 3, items 13 and 14 and one source line: no scrollbar line under the phone nav, News names its source once at the
// top, and a list page shows its source line once.
{
  const uiPhone = (ui.match(/@media \(max-width: 720px\) \{[^]*?\n\}/) || [''])[0];
  check(/\.side \{ scrollbar-width: none; \} \.side::-webkit-scrollbar \{ display: none;/.test(uiPhone), 'phone: no scrollbar line under the nav strip');
  const nw = render('news', true), srcCount = h => (h.match(/<span class="cc-src /g) || []).length;
  check(/<\/header>[^]*?<p class="cc-srcline"><span class="cc-src/.test(nw) && srcCount(nw) === 1 && /Obituaries and school sports are left out/.test(nw), 'News shows its source and time once, at the top, and says what it leaves out');
  for (const v of ['touches', 'tasks', 'queue', 'sent', 'monitor']) check(srcCount(render(v, true).replace(/<div class="cc-banner"[^]*?<\/div>/, '')) === (v === 'queue' ? 2 : 1), `${v}: one source line, not two`);
}

// Round 3, item 15: no orphan tiles. Tiles sit in 4 columns on a desktop, 2 on a phone, so each page has a multiple of 4.
{
  const counts = views.map(v => [v, (render(v, true).match(/<(?:button|div) [^>]*class="cc-tile"/g) || []).length]).filter(([, n]) => n);
  const odd = counts.filter(([, n]) => n % 4);
  check(!odd.length, 'every tile row is full: each page has a multiple of 4 tiles', odd.map(([v, n]) => `${v}:${n}`).join(' '));
  check(/\.cc-tiles \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/.test(fs.readFileSync(path.join(dir, 'cc.css'), 'utf8')), 'desktop tiles sit in exactly 4 columns');
}

// Round 3, items 15 and 16: one place for the privacy pill, "1 timed event", the Workouts nav label matches its page, and
// lead cards are flat like every other card.
{
  const heads = views.map(v => render(v, true)).map(h => (h.match(/<header class="cc-head">[^]*?<\/header>/) || [''])[0]).filter(Boolean);
  check(heads.length > 10 && heads.every(h => /<p>[^]*?<\/p><span class="cc-privnote">/.test(h)), 'the privacy pill sits under the description on every page');
  const wk = (ccdata.week || [])[0] || {};
  run(`CC.data = Object.assign({}, __cc, { week: [Object.assign({}, ${JSON.stringify(wk)}, { events: 1, hours: 1 })].concat(__cc.week.slice(1)) })`);
  check(/1 timed event\./.test(render('dash', true)), 'Booked today says "1 timed event"');
  run('CC.data = __cc');
  const navLabel = run('NAV').flatMap(g => g[1]).find(i => i[0] === 'health')[2], h1 = (render('health', true).match(/<h1>([^<]+)<\/h1>/) || [])[1];
  check(navLabel === h1, 'the Workouts nav label matches its page title', `${navLabel} / ${h1}`);
  const css2 = ['ui.css', 'cc.css'].map(x => fs.readFileSync(path.join(dir, x), 'utf8')).join('\n');
  check(!/gradient\(/.test(css2), 'no gradient in the page styles, lead cards included');
}

// Round 3: the cache name moves on again so browsers drop the round 2 shell.
check(/pipeline-shell-v4-sendlog/.test(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8')), 'service worker cache is v4-sendlog');
// Reviewer findings on round 3 masking: a client's name hides even when it is also a common word, a lowercase mention
// never makes a name safe, capitals and accents hide, dates read, and ordinary words read on a quiet day.
{
  const people = [{ person_id: 'r1', display: 'Mark Fixture' }, { person_id: 'r2', display: 'Mike Sample' }, { person_id: 'r3', display: 'May Example' }, { person_id: 'r4', display: 'Call Tester' }];
  const tasks = [{ task: 'call mike back about the docs', person_id: 'r2', display: 'Mike Sample' }];
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { generated_at: 'r3-test', people: ${JSON.stringify(people)}, tasks: ${JSON.stringify(tasks)}, touches_due: [], partners: [], new_leads: [] }) }); CC.priv = true;`);
  const sc = t => run(`CC.scrub(${JSON.stringify(t)})`).replace(/&#39;/g, "'");
  check(sc('Mark sent the offer') === '••• sent the offer', 'a client named Mark hides even though mark is a common word');
  check(sc('Mike said yes') === '••• said yes', 'a lowercase mention of a name never makes the name safe to show');
  check(sc('SMITH counter at 5 PM') === '••• counter at 5 PM' && sc('KW and FHA') === 'KW and FHA', 'an all-caps name hides, real acronyms stay');
  check(sc('José asked about the house') === '••• asked about the house', 'an accented name hides whole');
  check(sc('Closing May 5 with May') === 'Closing May 5 with May', 'a month always reads, even with a client named May');
  check(sc('Call before Monday') === 'Call before Monday', 'a task verb that is also a surname stays readable');
  run(`S.data = Object.assign({}, __state, { feed: Object.assign({}, __state.feed, { generated_at: 'r3-empty', people: [], tasks: [], touches_due: [], partners: [], new_leads: [] }) }); CC.data = Object.assign({}, __cc, { deals: [] });`);
  check(sc('Schedule the walkthrough and email the lender') === 'Schedule the walkthrough and email the lender', 'ordinary words read on a quiet day with little text to learn from');
  run('S.data = __state; CC.data = __cc;');
}

// Service worker: a new cache name, HTML and JS from the network every time, and the page reloads once when a new worker takes over.
const swjs = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), indexHtml = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
check(!swjs.includes('pipeline-shell-v1-judge1') && /fetch\(e\.request, \{ cache: 'no-store' \}\)/.test(swjs), 'service worker drops the round-1 shell and skips the browser cache');
check(/updateViaCache: 'none'/.test(indexHtml) && /controllerchange/.test(indexHtml), 'the page picks up a new worker and reloads once');
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
  const dd = render('dash', true);
  check(!/No contract deadlines in this window/.test(dd) && /Contains a date, check it/.test(dd), 'a step whose words hold an unread date is shown as check it, never no deadlines');
  run(`CC.data = Object.assign({}, __cc, { deadlines: Object.assign({}, __cc.deadlines, { d7: [{ deal: '100 Fixture Ln', key: '100 fixture', day: __cc.today, what: 'Inspection', from: 'sheet', time: '11:59PM', said: 'Due diligence ends Nov 10, 11:59 PM' }], check: [] }) })`);
  check(/11:59PM/.test(render('dash', true)) && /Read from the words/.test(render('dash', true)), 'a date read from the words shows its time and where it came from');
  run('CC.data = __cc;');
}

{ // Round 4 item 2: a saved day that no longer matches the Deals sheet is flagged, never shown as growth.
  run(`CC.data = Object.assign({}, __cc, { deltas: { gci: {}, closings: {}, leads7: {}, appts7: {} }, since: {}, history_mismatch: [{ day: '2026-11-05', metrics: ['gci', 'closings'], saved: { gci: 19710, closings: 2 }, sheet_now: { gci: 30377.5, closings: 4 } }] })`);
  const sc = render('scorecard', false);
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
{ const p0 = run('CC.priv'); run('CC.priv = true');
  check(run(`CC.note('Ask about her divorce timeline', ['Pat'])`).includes('Note hidden') && !run(`CC.note('Ask about her divorce timeline')`).includes('divorce'), 'with contacts hidden, a next-step note hides whole');
  const pages = ['touches', 'tasks', 'dash'].map(k => render(k, true).replace(/<[^>]*>/g, ' ')).join(' ');  // what shows on screen
  const notes = ((state.feed || {}).touches_due || []).map(r => r.next_action).filter(t => t && t.length > 12 && !/within the hour/i.test(t));
  check(notes.every(t => !pages.includes(t)), 'no next-step note text shows on Touches due, Tasks or the Dashboard with contacts hidden', notes.filter(t => pages.includes(t)).join(' | '));
  run(`CC.priv = ${p0}`); }

{ const wp = render('health', false);
  check(/of 5<\/small>/.test(wp) && /Goal 5 a week/.test(wp) && /Mon 6 AM, Tue 6 AM, Wed 4 PM, Thu 6 AM, Fri 6 AM, 5 a week/.test(wp) && !/4 to 5/.test(wp), 'Workouts counts his 5-day plan and the goal agrees'); }

// Round 4 layout items. The live check at 390 and 1200 px is done in Chrome; these keep the rules from slipping.
check(/\.cc-ev:has\(> \.cc-chip:first-child\) \{ grid-template-columns: minmax\(0, 1fr\)/.test(ui), 'a row that leads with a badge puts it on its own line, never over the words');
check(/@media \(max-width: 1300px\) \{ \.top \.clock \.date, \.top \.operator \{ display: none; \} \}/.test(ui) && /\.top \.clock \.date, \.top \.clock \.time \{ white-space: nowrap; \}/.test(ui), 'the header clock is one line and the date steps aside below 1300 px');
check(/\.cc-days\.week \{ grid-template-columns: repeat\(auto-fit, minmax\(9\.5rem, 1fr\)\); \}/.test(ui) && /\.cc-list\.tight \.cc-chip \{ white-space: normal/.test(ui), 'calendar week columns grow and wrap instead of cutting titles and badges');
check(/\.side \.nav \{ overflow-x: auto/.test(ui) && /\.side \.brand \{ position: static/.test(ui) && /\.top \{ flex-wrap: nowrap/.test(ui), 'phone: the nav scrolls beside the logo and the header is one row');
{ const dpg = render('deals', true);
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
{ const pages = ['touches', 'tasks', 'queue', 'dash'].map(k => render(k, false)).join(' ');
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
  const dp = render('deals', true);
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
  const dl = render('deadlines', true), ds = render('dash', true), sc = render('scorecard', true);
  check(/Overdue <span class="cc-count">1</.test(dl) && /<span class="cc-chip">Overdue<\/span>/.test(dl) && /1 overdue/.test(ds), 'a contract date that has gone by is an Overdue row on Deadlines and on the Dashboard tile');
  check(/1 invite not accepted, not counted/.test(ds) && /1 more invite not accepted, not counted/.test(sc), 'an invite not accepted is named, never counted as an appointment');
  check(/5 closed with no commission/.test(ds) && /5 closed with no commission on the sheet/.test(sc), 'every GCI tile says when closed deals have no commission');
  run('CC.data = __cc');
  check(/Your note: \$\{C2 \? C2\.note\(/.test(appjs), 'the compose drawer hides your note when contacts are hidden');
  check(/filter\(s => s\.status === 'sent'\)\.length, false\]/.test(appjs) && /dry run\$\{/.test(fs.readFileSync(path.join(dir, 'crm-pages.js'), 'utf8')), 'a dry run is never counted as sent');
  check(/res\.parts \? Object\.keys\(res\.parts\)/.test(fs.readFileSync(path.join(dir, 'cc-sources.js'), 'utf8')), 'Sources counts the rows in each tab, not the tabs');
}

// Round 5: contract words and "Good until" are not names, and a permit's type is public record.
{ run('CC.priv = true');
  const t = run(`CC.scrub('Closing Date extended 1 day by Amendment No. 1. Addendum signed. Good until Mon Nov 9 12 PM. Command has it in Cultivate')`);
  check(!/•••/.test(t), 'contract words, Good until and Command stages stay readable when hidden', t);
  check(/CC\.scrubMoney\(r\.subtype\)/.test(fs.readFileSync(path.join(dir, 'mapviews.js'), 'utf8')), 'a permit type is shown as the public record has it');
  run('CC.priv = false'); }

// Hand-off log: a Text or Email click shows as opened, a confirmed send says who confirmed it, and the app asks.
{ const keep = run('JSON.stringify([S.data.sent_today, S.data.handoff || null, S.data.sent_log || null])');
  const at = new Date().toISOString();
  ctx.__rows = [{ id: 'a1', at, kind: 'text', person_id: '247', display: 'Taylor Sample', to: '+12255550142', text: 'Hey Taylor', status: 'opened', delivery: 'opened', via: 'handoff' },
    { id: 'a2', at, kind: 'email', person_id: '312', display: 'Morgan Demo', to: 'morgan.demo@example.com', subject: 'Checking in', text: 'Hi Morgan', status: 'sent', delivery: 'sent', via: 'handoff', confirmed_by: 'Gmail', sent_at: at, service: 'Gmail' }];
  run(`S.data.sent_today = __rows; S.data.handoff = { messages_ok: false, gmail_ok: null, pending: [{ id: 'a1', at: __rows[0].at, kind: 'text', display: 'Taylor Sample' }] }; S.data.sent_log = { '247': [__rows[0]], '312': [__rows[1]] }`);
  const sp = render('sent', false);
  check(/Opened, waiting for your send/.test(sp) && /answerSent\('a1', true\)/.test(sp) && /answerSent\('a1', false\)/.test(sp), 'Sent today shows an opened text with Sent and Not sent');
  check(/confirmed by Gmail/.test(sp) && (sp.match(/answerSent/g) || []).length === 2, 'a confirmed email says Gmail confirmed it and asks nothing');
  const bar = run(`askSentHTML(S.data.handoff.pending[0])`);
  check(/Did the text to <b>Taylor Sample<\/b> send\?/.test(bar) && />Sent<\/button>/.test(bar) && />Not sent<\/button>/.test(bar), 'the Did that send bar names the person and offers Sent and Not sent');
  run('CC.priv = true'); check(!/Taylor|Sample/.test(run(`askSentHTML(S.data.handoff.pending[0])`)) && !/Hey Taylor|Hi Morgan|2255550142|morgan\.demo/.test(render('sent', true)), 'with privacy on the bar and Sent today hide the name, number and message'); run('CC.priv = false');
  check(/can't read Messages history/.test(render('sources', false)), 'Sources says in one line when Messages history cannot be read');
  check(/SENT FROM PIPELINE/.test(run(`logLines('247')`)) && /opened, waiting for your send/.test(run(`logLines('247')`)) && /confirmed by Gmail/.test(run(`logLines('312')`)) && run(`logLines('999')`) === '', "the compose sheet lists that person's sends");
  check(run(`TEXT_STATES.opened[1]`) === 'Opened' && /api\('\/api\/opened', \{ kind: v\.kind/.test(appjs) && /logOpened\(v\);/.test(appjs), 'Open in Messages and Open in Gmail log the click');
  check(/#sent-ask \{[^}]*background: var\(--cc-ink\)[^}]*border: 1px solid var\(--cc-coral\)/.test(ui) && /#sent-ask small \{ color: var\(--cc-tan\)/.test(ui), 'the bar is black with coral, tan only on the small time');
  ctx.__keep = JSON.parse(keep); run('S.data.sent_today = __keep[0]; S.data.handoff = __keep[1]; S.data.sent_log = __keep[2]'); }

// Round 5, look and flow: the Today list follows the four headline tiles, Touches due pages, A adds a lead, and a tall dialog scrolls.
{ const ds = render('dash', true);
  check(ds.indexOf('GCI this year') < ds.indexOf('cc-todaycard') || ds.indexOf('GCI this year') < ds.indexOf('Under contract</span>') && ds.split('class="cc-tiles"').length === 3, 'the Dashboard shows four headline tiles, then Today, then the rest');
  check(/e\.key === 'a' && window\.CC && CC\.addLead/.test(appjs) && /<kbd>A<\/kbd> to add a lead/.test(appjs), 'the A key adds a lead and the shortcuts list says so');
  check(/Show 200 more/.test(fs.readFileSync(path.join(dir, 'crm-pages.js'), 'utf8')), 'Touches due can load more than the first 200');
  check(/\.modal \.dbody \{ overflow-y: auto; min-height: 0; \}/.test(ui) && /\.k-inspection, \.k-finance, \.cc-ev\.k-inspection, \.cc-ev\.k-finance \{ --k: #e87757/.test(ui) && /\.st-appointment \{ --st: var\(--cc-tan\); \}/.test(ui), 'a tall dialog scrolls, deadlines are one color, an active listing is tan');
  check(/, pulled ' \+ C\.day\(m\.gbrar\.pulled\)/.test(fs.readFileSync(path.join(dir, 'cc-life.js'), 'utf8')), 'the GBRAR tiles say when the numbers were pulled'); }

check(/strip = \$\('#nav'\)/.test(appjs) && /strip\.scrollLeft \+=/.test(appjs), 'the phone nav strip scrolls to the page you are on');
check(/@media \(max-width: 720px\) \{ \.cc-tiles \{ grid-template-columns: 1fr 1fr;/.test(ui) && /\.cc-kpi > footer \{ margin-top: auto; \}/.test(ui), 'phone tiles sit two to a row and Scorecard cards line up');

console.log(`\n${fails} failure(s)`);
process.exit(fails ? 1 : 0);
