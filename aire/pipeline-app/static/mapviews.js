// Map page, Market Monitor page and the deals map toggle. Contract: aire/map-crm/CONTRACT.md, "What is on the screen".
// Reads feed.map and feed.market (aire/crm/FEED.md). Every write goes through app.py to crm.py, same as the rest.
S.mapF = { bands: ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold', ''], partners: false, owes: false, quiet: 0, stage: '', farm: '', people: true, deals: true, market: false, base: 'street' };
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
function dealPins() { return (mapFeed().pins || []).filter(p => p.kind === 'deal' && matches(`${p.address} ${p.display} ${p.stage}`)); }
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
function mapTools() {
  const f = S.mapF, stages = [...new Set((mapFeed().pins || []).filter(p => p.kind === 'person').map(p => p.stage || ''))].filter(Boolean).sort();
  const t = (on, label, js, cls = '') => `<button class="${on ? 'on' : ''} ${cls}" onclick="${js}">${label}</button>`;
  return `<div class="map-tools">
    <div class="filters">${BAND_NAMES.map(b => t(f.bands.includes(b), (b || 'no band').toUpperCase(), `mapBand('${b}')`, 'b-' + (b || 'none'))).join('')}</div>
    <div class="filters">${t(f.people, 'PEOPLE', "mapFlag('people')")}${t(f.deals, '⌂ DEALS', "mapFlag('deals')")}${t(f.market, '◆ MARKET', "mapFlag('market')")}${t(f.partners, 'PARTNERS', "mapFlag('partners')")}${t(f.owes, 'OWE A REPLY', "mapFlag('owes')")}</div>
    <div class="filters">
      <select onchange="mapSet('quiet', Number(this.value))">${[[0, 'any quiet'], [30, 'quiet 30d+'], [90, 'quiet 90d+'], [180, 'quiet 180d+'], [365, 'quiet 1y+']].map(([v, l]) => `<option value="${v}" ${f.quiet === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select onchange="mapSet('stage', this.value)"><option value="">any stage</option>${stages.map(s => `<option ${f.stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select onchange="mapSet('farm', this.value)"><option value="">all areas</option>${farmsList().map(x => `<option value="${esc(x.id)}" ${f.farm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    </div>
    <div class="filters">${t(f.base === 'street', 'STREET', "mapBase('street')")}${t(f.base === 'sat', 'SATELLITE', "mapBase('sat')")}<button onclick="mapFit()">⤢ FIT</button><button class="draw" onclick="drawFarm()">✎ DRAW FARM</button></div>
  </div>`;
}
function viewMap() {
  const c = mapFeed().counts || {};
  const right = `${(c.persons || 0).toLocaleString()} people · ${c.deals || 0} deals pinned${c.ungeocoded_contacts ? ` · ${c.ungeocoded_contacts.toLocaleString()} not geocoded yet` : ''}`;
  return `<div class="view map-view">${panel(0, 'Map', right, `<div id="map-tools">${mapTools()}</div>${mapPanel(false)}`)}</div>`;
}
function mountMap(dealsOnly) {
  const el = $('#pmap'); if (!el) return;
  if (S.map) S.map.destroy();
  S.mapDealsOnly = !!dealsOnly;
  S.map = PMap.create(el, { view: S.mapView, base: S.mapF.base, onMove: v => { S.mapView = v; renderMapSide(); }, onPick: p => { S.pick = p ? p.key : ''; S.map.setData({ selected: S.pick }); renderMapSide(); } });
  const d = mapData(dealsOnly); S.map.setData(d);
  if (!S.mapView) { const pts = (dealsOnly ? d.deals : d.pins.concat(d.deals)).map(p => [p.lat, p.lng]); if (pts.length) S.map.fit(pts, 13); }
  renderMapSide();
}
function mapUpdate() {
  const tools = $('#map-tools'); if (tools) tools.innerHTML = mapTools();
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
  el.innerHTML = p ? pinCard(p) : inViewSummary();
}
function pinCard(p) {
  const x = `<button class="x" onclick="S.pick='';S.map&&S.map.setData({selected:''});renderMapSide()">×</button>`;
  if (p.kind === 'person') {
    return `<div class="pin-card"><div class="pc-h"><span class="ico ${p.band}">${initials(p.display)}</span><div><b>${esc(p.display)}</b><small>${p.band ? `<span class="tag ${p.band}">${esc(p.band)}</span>` : '<span class="tag">NO BAND</span>'}${p.owes_reply ? '<span class="tag reply">REPLY</span>' : ''}${p.new_lead ? '<span class="tag live">NEW</span>' : ''}</small></div>${x}</div>
      <dl><dt>Stage</dt><dd>${esc(p.stage || 'none')}</dd><dt>Type</dt><dd>${esc(p.type || 'unknown')}</dd><dt>Last touch</dt><dd>${esc(quiet(p))}</dd>
      <dt>Next action</dt><dd>${esc(p.next_action || 'none')}</dd><dt>Address</dt><dd>${esc([p.address, p.city, p.zip].filter(Boolean).join(', ') || 'none')}</dd>
      <dt>Phone</dt><dd>${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(fmtPhone(p.phone))}</a>` : 'none'}</dd>${p.email ? `<dt>Email</dt><dd>${esc(p.email)}</dd>` : ''}</dl>
      <div class="acts"><button class="primary" onclick="openCompose(${jsa(p.person_id)})">✉ Compose</button><button onclick="touched(${jsa(p.person_id)})">✓ Touched</button><button onclick="openTask(${jsa(p.person_id)})">＋ Task</button><button onclick="openNote(${jsa(p.person_id)})">✎ Note</button></div>
      <div class="acts"><button onclick="addToList('call', [personListRow(pinByKey(${jsa(p.key)}))])">☎ Call list</button><button onclick="addToList('postcards', [personListRow(pinByKey(${jsa(p.key)}))])">✉ Postcards</button></div></div>`;
  }
  if (p.kind === 'deal') {
    return `<div class="pin-card"><div class="pc-h"><span class="ico">⌂</span><div><b>${esc(p.address)}</b><small><span class="tag violet">${esc((p.stage || '').replace('_', ' '))}</span><span>${esc(p.side || '')}</span></small></div>${x}</div>
      <dl><dt>Client</dt><dd>${esc(p.display || 'none')}</dd><dt>Last event</dt><dd>${esc(p.last_event || 'none')}${p.last_event_at ? ' · ' + esc(p.last_event_at.slice(0, 10)) : ''}</dd></dl>
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
    <p class="dim">${d.deals.length - deals.length ? `${d.deals.length - deals.length} more off screen. ` : ''}Click a house for the deal card. Same deals as the list, placed by the Geo tab.</p></div>`;
  const scope = S.mapF.farm ? farmName(S.mapF.farm) : 'in view';
  const farms = `<h4>FARMS</h4>${farmsList().length ? `<div class="farm-list">${farmsList().map(f => {
    const n = (mapFeed().pins || []).filter(p => p.kind === 'person' && PMap.inPolygon(p.lat, p.lng, f.polygon));
    const fb = {}; n.forEach(p => { fb[p.band || ''] = (fb[p.band || ''] || 0) + 1; });
    const sig = marketRows().filter(r => r.lat != null && PMap.inPolygon(r.lat, r.lng, f.polygon)).length;
    return `<div class="farm ${S.mapF.farm === f.id ? 'on' : ''}"><button class="fname" onclick="mapSet('farm', S.mapF.farm === ${jsa(f.id)} ? '' : ${jsa(f.id)})">${esc(f.name)}</button><span>${n.length} known · ${sig} signals</span>
      <div class="bands">${BAND_NAMES.filter(b => fb[b]).map(b => `<span class="tag ${b}">${b || 'none'} ${fb[b]}</span>`).join('')}</div><button class="x" title="Delete farm" onclick="deleteFarm(${jsa(f.id)})">×</button></div>`;
  }).join('')}</div>` : '<p class="dim">No farms yet. Draw one around a neighborhood you work.</p>'}`;
  return `<div class="in-view"><h4>${esc(scope.toUpperCase())}</h4>
    <div class="iv-n"><div><b>${people.length.toLocaleString()}</b><small>people</small></div><div><b>${deals.length}</b><small>deals</small></div><div><b>${mkt.length}</b><small>signals</small></div></div>
    <div class="bands">${BAND_NAMES.filter(b => by[b]).map(b => `<span class="tag ${b}">${b || 'none'} ${by[b]}</span>`).join('')}</div>
    ${`<div class="acts"><button onclick="listFromView('call')">☎ Call list · ${people.filter(p => p.phone).length}</button><button onclick="listFromView('postcards')">✉ Postcards · ${people.filter(p => p.address).length + mkt.length}</button></div>
    <p class="dim">Lists take the people ${S.mapF.farm ? 'in this farm' : 'in view'} with the filters above, and write a CSV in aire/map-crm/out on this Mac.</p>`}
    ${farms}
    <p class="dim">Click a pin for the card. Clusters zoom in. Partners are hidden until you turn them on.</p></div>`;
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
  const amt = r.type === 'permit' ? (r.value ? `${money(r.value)} project` : 'no value given') : r.price ? money(r.price) + (r.price_was ? ` (was ${money(r.price_was)})` : '') : 'no price given';
  const near = r.nearest && r.nearest.person_id ? `<a href="#" onclick="S.pick=${jsa('person:' + r.nearest.person_id)};S.mapView={center:[${r.lat},${r.lng}],zoom:15};go('map');return false">${esc(r.nearest.display)}</a> · ${esc(r.nearest.band || 'no band')} · ${r.nearest.miles} mi` : 'nobody you know within 2 miles';
  return `<dl><dt>When</dt><dd>${esc(r.date)} · ${esc(r.subtype || r.label)}</dd><dt>Amount</dt><dd>${amt}</dd>${r.description && r.description !== r.subtype ? `<dt>Detail</dt><dd>${esc(r.description)}</dd>` : ''}
    <dt>Farm</dt><dd>${esc(farmName(r.farm) || 'outside your farms')}</dd><dt>Nearest</dt><dd>${near}</dd><dt>Source</dt><dd>${esc(r.source)} · ${esc(r.source_date)}${r.source_ref ? ' · #' + esc(r.source_ref) : ''}</dd></dl>`;
}
function marketActs(r) {
  return `<button class="primary" onclick="makeLead(${jsa(r.key)})">＋ Make lead</button><button onclick="makeDeal(${jsa(r.key)})">⌂ Make deal</button><button onclick="addToList('postcards', [marketListRow(mktByKey(${jsa(r.key)}))])">✉ Postcard</button>${r.lat != null && S.view !== 'map' ? `<button onclick="showOnMap(${jsa(r.key)})">◈ Map</button>` : ''}<button class="danger" title="Dismiss, never shown again" onclick="dismissRow(${jsa(r.key)})">✕</button>`;
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
  const t = (on, l, js) => `<button class="${on ? 'on' : ''}" onclick="${js}">${l}</button>`;
  const tools = `<div class="filters">${t(f.type === 'all', 'ALL', "mktSet('type','all')")}${t(f.type === 'permit', 'PERMITS', "mktSet('type','permit')")}${t(f.type === 'mls', 'LISTINGS', "mktSet('type','mls')")}${t(f.near, 'NEAR SOMEONE I KNOW', "mktSet('near',!S.mktF.near)")}
    <select onchange="mktSet('label', this.value)"><option value="">every kind</option>${labels.map(l => `<option ${f.label === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
    <select onchange="mktSet('farm', this.value)"><option value="">all areas</option><option value="_in" ${f.farm === '_in' ? 'selected' : ''}>inside any farm</option>${farmsList().map(x => `<option value="${esc(x.id)}" ${f.farm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`;
  const body = rows.length ? `<div class="rows mkt">${rows.slice(0, 300).map((r, i) => `<div class="row" style="--i:${Math.min(i, 20)}">
    <span class="ico ${r.type === 'permit' ? 'warm' : 'lukewarm'}">${r.type === 'permit' ? '⚒' : '◆'}</span>
    <div class="who"><b>${esc(r.address)}</b><small><span class="tag ${r.type === 'permit' ? 'warn' : 'live'}">${esc(r.label)}</span><span>${esc(r.city)}</span><span>${esc(r.date)}</span>${r.farm ? `<span class="tag info">${esc(farmName(r.farm))}</span>` : ''}</small></div>
    <div class="why"><b>${r.type === 'permit' ? (r.value ? money(r.value) + ' · ' : '') + esc(r.subtype) : (r.price ? money(r.price) : 'no price') + (r.price_was ? ` · was ${money(r.price_was)}` : '')}</b>
      <span>${r.nearest && r.nearest.person_id ? `near ${esc(r.nearest.display)} · ${r.nearest.miles} mi · ` : ''}${esc(r.source)} · ${esc(r.source_date)}</span></div>
    <div class="acts">${marketActs(r)}</div></div>`).join('')}</div>` : `<div class="empty"><b>No signals</b>${all.length ? 'Nothing matches these filters.' : 'Run monitor.py pull --write, then the refresh.'}</div>`;
  const mc = (feed().market || {}).counts || {};
  return `<div class="view">${panel(0, `Market Monitor · ${rows.length}`, `${(mc.by_type || {}).permit || 0} permits · ${all.length - ((mc.by_type || {}).permit || 0)} MLS · newest first`, tools + body)}</div>`;
}
function mktSet(k, v) { S.mktF[k] = v; render(); }
async function makeLead(key) {
  const r = mktByKey(key); if (!r) return;
  const what = r.type === 'permit' ? `${r.label} permit` : r.label;
  const v = await modal('Make lead', `
    <div class="field"><label>NAME</label><input id="m-name" value="${esc(r.owner || 'Owner at ' + r.address)}"></div>
    <div class="field"><label>PHONE (optional)</label><input id="m-phone" placeholder="if you have it"></div>
    <div class="field"><label>EMAIL (optional)</label><input id="m-email"></div>
    <div class="field"><label>NOTE</label><input id="m-note" value="${esc(`${what} ${r.date}, ${r.address}, ${r.city}. ${r.source} ${r.source_date}`)}"></div>
    <p class="dim" style="margin:4px 0 0">Goes in as band warm, Stage new lead, Source "Market Monitor ${esc(r.type)} ${esc(r.date)}". Refused if the name, phone or email is already in the CRM.</p>`,
    m => ({ name: $('#m-name', m).value.trim(), phone: $('#m-phone', m).value.trim(), email: $('#m-email', m).value.trim(), note: $('#m-note', m).value.trim() }) , 'Make lead');
  if (!v || !v.name) return;
  await act('/api/lead', { ...v, source: `Market Monitor ${r.type} ${r.date}` }, { tag: 'LEAD', text: `${v.name} is in the CRM as a new lead` });
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
