// Map page, Market Monitor page and the deals map toggle. Contract: aire/map-crm/CONTRACT.md, "What is on the screen".
// Reads feed.map and feed.market (aire/crm/FEED.md). Every write goes through app.py to crm.py, same as the rest.
S.mapF = { bands: ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold', ''], partners: false, owes: false, quiet: 0, stage: '', farm: '', people: true, deals: false, market: false, base: 'paper' };
S.mapPanel = '';  // '', 'filters' or 'lists': what is open over the map besides a person's card
S.mktF = { type: 'all', label: '', farm: '', near: false };
S.dealsMode = 'list';
S.mapView = null; S.pick = '';

// A value inside an inline handler: JSON-quoted, then HTML-escaped, so an apostrophe or a quote stays inside the string.
const jsa = v => esc(JSON.stringify(String(v ?? '')));
const BAND_NAMES = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold', ''];
const PARTNER = new Set(['agent', 'lender', 'vendor']);
function mapFeed() { return feed().map || { pins: [], counts: {}, farms: [] }; }
function farmsList() { return (S.data && S.data.farms) || []; }
function farmById(id) { return farmsList().find(f => f.id === id); }
function farmOf(lat, lng) { if (lat == null || lng == null) return ''; const f = farmsList().find(f => PMap.inPolygon(lat, lng, f.polygon)); return f ? f.id : ''; }
function farmName(id) { const f = farmById(id); return f ? f.name : id || ''; }
function marketRows() { return ((feed().market || {}).rows || []).map(r => ({ ...r, key: 'market:' + r.id, farm: farmOf(r.lat, r.lng) || r.farm || '' })); }
function inBounds(p, b) { return b && p.lat <= b.north && p.lat >= b.south && p.lng >= b.west && p.lng <= b.east; }

function peoplePins() {
  const f = S.mapF, farm = farmById(f.farm);
  return (mapFeed().pins || []).filter(p => p.kind === 'person'
    && f.bands.includes(p.band || '')
    && (f.partners || !PARTNER.has(p.type))
    && (!f.owes || p.owes_reply)
    && (!f.quiet || p.days_quiet == null || p.days_quiet > f.quiet)
    && (!f.stage || (p.stage || '') === f.stage)
    && (!farm || PMap.inPolygon(p.lat, p.lng, farm.polygon))
    && matches(`${p.display} ${p.phone} ${p.email} ${p.address || ''} ${p.city || ''} ${p.next_action}`));
}
// Deal pins are placed from the CRM's geocoded Deals tab, but their status, price and act of sale are the Deals sheet's.
const SHEET_TO_PIN = { contract: 'under_contract', closed: 'closed', out: 'lost', appointment: 'active', offer: 'showing', other: 'lead' };
function dealPins() {
  return (mapFeed().pins || []).filter(p => p.kind === 'deal' && matches(`${p.address} ${p.display} ${p.stage}`)).map(p => {
    const s = CC.sheetDeal(p.address);
    return s ? { ...p, sheet: s, stage: SHEET_TO_PIN[s.stage] || p.stage } : { ...p, sheet: null };
  }).filter(p => (p.sheet ? !['closed', 'out'].includes(p.sheet.stage) : !['closed', 'lost', 'fell_through'].includes(p.stage)));
}
function marketPins() { const farm = farmById(S.mapF.farm); return marketRows().filter(r => r.lat != null && (!farm || PMap.inPolygon(r.lat, r.lng, farm.polygon))); }
function mapData(dealsOnly) {
  const f = S.mapF;
  return { pins: !dealsOnly && f.people ? peoplePins() : [], deals: dealsOnly || f.deals ? dealPins() : [], market: !dealsOnly && f.market ? marketPins() : [],
    farms: dealsOnly ? [] : farmsList(), farm: f.farm, selected: S.pick };
}

// ---------------------------------------------------------------- the map panel
function mapPanel() {
  return `<div class="map-wrap"><div id="pmap"></div><aside class="map-side" id="map-side"></aside></div>`;
}
// Filters sit behind one quiet button. Stage is the map's language, so it comes first. Cadence is a filter in words only.
function mapTools() {
  const f = S.mapF, stages = [...new Set((mapFeed().pins || []).filter(p => p.kind === 'person').map(p => p.stage || ''))].filter(Boolean).sort((a, b) => (Stage.names.indexOf(a) + 99) % 99 - (Stage.names.indexOf(b) + 99) % 99);
  const t = (on, label, js) => `<button type="button" class="cc-filter" aria-pressed="${on}" onclick="${js}">${label}</button>`;
  const cap = b => (b ? b[0].toUpperCase() + b.slice(1) : 'No cadence');
  return `<div class="map-tools">
    <div class="cc-selects">
      <label>Stage <select onchange="mapSet('stage', this.value)"><option value="">Every stage</option>${stages.map(s => `<option ${f.stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <label>Quiet <select onchange="mapSet('quiet', Number(this.value))">${[[0, 'Any'], [30, '30 days or more'], [90, '90 days or more'], [180, '180 days or more'], [365, 'A year or more']].map(([v, l]) => `<option value="${v}" ${f.quiet === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Area <select onchange="mapSet('farm', this.value)"><option value="">All areas</option>${farmsList().map(x => `<option value="${esc(x.id)}" ${f.farm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    </div>
    <div class="cc-filters" role="group" aria-label="Layers">${t(f.people, 'People', "mapFlag('people')")}${t(f.deals, 'Deals', "mapFlag('deals')")}${t(f.market, 'Market signals', "mapFlag('market')")}${t(f.partners, 'Partners', "mapFlag('partners')")}${t(f.owes, 'Owe a reply', "mapFlag('owes')")}</div>
    <div class="cc-filters" role="group" aria-label="Cadence">${BAND_NAMES.map(b => t(f.bands.includes(b), cap(b), `mapBand('${b}')`)).join('')}</div>
    <div class="cc-filters" role="group" aria-label="Surface">${t(f.base === 'paper', 'Pipeline map', "mapBase('paper')")}${t(f.base === 'sat', 'Satellite', "mapBase('sat')")}</div>
  </div>`;
}
function mapBar() {
  const b = (k, label) => `<button type="button" aria-pressed="${S.mapPanel === k}" onclick="mapOpen('${k}')">${label}</button>`;
  return `<button type="button" onclick="drawFarm()">Draw farm</button><button type="button" onclick="mapFit()">Fit</button>${b('filters', 'Filters')}${b('lists', 'Lists and farms')}`;
}
function mapOpen(k) { S.mapPanel = S.mapPanel === k ? '' : k; if (k === 'lists') { S.pick = ''; if (S.map) S.map.setData({ selected: '' }); } mapUpdate(); }
// The legend: the same seven colors as everywhere else. A stone dot only shows when someone on the map has no such stage.
function mapLegend() {
  const other = peoplePins().some(p => !Stage.is(p.stage));
  return `<h4>Pins by stage</h4><ul>${Stage.names.map(s => `<li><i class="stg-dot ${Stage.cls(s)}"></i>${esc(s)}</li>`).join('')}${other ? '<li><i class="stg-dot stg-none"></i>another stage, or none</li>' : ''}</ul>`;
}
function viewMap() {
  const ok = S.data && S.data.feed_ok, n = peoplePins().length;
  return `<div class="cc-page cc-wide lt-page lt-map"><h1 class="sr">Map</h1>${ok ? `<div class="map-stage"><div id="pmap"></div>
      <div class="map-bar" id="map-bar">${mapBar()}</div>
      <div class="map-meta"><span id="map-n">${n.toLocaleString()} people across the market</span></div>
      <div class="map-filters" id="map-tools" ${S.mapPanel === 'filters' ? '' : 'hidden'}>${mapTools()}</div>
      <aside class="map-side" id="map-side" hidden></aside>
      <div class="map-legend" id="map-legend">${mapLegend()}</div></div>`
    : CC.empty('The CRM feed did not load, so the map would be a guess. Nothing is shown. Sources has the detail.')}
    <p class="cc-srcline lt-src">${CC.src('crm')}<span class="lt-count">${CC.peopleLine()}</span></p></div>`;
}
function viewDealMap() {
  return CC.crmPage('Deals on the map', 'Open deals from the AIRE Deals sheet, placed by street address. Status, price and act of sale are the sheet\'s, the same as the Deals page.',
    mapPanel(true), ['crm'], '<div class="cc-acts"><button type="button" onclick="go(\'deals\')">Back to the deal list</button></div>').replace('class="cc-page"', 'class="cc-page cc-wide"');
}
function mountMap(dealsOnly) {
  const el = $('#pmap'); if (!el) return;
  if (S.map) S.map.destroy();
  S.mapDealsOnly = !!dealsOnly;
  S.map = PMap.create(el, { view: S.mapView, base: S.mapF.base, onMove: v => { S.mapView = v; renderMapSide(); }, onPick: p => { S.pick = p ? p.key : ''; S.map.setData({ selected: S.pick }); renderMapSide(); } });
  const d = mapData(dealsOnly); S.map.setData(d);
  // The people map opens on the home market. The deals map frames the deals. Fit still shows everyone.
  if (!S.mapView) { const pts = dealsOnly ? homeArea(d.deals.map(p => [p.lat, p.lng])) : PMap.HOME; if (pts.length) S.map.fit(pts, 13); }
  renderMapSide();
}
// The first view frames where most people are: within about 100 miles of the median pin, so a handful of
// out-of-state contacts do not zoom the map out to the whole country. FIT still shows everyone.
function homeArea(pts) {
  if (pts.length < 5) return pts;
  const mid = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const lat = mid(pts.map(p => p[0])), lng = mid(pts.map(p => p[1]));
  const near = pts.filter(p => Math.abs(p[0] - lat) < 1.5 && Math.abs(p[1] - lng) < 1.7);
  return near.length >= pts.length / 2 ? near : pts;
}
function mapUpdate() {
  const tools = $('#map-tools'); if (tools) { tools.innerHTML = mapTools(); tools.hidden = S.mapPanel !== 'filters'; }
  const bar = $('#map-bar'); if (bar) bar.innerHTML = mapBar();
  const lg = $('#map-legend'); if (lg) lg.innerHTML = mapLegend();
  const mn = $('#map-n'); if (mn) mn.textContent = `${peoplePins().length.toLocaleString()} people across the market`;
  if (S.map) S.map.setData(mapData(S.mapDealsOnly));
  renderMapSide();
}
function mapBand(b) { const s = new Set(S.mapF.bands); s.has(b) ? s.delete(b) : s.add(b); S.mapF.bands = BAND_NAMES.filter(x => s.has(x)); mapUpdate(); }
function mapFlag(k) { S.mapF[k] = !S.mapF[k]; mapUpdate(); }
function mapSet(k, v) { S.mapF[k] = v; mapUpdate(); if (k === 'farm' && v && S.map) { const f = farmById(v); if (f) S.map.fit(f.polygon, 16); } }
function mapBase(b) { S.mapF.base = b; if (S.map) S.map.setBase(b); mapUpdate(); }
function mapFit() { const d = mapData(S.mapDealsOnly); const pts = d.pins.concat(d.deals, d.market).map(p => [p.lat, p.lng]); if (S.map && pts.length) S.map.fit(pts, 15); }
function showOnMap(key) {
  const r = marketRows().find(x => x.key === key); if (!r || r.lat == null) return;
  S.mapF.market = true; S.pick = key; S.mapView = { center: [r.lat, r.lng], zoom: 16 }; go('map');
}

// ---------------------------------------------------------------- side panel: the card, or what is in view
function renderMapSide() {
  const el = $('#map-side'); if (!el) return;
  const all = (mapFeed().pins || []).concat(marketRows());
  const p = S.pick && all.find(x => x.key === S.pick);
  // The deals map keeps its side column. On the people map the card floats over the map, and only when asked for.
  const html = p ? pinCard(p) : S.mapDealsOnly || S.mapPanel === 'lists' ? inViewSummary() : '';
  el.innerHTML = html; el.hidden = !html;
}
const lastTouch = p => (p.days_quiet == null ? 'never logged' : p.days_quiet === 0 ? 'today' : `${p.days_quiet} day${p.days_quiet === 1 ? '' : 's'} ago`);
function pinCard(p) {
  const x = `<button class="x" onclick="S.pick='';S.map&&S.map.setData({selected:''});renderMapSide()">×</button>`;
  if (p.kind === 'person') {
    // Name, stage as its color chip, cadence as a word, then the facts. Compose and Note open the same sheets as before.
    const id = jsa(p.person_id), row = `personListRow(pinByKey(${jsa(p.key)}))`;
    return `<div class="pin-card pc-person">${x}<h3>${CC.who(p.display)}</h3>${Stage.chip(p.stage)}
      <p class="pc-cad">${Stage.cadence(p.band) || 'no cadence set'}${p.owes_reply ? ' · you owe a reply' : ''}${p.new_lead ? ' · new lead' : ''}</p>
      <dl><dt>Type</dt><dd>${esc(p.type || 'unknown')}</dd><dt>Last touch</dt><dd>${esc(lastTouch(p))}</dd>
      <dt>Next</dt><dd>${p.next_action ? CC.note(p.next_action, [p.display]) : 'none'}</dd><dt>Address</dt><dd>${CC.priv ? '<span class="cc-hid">hidden</span>' : esc([p.address, p.city, p.zip].filter(Boolean).join(', ') || 'none')}</dd></dl>
      <div class="pc-main"><button type="button" class="pc-compose" onclick="openCompose(${id})">Compose</button><button type="button" onclick="openNote(${id})">Note</button></div>
      <div class="pc-more">${normPhone(p.phone) ? `<button type="button" onclick="openGrok(${id}, 'call')" title="Grok places the call. Nothing dials until you tap the Call card in Grok.">Call</button>` : ''}<button type="button" onclick="touched(${id})">Touched</button><button type="button" onclick="openTask(${id})">Task</button><button type="button" onclick="addToList('call', [${row}])">Call list</button><button type="button" onclick="addToList('postcards', [${row}])">Postcards</button></div></div>`;
  }
  if (p.kind === 'deal') {
    const s = p.sheet || CC.sheetDeal(p.address);
    return `<div class="pin-card"><div class="pc-h"><span class="ico">⌂</span><div><b>${esc(s ? s.deal : p.address)}</b><small><span class="tag violet">${esc(s ? s.status : 'Only in the CRM Deals tab')}</span><span>${esc((s && s.side) || p.side || '')}</span></small></div>${x}</div>
      <dl>${s ? `<dt>Price</dt><dd>${CC.m(s.price)}</dd><dt>Act of sale</dt><dd>${s.act ? esc(CC.day(s.act)) : 'No date on the sheet'}</dd>` : ''}<dt>Client</dt><dd>${p.display ? CC.who(p.display) : 'none'}</dd><dt>Last event</dt><dd>${CC.scrub(p.last_event || 'none', [p.display])}${p.last_event_at ? ' · ' + esc(p.last_event_at.slice(0, 10)) : ''}</dd></dl>
      <div class="acts"><button class="primary" onclick="openDeal(${jsa(p.address)})">✎ Edit deal</button>${p.person_id ? `<button onclick="openCompose(${jsa(p.person_id)})">✉ Compose</button>` : ''}</div></div>`;
  }
  return `<div class="pin-card"><div class="pc-h"><span class="ico">◆</span><div><b>${esc(p.address)}</b><small><span class="tag ${p.type === 'permit' ? 'warn' : 'live'}">${esc(p.label)}</span><span>${esc(p.city)}</span></small></div>${x}</div>
    ${marketDetail(p)}<div class="acts">${marketActs(p)}</div></div>`;
}
function pinByKey(k) { return (mapFeed().pins || []).find(p => p.key === k); }
function inViewSummary() {
  const b = S.map && S.map.bounds(), d = mapData(S.mapDealsOnly);
  const people = d.pins.filter(p => inBounds(p, b)), deals = d.deals.filter(p => inBounds(p, b)), mkt = d.market.filter(p => inBounds(p, b));
  const by = {}; people.forEach(p => { by[p.band || ''] = (by[p.band || ''] || 0) + 1; });
  if (S.mapDealsOnly) return `<div class="in-view"><h4>IN VIEW</h4><div class="iv-n"><div><b>${deals.length}</b><small>deals</small></div></div>
    <p class="dim">${d.deals.length - deals.length ? `${d.deals.length - deals.length} more off screen. ` : ''}Click a house for the deal card. Same deals and numbers as the Deals page.</p></div>`;
  const scope = S.mapF.farm ? farmName(S.mapF.farm) : 'in view';
  const farms = `<h4>FARMS</h4>${farmsList().length ? `<div class="farm-list">${farmsList().map(f => {
    const n = (mapFeed().pins || []).filter(p => p.kind === 'person' && PMap.inPolygon(p.lat, p.lng, f.polygon));
    const fb = {}; n.forEach(p => { fb[p.band || ''] = (fb[p.band || ''] || 0) + 1; });
    const sig = marketRows().filter(r => r.lat != null && PMap.inPolygon(r.lat, r.lng, f.polygon)).length;
    return `<div class="farm ${S.mapF.farm === f.id ? 'on' : ''}"><button class="fname" onclick="mapSet('farm', S.mapF.farm === ${jsa(f.id)} ? '' : ${jsa(f.id)})">${esc(f.name)}</button><span>${n.length} known · ${sig} signals</span>
      <span>${BAND_NAMES.filter(b => fb[b]).map(b => `${b || 'no cadence'} ${fb[b]}`).join(' · ')}</span><button class="x" title="Delete farm" onclick="deleteFarm(${jsa(f.id)})">×</button></div>`;
  }).join('')}</div>` : '<p class="dim">No farms yet. Draw one around a neighborhood you work.</p>'}`;
  return `<div class="in-view">${S.mapDealsOnly ? '' : `<button class="x" onclick="S.mapPanel = ''; mapUpdate()" aria-label="Close">×</button>`}<h4>${esc(scope.toUpperCase())}</h4>
    <div class="iv-n"><div><b>${people.length.toLocaleString()}</b><small>people</small></div><div><b>${deals.length}</b><small>deals</small></div><div><b>${mkt.length}</b><small>signals</small></div></div>
    <p class="dim">${BAND_NAMES.filter(b => by[b]).map(b => `${b || 'no cadence'} ${by[b]}`).join(' · ')}</p>
    ${`<div class="acts"><button onclick="listFromView('call')">☎ Call list · ${people.filter(p => p.phone).length}</button><button onclick="listFromView('postcards')">✉ Postcards · ${people.filter(p => p.address).length + mkt.length}</button></div>
    <p class="dim">Lists take the people ${S.mapF.farm ? 'in this farm' : 'in view'} with the filters above. The list file stays on the Mac.</p>`}
    ${farms}
    <p class="dim">Click a pin for the card. Partners are hidden until you turn them on in Filters.</p></div>`;
}

// ---------------------------------------------------------------- farms
async function drawFarm() {
  if (!S.map) return;
  if (S.map.drawing()) { S.map.cancelDraw(); return; }
  const name = await ask('Draw a farm', 'Name this farm', 'Southdowns'); if (!name) return;
  toast('ok', 'DRAW', 'Click the map to place corners. Double-click to finish, Esc to cancel.');
  S.map.startDraw(async pts => {
    if (!pts) { toast('warn', 'DRAW', 'Farm not saved.'); return; }
    const farms = farmsList().concat([{ name, polygon: pts }]);
    const r = await act('/api/farms', { farms }, { tag: 'FARM', text: `${name} saved. The feed is rebuilding with it.` });
    if (r) { const f = farmsList().find(x => x.name === name); if (f) S.mapF.farm = f.id; mapUpdate(); }
  });
}
async function deleteFarm(id) {
  const f = farmById(id); if (!f) return;
  const ok = await modal(`Delete ${esc(f.name)}?`, '<p style="margin:0">Only the outline is removed. Nobody in the CRM changes.</p>', () => true, 'Delete farm');
  if (!ok) return;
  if (S.mapF.farm === id) S.mapF.farm = '';
  await act('/api/farms', { farms: farmsList().filter(x => x.id !== id) }, { tag: 'FARM', text: `${f.name} deleted` });
}

// ---------------------------------------------------------------- lists out
function personListRow(p) { return { kind: 'person', person_id: p.person_id, display: p.display, phone: p.phone, email: p.email, address: p.address, city: p.city, state: 'LA', zip: p.zip, why: S.mapF.farm ? farmName(S.mapF.farm) : 'map' }; }
function marketListRow(r) { return { kind: 'market', person_id: '', display: 'Current resident', phone: '', email: '', address: r.address, city: r.city, state: r.state || 'LA', zip: r.zip, why: `${r.label} ${r.date} · ${r.source}` }; }
function listFromView(kind) {
  const b = S.map && S.map.bounds(), d = mapData(false), inScope = p => S.mapF.farm || inBounds(p, b);
  const rows = d.pins.filter(inScope).map(personListRow).concat(kind === 'postcards' ? d.market.filter(inScope).map(marketListRow) : []);
  addToList(kind, rows);
}
async function addToList(kind, rows) {
  if (!rows.length) { toast('warn', 'LIST', 'Nobody to add.'); return; }
  const r = await api('/api/list', { kind, rows });
  if (!r.ok) { toast('err', 'LIST', r.error); return; }
  const why = kind === 'call' ? 'no phone' : 'no address';
  toast('ok', kind === 'call' ? 'CALL LIST' : 'POSTCARDS', `${r.result.added} added, ${r.result.total} on today's list${r.result.skipped ? `, ${r.result.skipped} skipped (already on it or ${why})` : ''}`);
}

// ---------------------------------------------------------------- market monitor
function marketDetail(r) {
  const amt = r.type === 'permit' ? (r.value ? `${CC.m(r.value)} project` : 'no value given') : r.price ? CC.m(r.price) + (r.price_was ? ` (was ${CC.m(r.price_was)})` : '') : 'no price given';
  const near = r.nearest && r.nearest.person_id ? `<a href="#" onclick="S.pick=${jsa('person:' + r.nearest.person_id)};S.mapView={center:[${r.lat},${r.lng}],zoom:15};go('map');return false">${CC.who(r.nearest.display)}</a> · ${esc(r.nearest.band || 'no band')} · ${r.nearest.miles} mi` : 'nobody you know within 2 miles';
  return `<dl><dt>When</dt><dd>${esc(r.date)} · ${CC.scrubMoney(r.subtype || r.label)}</dd><dt>Amount</dt><dd>${amt}</dd>${r.description && r.description !== r.subtype ? `<dt>Detail</dt><dd>${CC.scrub(r.description)}</dd>` : ''}
    <dt>Farm</dt><dd>${esc(farmName(r.farm) || 'outside your farms')}</dd><dt>Nearest</dt><dd>${near}</dd><dt>Source</dt><dd>${esc(r.source)} · ${esc(r.source_date)}${r.source_ref ? ' · #' + esc(r.source_ref) : ''}</dd></dl>`;
}
function marketActs(r) {
  return `<button type="button" class="cc-primary" onclick="makeLead(${jsa(r.key)})">＋ Make lead</button><button type="button" onclick="makeDeal(${jsa(r.key)})">Make deal</button><button type="button" onclick="addToList('postcards', [marketListRow(mktByKey(${jsa(r.key)}))])">Postcard</button>${r.lat != null && S.view !== 'map' ? `<button type="button" onclick="showOnMap(${jsa(r.key)})">Map</button>` : ''}<button type="button" class="cc-danger" title="Dismiss, never shown again" onclick="dismissRow(${jsa(r.key)})">Dismiss</button>`;
}
function mktByKey(k) { return marketRows().find(r => r.key === k); }
function viewMarket() {
  const f = S.mktF, all = marketRows();
  const labels = [...new Set(all.map(r => r.label))].sort();
  let rows = all.filter(r => matches(`${r.address} ${r.city} ${r.label} ${r.subtype} ${r.description} ${(r.nearest || {}).display || ''}`));
  if (f.type === 'permit') rows = rows.filter(r => r.type === 'permit'); else if (f.type === 'mls') rows = rows.filter(r => r.type !== 'permit');
  if (f.label) rows = rows.filter(r => r.label === f.label);
  if (f.farm === '_in') rows = rows.filter(r => r.farm); else if (f.farm) rows = rows.filter(r => r.farm === f.farm);
  if (f.near) rows = rows.filter(r => r.nearest && r.nearest.person_id);
  const t = (on, l, js) => `<button type="button" class="cc-filter" aria-pressed="${on}" onclick="${js}">${l}</button>`;
  const mc = (feed().market || {}).counts || {}, permits = (mc.by_type || {}).permit || 0;
  const tools = `<div class="cc-filters">${t(f.type === 'all', 'All', "mktSet('type','all')")}${t(f.type === 'permit', `Permits <b>${permits}</b>`, "mktSet('type','permit')")}${t(f.type === 'mls', `Listings <b>${all.length - permits}</b>`, "mktSet('type','mls')")}${t(f.near, 'Near someone I know', "mktSet('near',!S.mktF.near)")}</div>
    <div class="cc-selects"><label>Kind <select onchange="mktSet('label', this.value)"><option value="">Every kind</option>${labels.map(l => `<option ${f.label === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label>Area <select onchange="mktSet('farm', this.value)"><option value="">All areas</option><option value="_in" ${f.farm === '_in' ? 'selected' : ''}>Inside any farm</option>${farmsList().map(x => `<option value="${esc(x.id)}" ${f.farm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>`;
  const body = rows.length ? `<ul class="cc-rows">${rows.slice(0, 300).map(r => `<li class="cc-row"><span class="cc-av" aria-hidden="true">${r.type === 'permit' ? '⚒' : '◆'}</span>
    <div class="cc-row-main"><h3>${esc(r.address)}</h3>
      <div class="cc-pills"><span class="cc-pill ${r.type === 'permit' ? 'k-listing' : 'k-closing'}">${esc(r.label)}</span><span class="cc-pill k-other">${esc(r.city)}</span>${r.farm ? `<span class="cc-pill k-other">${esc(farmName(r.farm))}</span>` : ''}</div>
      <p class="cc-row-why">${r.type === 'permit' ? (r.value ? CC.m(r.value) + ' · ' : '') + CC.scrubMoney(r.subtype) : (r.price ? CC.m(r.price) : 'No price given') + (r.price_was ? ` · was ${CC.m(r.price_was)}` : '')}</p>
      <p class="cc-note">${esc(C_day(r.date))}${r.nearest && r.nearest.person_id ? ` · ${r.nearest.miles} mi from ${CC.who(r.nearest.display)}` : ''} · ${esc(r.source)}, ${esc(C_day(r.source_date))}</p></div>
    <div class="cc-acts">${marketActs(r)}</div></li>`).join('')}</ul>${rows.length > 300 ? `<p class="cc-note">Showing the newest 300 of ${rows.length}.</p>` : ''}`
    : S.q ? CC.noMatch() : CC.empty(all.length ? 'Nothing matches these filters.' : 'No permits or listing changes in the last read.');
  return CC.crmPage('Listings and permits', `New listings, price changes and building permits near your farms, newest first. ${rows.length} shown.${all.length - permits ? '' : ' Listings 0 means no Flexmls alert rows are in this feed. That is no listing data, not a quiet market.'}`, body, ['permits'], tools);
}
const C_day = k => (k && /^\d{4}-\d{2}-\d{2}/.test(k) ? CC.day(k.slice(0, 10)) : k || '');
function mktSet(k, v) { S.mktF[k] = v; render(); }
async function makeLead(key) {
  const r = mktByKey(key); if (!r) return;
  const what = r.type === 'permit' ? `${r.label} permit` : r.label;
  const v = await modal('Make lead', `
    <div class="field"><label>NAME</label><input id="m-name" ${CC.priv && r.owner ? 'placeholder="Owner name hidden · press Show to see it"' : `value="${esc(r.owner || 'Owner at ' + r.address)}"`}></div>
    <div class="field"><label>PHONE (optional)</label><input id="m-phone" placeholder="if you have it"></div>
    <div class="field"><label>EMAIL (optional)</label><input id="m-email"></div>
    <div class="field"><label>NOTE</label><input id="m-note" value="${esc(`${what} ${r.date}, ${r.address}, ${r.city}. ${r.source} ${r.source_date}`)}"></div>
    <p class="dim" style="margin:4px 0 0">Goes in as band warm, Stage new lead, Source "Market Monitor ${esc(r.type)} ${esc(r.date)}". Refused if the name, phone or email is already in the CRM.</p>`,
    m => ({ name: $('#m-name', m).value.trim() || (CC.priv && r.owner ? r.owner : ''), phone: $('#m-phone', m).value.trim(), email: $('#m-email', m).value.trim(), note: $('#m-note', m).value.trim() }) , 'Make lead');
  if (!v || !v.name) return;
  await act('/api/lead', { ...v, source: `Market Monitor ${r.type} ${r.date}` }, { tag: 'LEAD', text: `${CC.priv ? 'The lead' : v.name} is in the CRM as a new lead` });
}
async function makeDeal(key) {
  const r = mktByKey(key); if (!r) return;
  const ok = await modal('Make deal', `<p style="margin:0">Add <b>${esc(r.address)}</b> to Deals at stage lead, with the event "Market Monitor ${esc(r.type)} ${esc(r.date)}".</p>`, () => true, 'Add deal');
  if (!ok) return;
  await act('/api/deal', { address: r.address, create: true, stage: 'lead', event: `Market Monitor ${r.type} ${r.date}` }, { tag: 'DEAL', text: `${r.address} · lead` });
}
async function dismissRow(key) {
  const r = mktByKey(key); if (!r) return;
  const res = await api('/api/dismiss', { id: r.id });
  if (!res.ok) { toast('err', 'DISMISS', res.error); return; }
  toast('ok', 'DISMISSED', `${r.address} hidden. Nothing in the CRM changed.`);
  if (S.pick === key) S.pick = '';
  await load();
}

// Register the map pages with the Command Center router; the map mounts after the page is on screen.
Object.assign(CC.views, { map: viewMap, dealmap: viewDealMap, monitor: viewMarket });
Object.assign(CC.after, { map: () => mountMap(false), dealmap: () => mountMap(true) });
