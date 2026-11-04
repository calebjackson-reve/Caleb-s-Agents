// Map page, Market Monitor page and the deals map toggle. Contract: aire/map-crm/CONTRACT.md, "What is on the screen".
// Reads feed.map and feed.market (aire/crm/FEED.md). Every write goes through app.py to crm.py, same as the rest.
S.mapF = { bands: ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold', ''], partners: false, owes: false, quiet: 0, stage: '', farm: '', people: true, deals: true, market: false, base: 'dark' };
S.mktF = { type: 'all', label: '', farm: '', near: false };
S.dealsMode = 'list';
S.mapView = null; S.pick = ''; S.place = null; S.gmPanel = true; S.gmMore = false;

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

// ---------------------------------------------------------------- the map, Google Maps style
// Full-bleed map, a floating search box with suggestions, filter chips along the top, a place panel on the
// left, layers bottom left, zoom bottom right. Black and coral. Same data, same actions as before.
const BAND_LABEL = { hot: 'Hot', warm: 'Warm', lukewarm: 'Lukewarm', cold: 'Cold', 'ice-cold': 'Ice cold', '': 'No band' };
const LAYERS = [['dark', 'Dark'], ['street', 'Map'], ['sat', 'Satellite']];
function mapPanel(dealsOnly) {
  return `<div class="gm ${dealsOnly ? 'gm-deals' : ''}">
    <div id="pmap"></div>
    <div class="gm-left">
      <form class="gm-search" onsubmit="gmSubmit(event)" autocomplete="off">
        <span class="gm-mark" aria-hidden="true"></span>
        <input id="gm-q" placeholder="${dealsOnly ? 'Search your deals' : 'Search people, deals and addresses'}" aria-label="Search the map"
          value="${esc(S.gmQ || '')}" oninput="gmSuggest(this.value)" onfocus="gmSuggest(this.value)" onkeydown="gmKey(event)">
        <button type="button" class="gm-clear" onclick="gmClear()" title="Clear" ${S.gmQ ? '' : 'hidden'}>×</button>
        <button type="submit" class="gm-go" title="Search" aria-label="Search">${GM_ICON.search}</button>
      </form>
      <div class="gm-results" id="gm-results" hidden></div>
      <aside class="gm-panel" id="map-side"></aside>
    </div>
    ${dealsOnly ? '' : `<div class="gm-chips" id="map-tools">${mapTools()}</div>`}
    <div class="gm-layers" id="gm-layers">${gmLayers()}</div>
  </div>`;
}
const GM_ICON = {
  search: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.3l8 5 8-5V7H4Z" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tag: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm4.5-4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="currentColor"/></svg>',
  house: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3L12 3Z" fill="currentColor"/></svg>',
  person: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21a8 8 0 0 1 16 0Z" fill="currentColor"/></svg>',
  area: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 6 10 3l4 3 6-2v14l-6 3-4-3-6 2V6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  dir: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m12 2 10 10-10 10L2 12 12 2Zm-1 12h2v-2h2.5L12 8.5 8.5 12H11v2Z" fill="currentColor"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m4 17.2 10.6-10.6 2.8 2.8L6.8 20H4v-2.8ZM16 5.2l1.4-1.4a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L18.8 8 16 5.2Z" fill="currentColor"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m4 17.2 10.6-10.6 2.8 2.8L6.8 20H4v-2.8ZM16 5.2l1.4-1.4a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L18.8 8 16 5.2Z" fill="currentColor"/></svg>',
  lead: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10" cy="8" r="4" fill="currentColor"/><path d="M2 21a8 8 0 0 1 13.5-5.8M19 14v6M16 17h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  fit: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  draw: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 18 9 5l6 9 5-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="9" cy="5" r="2" fill="currentColor"/><circle cx="15" cy="14" r="2" fill="currentColor"/><circle cx="20" cy="10" r="2" fill="currentColor"/></svg>',
  tune: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
function mapTools() {
  const f = S.mapF, stages = [...new Set((mapFeed().pins || []).filter(p => p.kind === 'person').map(p => p.stage || ''))].filter(Boolean).sort();
  const chip = (on, label, js, dot = '') => `<button class="gm-chip ${on ? 'on' : ''}" onclick="${js}" aria-pressed="${on}">${dot ? `<i style="background:${dot}"></i>` : ''}${label}</button>`;
  const more = S.gmMore ? `<div class="gm-more" onclick="event.stopPropagation()">
      <label>Last touch<select onchange="mapSet('quiet', Number(this.value))">${[[0, 'Any time'], [30, 'Quiet 30 days+'], [90, 'Quiet 90 days+'], [180, 'Quiet 180 days+'], [365, 'Quiet a year+']].map(([v, l]) => `<option value="${v}" ${f.quiet === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Stage<select onchange="mapSet('stage', this.value)"><option value="">Any stage</option>${stages.map(x => `<option ${f.stage === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label>Area<select onchange="mapSet('farm', this.value)"><option value="">All areas</option>${farmsList().map(x => `<option value="${esc(x.id)}" ${f.farm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="gm-check"><input type="checkbox" ${f.people ? 'checked' : ''} onchange="mapFlag('people')"> Show people</label>
      <label class="gm-check"><input type="checkbox" ${f.partners ? 'checked' : ''} onchange="mapFlag('partners')"> Agents, lenders and vendors</label>
    </div>` : '';
  const extra = (f.quiet ? 1 : 0) + (f.stage ? 1 : 0) + (f.farm ? 1 : 0) + (f.partners ? 1 : 0) + (f.people ? 0 : 1);
  return `${BAND_NAMES.map(b => chip(f.bands.includes(b), BAND_LABEL[b], `mapBand('${b}')`, PMap.BAND[b])).join('')}
    <span class="gm-sep"></span>
    ${chip(f.deals, `${GM_ICON.house} Deals`, "mapFlag('deals')")}${chip(f.market, '◆ Market', "mapFlag('market')")}${chip(f.owes, 'Owe a reply', "mapFlag('owes')")}
    <span class="gm-wrap-more">${chip(S.gmMore || extra, `${GM_ICON.tune} Filters${extra ? ' · ' + extra : ''}`, 'gmToggleMore(event)')}${more}</span>
    ${chip(false, `${GM_ICON.draw} Draw farm`, 'drawFarm()')}`;
}
function gmLayers() {
  const base = S.mapF.base;
  return `<div class="gm-layer-set">${LAYERS.map(([k, l]) => `<button class="gm-layer ${base === k ? 'on' : ''}" onclick="mapBase('${k}')" title="${l}"><span class="sw sw-${k}"></span><b>${l}</b></button>`).join('')}</div>
    <button class="gm-fit" onclick="mapFit()" title="Show everyone">${GM_ICON.fit}</button>`;
}
function gmToggleMore(e) { e && e.stopPropagation(); S.gmMore = !S.gmMore; const t = $('#map-tools'); if (t) t.innerHTML = mapTools(); }
document.addEventListener('click', e => { if (S.gmMore && !e.target.closest('.gm-wrap-more')) { S.gmMore = false; const t = $('#map-tools'); if (t) t.innerHTML = mapTools(); } if (!e.target.closest('.gm-left')) gmHideResults(); });
function viewMap() { return `<div class="view map-view gm-page">${mapPanel(false)}</div>`; }
function mountMap(dealsOnly) {
  const el = $('#pmap'); if (!el) return;
  if (S.map) S.map.destroy();
  S.mapDealsOnly = !!dealsOnly;
  S.map = PMap.create(el, { view: S.mapView, base: S.mapF.base, onMove: v => { S.mapView = v; if (!S.pick && !S.placeOpen) renderMapSide(); },
    onPick: p => { S.pick = p ? p.key : ''; S.placeOpen = false; S.map.setData({ selected: S.pick }); renderMapSide(); },
    onPlace: () => { S.pick = ''; S.placeOpen = true; S.map.setData({ selected: '' }); renderMapSide(); } });
  const d = mapData(dealsOnly); S.map.setData({ ...d, place: S.place });
  if (!S.mapView) { const pts = homeArea((dealsOnly ? d.deals : d.pins.concat(d.deals)).map(p => [p.lat, p.lng])); if (pts.length) S.map.fit(pts, 13); }
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
  const tools = $('#map-tools'); if (tools) tools.innerHTML = mapTools();
  const layers = $('#gm-layers'); if (layers) layers.innerHTML = gmLayers();
  if (S.map) S.map.setData({ ...mapData(S.mapDealsOnly), place: S.place });
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

// ---------------------------------------------------------------- the search box
// Suggestions come from what Pipeline already knows: people, deals, market rows and farms. An address that
// is in none of them can still be found on the map through the free Census geocoder (app.py /api/geocode).
function gmItems(q) {
  q = (q || '').trim().toLowerCase(); if (!q) return [];
  const score = (...fields) => { let best = 0; for (const f of fields) { const t = String(f || '').toLowerCase(); if (!t) continue; if (t.startsWith(q)) best = Math.max(best, 3); else if (t.split(/[\s,]+/).some(w => w.startsWith(q))) best = Math.max(best, 2); else if (t.includes(q)) best = Math.max(best, 1); } return best; };
  const out = [];
  if (!S.mapDealsOnly) for (const p of (mapFeed().pins || []).filter(p => p.kind === 'person')) {
    const sc = score(p.display, p.address, p.city, p.phone && p.phone.replace(/\D/g, ''), p.email); if (sc) out.push({ sc: sc + (p.band === 'hot' ? .3 : p.band === 'warm' ? .2 : 0), kind: 'person', key: p.key, title: p.display, sub: [BAND_LABEL[p.band || ''], p.address, p.city].filter(Boolean).join(' · '), lat: p.lat, lng: p.lng, p });
  }
  for (const p of (mapFeed().pins || []).filter(p => p.kind === 'deal')) {
    const sc = score(p.address, p.display); if (sc) out.push({ sc: sc + .5, kind: 'deal', key: p.key, title: p.address, sub: ['Deal', (p.stage || '').replace('_', ' '), p.display].filter(Boolean).join(' · '), lat: p.lat, lng: p.lng, p });
  }
  if (!S.mapDealsOnly) {
    for (const r of marketRows().filter(r => r.lat != null)) { const sc = score(r.address, r.city); if (sc) out.push({ sc: sc - .2, kind: 'market', key: r.key, title: r.address, sub: [r.label, r.city, r.date].filter(Boolean).join(' · '), lat: r.lat, lng: r.lng, p: r }); }
    for (const f of farmsList()) { const sc = score(f.name); if (sc) out.push({ sc: sc + .4, kind: 'farm', key: 'farm:' + f.id, title: f.name, sub: 'Farm area', id: f.id }); }
  }
  out.sort((a, b) => b.sc - a.sc || a.title.localeCompare(b.title));
  const list = out.slice(0, 7);
  if (!S.mapDealsOnly && /\d/.test(q) && /[a-z]/.test(q) && q.length >= 5) list.push({ kind: 'address', key: 'address', title: `Find “${(S.gmQ || '').trim()}” on the map`, sub: 'Any address, through the free Census lookup. Nothing is saved.' });
  return list;
}
const GM_KIND_ICON = { person: 'person', deal: 'house', market: 'tag', farm: 'area', address: 'pin' };
function gmSuggest(q) {
  S.gmQ = q; const box = $('#gm-results'); if (!box) return;
  const clear = $('.gm-clear'); if (clear) clear.hidden = !q;
  S.gmList = gmItems(q); S.gmSel = 0;
  if (!q.trim()) { gmHideResults(); return; }
  box.hidden = false; $('.gm-left').classList.add('searching');
  box.innerHTML = S.gmList.length ? S.gmList.map((it, i) => `<button class="gm-res ${i === S.gmSel ? 'sel' : ''}" onmousedown="event.preventDefault()" onclick="gmChoose(${i})">
      <span class="gm-res-ico k-${it.kind}">${GM_ICON[GM_KIND_ICON[it.kind]]}</span><span class="gm-res-t"><b>${esc(it.title)}</b><small>${esc(it.sub || '')}</small></span></button>`).join('')
    : `<div class="gm-none">Nothing in Pipeline matches. Add a house number to look up an address.</div>`;
}
function gmHideResults() { const box = $('#gm-results'); if (box) box.hidden = true; const l = $('.gm-left'); if (l) l.classList.remove('searching'); }
function gmKey(e) {
  const n = (S.gmList || []).length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!n) return; S.gmSel = (S.gmSel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; document.querySelectorAll('.gm-res').forEach((b, i) => b.classList.toggle('sel', i === S.gmSel)); }
  else if (e.key === 'Escape') { if (!$('#gm-results').hidden) { e.stopPropagation(); gmHideResults(); } }
}
function gmSubmit(e) { e.preventDefault(); if ((S.gmList || []).length) gmChoose(S.gmSel || 0); }
function gmClear() { S.gmQ = ''; const i = $('#gm-q'); if (i) { i.value = ''; i.focus(); } gmHideResults(); const c = $('.gm-clear'); if (c) c.hidden = true; if (S.place) { S.place = null; S.placeOpen = false; if (S.map) S.map.setData({ place: null }); renderMapSide(); } }
async function gmChoose(i) {
  const it = (S.gmList || [])[i]; if (!it) return;
  gmHideResults(); const input = $('#gm-q');
  if (it.kind === 'farm') { if (input) input.value = S.gmQ = it.title; mapSet('farm', it.id); return; }
  if (it.kind === 'address') { await gmFindAddress((S.gmQ || '').trim()); return; }
  if (input) input.value = S.gmQ = it.title;
  // make sure the chosen pin is on the map even if a chip hid it
  const f = S.mapF;
  if (it.kind === 'market') f.market = true;
  if (it.kind === 'deal') f.deals = true;
  if (it.kind === 'person') { f.people = true; if (!f.bands.includes(it.p.band || '')) f.bands = BAND_NAMES.filter(b => b === (it.p.band || '') || f.bands.includes(b)); if (PARTNER.has(it.p.type)) f.partners = true; f.owes = f.owes && !!it.p.owes_reply; f.stage = ''; f.quiet = 0; if (f.farm && !PMap.inPolygon(it.lat, it.lng, (farmById(f.farm) || {}).polygon)) f.farm = ''; }
  S.pick = it.key; S.placeOpen = false; S.gmPanel = true;
  mapUpdate(); S.map.setData({ selected: S.pick });
  S.map.flyTo(it.lat, it.lng, 16);
}
async function gmFindAddress(q) {
  if (!q) return;
  const box = $('#gm-results'); if (box) { box.hidden = false; box.innerHTML = '<div class="gm-none">Looking it up…</div>'; }
  const r = await api('/api/geocode', { q });
  gmHideResults();
  if (!r.ok) { toast('err', 'MAP SEARCH', r.error); return; }
  const g = r.result;
  if (g.status !== 'match') { toast('warn', 'MAP SEARCH', g.status === 'tie' ? 'That address matches more than one place. Add the city or ZIP.' : 'The Census lookup does not know that address. Check the spelling, or add the city and ZIP.'); return; }
  S.place = { kind: 'place', key: 'place', lat: g.lat, lng: g.lng, address: g.matched || q, query: q };
  S.pick = ''; S.placeOpen = true;
  S.map.setData({ place: S.place, selected: '' }); S.map.flyTo(g.lat, g.lng, 17); renderMapSide();
}

// ---------------------------------------------------------------- the place panel, or what is in view
function renderMapSide() {
  const el = $('#map-side'); if (!el) return;
  const all = (mapFeed().pins || []).concat(marketRows());
  const p = S.pick && all.find(x => x.key === S.pick);
  el.className = 'gm-panel ' + (p || (S.placeOpen && S.place) ? 'place' : S.gmPanel ? 'summary' : 'summary closed');
  el.innerHTML = p ? pinCard(p) : S.placeOpen && S.place ? placeCard(S.place) : inViewSummary();
}
const gmaps = addr => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
function gmAct(icon, label, js, primary) { return `<button class="gm-act ${primary ? 'primary' : ''}" onclick="${js}"><span>${GM_ICON[icon]}</span><b>${label}</b></button>`; }
function gmLink(icon, label, href) { return `<a class="gm-act" href="${esc(href)}" target="_blank" rel="noopener noreferrer"><span>${GM_ICON[icon]}</span><b>${label}</b></a>`; }
function gmRow(icon, html) { return html ? `<div class="gm-row"><span>${GM_ICON[icon]}</span><div>${html}</div></div>` : ''; }
function gmClose() { return `<button class="gm-x" title="Close" onclick="S.pick='';S.placeOpen=false;S.map&&S.map.setData({selected:''});renderMapSide()">×</button>`; }
function pinCard(p) {
  if (p.kind === 'person') {
    const addr = [p.address, p.city, p.zip].filter(Boolean).join(', ');
    return `${gmClose()}<div class="gm-hero b-${p.band || 'none'}"><span class="gm-av">${initials(p.display)}</span></div>
      <div class="gm-head"><h2>${esc(p.display)}</h2>
        <div class="gm-sub"><span class="gm-band"><i style="background:${PMap.BAND[p.band || '']}"></i>${esc(BAND_LABEL[p.band || ''])}</span>${p.stage ? `<span>${esc(p.stage)}</span>` : ''}${p.type ? `<span>${esc(p.type)}</span>` : ''}</div>
        <div class="gm-flags">${p.owes_reply ? '<span class="gm-flag hot">Owes a reply</span>' : ''}${p.new_lead ? '<span class="gm-flag">New lead</span>' : ''}</div></div>
      <div class="gm-acts">${gmAct('chat', 'Compose', `openCompose(${jsa(p.person_id)})`, true)}${gmAct('check', 'Touched', `touched(${jsa(p.person_id)})`)}${gmAct('plus', 'Task', `openTask(${jsa(p.person_id)})`)}${gmAct('note', 'Note', `openNote(${jsa(p.person_id)})`)}${addr ? gmLink('dir', 'Directions', gmaps(addr)) : ''}</div>
      <div class="gm-rows">
        ${gmRow('pin', esc(addr || 'No address on file'))}
        ${gmRow('phone', p.phone ? `<a href="tel:${esc(p.phone)}">${esc(fmtPhone(p.phone))}</a>` : 'No phone')}
        ${p.email ? gmRow('mail', esc(p.email)) : ''}
        ${gmRow('clock', `Last touch: ${esc(quiet(p))}`)}
        ${gmRow('next', `Next: ${esc(p.next_action || 'nothing set')}`)}
      </div>
      <div class="gm-foot"><button onclick="addToList('call', [personListRow(pinByKey(${jsa(p.key)}))])">Add to call list</button><button onclick="addToList('postcards', [personListRow(pinByKey(${jsa(p.key)}))])">Add to postcards</button></div>`;
  }
  if (p.kind === 'deal') {
    return `${gmClose()}<div class="gm-hero deal"><span class="gm-av">${GM_ICON.house}</span></div>
      <div class="gm-head"><h2>${esc(p.address)}</h2>
        <div class="gm-sub"><span class="gm-band"><i style="background:${PMap.STAGE[p.stage] || PMap.CORAL}"></i>${esc((p.stage || 'deal').replace('_', ' '))}</span>${p.side ? `<span>${esc(p.side)}</span>` : ''}</div></div>
      <div class="gm-acts">${gmAct('edit', 'Edit deal', `openDeal(${jsa(p.address)})`, true)}${p.person_id ? gmAct('chat', 'Compose', `openCompose(${jsa(p.person_id)})`) : ''}${gmLink('dir', 'Directions', gmaps(p.address))}</div>
      <div class="gm-rows">${gmRow('person', `Client: ${esc(p.display || 'none')}`)}${gmRow('clock', `${esc(p.last_event || 'No events yet')}${p.last_event_at ? ' · ' + esc(p.last_event_at.slice(0, 10)) : ''}`)}</div>`;
  }
  const amt = p.type === 'permit' ? (p.value ? `${money(p.value)} project` : 'No value given') : p.price ? money(p.price) + (p.price_was ? ` (was ${money(p.price_was)})` : '') : 'No price given';
  const near = p.nearest && p.nearest.person_id ? `Near <a href="#" onclick="S.pick=${jsa('person:' + p.nearest.person_id)};S.map.setData({selected:S.pick});renderMapSide();return false">${esc(p.nearest.display)}</a> · ${p.nearest.miles} mi` : 'Nobody you know within 2 miles';
  return `${gmClose()}<div class="gm-hero market ${p.type === 'permit' ? 'permit' : ''}"><span class="gm-av">${p.type === 'permit' ? '⚒' : '◆'}</span></div>
    <div class="gm-head"><h2>${esc(p.address)}</h2><div class="gm-sub"><span class="gm-band"><i style="background:${PMap.MARKET[p.type] || '#e6c49a'}"></i>${esc(p.label)}</span><span>${esc(p.city)}</span><span>${esc(p.date)}</span></div></div>
    <div class="gm-acts">${gmAct('lead', 'Make lead', `makeLead(${jsa(p.key)})`, true)}${gmAct('house', 'Make deal', `makeDeal(${jsa(p.key)})`)}${gmAct('mail', 'Postcard', `addToList('postcards', [marketListRow(mktByKey(${jsa(p.key)}))])`)}${gmLink('dir', 'Directions', gmaps([p.address, p.city].filter(Boolean).join(', ')))}</div>
    <div class="gm-rows">${gmRow('tag', `${esc(amt)}${p.subtype && p.subtype !== p.label ? ' · ' + esc(p.subtype) : ''}`)}${p.description && p.description !== p.subtype ? gmRow('note', esc(p.description)) : ''}
      ${gmRow('area', esc(farmName(p.farm) || 'Outside your farms'))}${gmRow('person', near)}${gmRow('clock', `${esc(p.source)} · ${esc(p.source_date)}${p.source_ref ? ' · #' + esc(p.source_ref) : ''}`)}</div>
    <div class="gm-foot"><button class="danger" onclick="dismissRow(${jsa(p.key)})">Dismiss, never show again</button></div>`;
}
function placeCard(pl) {
  return `${gmClose()}<div class="gm-hero place"><span class="gm-av">${GM_ICON.pin}</span></div>
    <div class="gm-head"><h2>${esc(pl.address)}</h2><div class="gm-sub"><span>Not in your CRM</span></div></div>
    <div class="gm-acts">${gmAct('lead', 'Make lead', 'makePlaceLead()', true)}${gmLink('dir', 'Directions', gmaps(pl.address))}</div>
    <div class="gm-rows">${gmRow('pin', esc(pl.address))}${gmRow('clock', 'Found by the Census lookup. Nothing was saved.')}</div>`;
}
async function makePlaceLead() {
  const pl = S.place; if (!pl) return;
  const day = new Date().toISOString().slice(0, 10);
  const v = await modal('Make lead', `
    <div class="field"><label>NAME</label><input id="m-name" value="${esc('Owner at ' + pl.address)}"></div>
    <div class="field"><label>PHONE (optional)</label><input id="m-phone" placeholder="if you have it"></div>
    <div class="field"><label>EMAIL (optional)</label><input id="m-email"></div>
    <div class="field"><label>NOTE</label><input id="m-note" value="${esc(`Found on the map ${day}, ${pl.address}`)}"></div>
    <p class="dim" style="margin:4px 0 0">Goes in as band warm, Stage new lead, Source "Map search ${day}". Refused if the name, phone or email is already in the CRM.</p>`,
    m => ({ name: $('#m-name', m).value.trim(), phone: $('#m-phone', m).value.trim(), email: $('#m-email', m).value.trim(), note: $('#m-note', m).value.trim() }), 'Make lead');
  if (!v || !v.name) return;
  await act('/api/lead', { ...v, source: `Map search ${day}` }, { tag: 'LEAD', text: `${v.name} is in the CRM as a new lead` });
}
function pinByKey(k) { return (mapFeed().pins || []).find(p => p.key === k); }
function gmTogglePanel() { S.gmPanel = !S.gmPanel; renderMapSide(); }
function inViewSummary() {
  const b = S.map && S.map.bounds(), d = mapData(S.mapDealsOnly), c = mapFeed().counts || {};
  const people = d.pins.filter(p => inBounds(p, b)), deals = d.deals.filter(p => inBounds(p, b)), mkt = d.market.filter(p => inBounds(p, b));
  if (!S.gmPanel) return `<button class="gm-peek" onclick="gmTogglePanel()"><b>${S.mapDealsOnly ? deals.length + ' deals' : people.length.toLocaleString() + ' people'}</b> in view ›</button>`;
  const by = {}; people.forEach(p => { by[p.band || ''] = (by[p.band || ''] || 0) + 1; });
  const head = `<div class="gm-sumh"><h3>${S.mapDealsOnly ? 'Deals in view' : esc(S.mapF.farm ? farmName(S.mapF.farm) : 'In view')}</h3><button class="gm-min" title="Hide" onclick="gmTogglePanel()">‹</button></div>`;
  if (S.mapDealsOnly) return `${head}<div class="gm-stats"><div><b>${deals.length}</b><small>deals</small></div></div>
    <p class="gm-dim">${d.deals.length - deals.length ? `${d.deals.length - deals.length} more off screen. ` : ''}Tap a pin for the deal. Same deals as the list.</p>`;
  const farms = farmsList().length ? `<h4>Farms</h4><div class="gm-farms">${farmsList().map(f => {
    const n = (mapFeed().pins || []).filter(p => p.kind === 'person' && PMap.inPolygon(p.lat, p.lng, f.polygon)).length;
    const sig = marketRows().filter(r => r.lat != null && PMap.inPolygon(r.lat, r.lng, f.polygon)).length;
    return `<div class="gm-farm ${S.mapF.farm === f.id ? 'on' : ''}"><button class="fname" onclick="mapSet('farm', S.mapF.farm === ${jsa(f.id)} ? '' : ${jsa(f.id)})">${GM_ICON.area}<span><b>${esc(f.name)}</b><small>${n} known · ${sig} signals</small></span></button><button class="gm-x small" title="Delete farm" onclick="deleteFarm(${jsa(f.id)})">×</button></div>`;
  }).join('')}</div>` : `<p class="gm-dim">No farms yet. Use Draw farm to outline a neighborhood you work.</p>`;
  return `${head}
    <div class="gm-stats"><div><b>${people.length.toLocaleString()}</b><small>people</small></div><div><b>${deals.length}</b><small>deals</small></div><div><b>${mkt.length}</b><small>signals</small></div></div>
    <div class="gm-bands">${BAND_NAMES.filter(x => by[x]).map(x => `<span><i style="background:${PMap.BAND[x]}"></i>${BAND_LABEL[x]} ${by[x]}</span>`).join('')}</div>
    <div class="gm-foot"><button onclick="listFromView('call')">Call list · ${people.filter(p => p.phone).length}</button><button onclick="listFromView('postcards')">Postcards · ${people.filter(p => p.address).length + mkt.length}</button></div>
    <p class="gm-dim">Lists take the people ${S.mapF.farm ? 'in this farm' : 'in view'} with the chips above and save a CSV on this Mac.</p>
    ${farms}
    <p class="gm-dim">${(c.persons || 0).toLocaleString()} people and ${c.deals || 0} deals pinned${c.ungeocoded_contacts ? `, ${c.ungeocoded_contacts.toLocaleString()} without a map spot yet` : ''}.</p>`;
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
