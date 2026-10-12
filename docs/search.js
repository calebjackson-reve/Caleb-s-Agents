// Buyer search: one map, one list, kept in step. Filters change which homes appear.
// Map layers add information (flood, golf, communities, sold homes) and never hide a home.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = function () { return matchMedia('(max-width: 899px)').matches; };
  var PHONE = '+12257470303';
  var FEED = window.CJ_FEED || { defaultSource: 'snapshot' };

  // ---------- Helpers ----------
  function money(n) { return n == null ? '' : '$' + Math.round(n).toLocaleString('en-US'); }
  function short(n) { return n >= 1e6 ? '$' + (n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/\.?0+$/, '') + 'M' : '$' + Math.round(n / 1e3) + 'K'; }
  function num(n) { return n == null ? '' : Math.round(n).toLocaleString('en-US'); }
  function miles(a, b) {
    var R = 3958.8, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dateShort(s) { if (!s) return ''; var d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  function sms(body) { return 'sms:' + PHONE + '?&body=' + encodeURIComponent(body); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments; t = setTimeout(function () { fn.apply(null, a); }, ms); }; }

  // ---------- Places people can search for ----------
  // Approximate town centres for the map view. They are not boundaries.
  var CITY = {
    'Baton Rouge': [30.4515, -91.1871], 'Zachary': [30.6485, -91.1565], 'St Francisville': [30.78, -91.38], 'New Roads': [30.7016, -91.4362],
    'Prairieville': [30.303, -90.972], 'Denham Springs': [30.4874, -90.9573], 'Gonzales': [30.2385, -90.9201], 'Port Allen': [30.4519, -91.2104],
    'Clinton': [30.8657, -91.0157], 'Slaughter': [30.7185, -91.1407], 'Greenwell Springs': [30.5488, -90.9868], 'Brusly': [30.3938, -91.2515],
    'Livingston': [30.5021, -90.7479], 'Lafayette': [30.2241, -92.0198], 'Central': [30.5544, -91.0368], 'Jackson': [30.8374, -91.2165]
  };
  var ALIAS = { 'St. Francisville': 'St Francisville', 'Saint Francisville': 'St Francisville', 'the Felicianas': 'St Francisville', 'Felicianas': 'St Francisville' };
  var courses = ((window.MAP_DATA || {})['data/map-places.json'] || {}).courses || [];
  var communities = (window.GOLF_DATA || {}).communities || [];
  var coursePoints = courses.filter(function (c) { return c.coordinates; }).map(function (c) {
    return { id: c.id, name: c.name, access: c.access, holes: c.holes, ll: [c.coordinates[1], c.coordinates[0]], source: c.source, date: c.statusSourceDate, address: c.address, kind: 'course' };
  });
  communities.forEach(function (c) {
    if (!c.course || !c.course.coordinates) return;
    if (coursePoints.some(function (p) { return p.name === c.course.name; })) return;
    coursePoints.push({ id: 'comm-' + c.id, name: c.course.name, access: c.course.access, holes: c.course.holes, ll: [c.course.coordinates[1], c.course.coordinates[0]], source: (c.course.sources || [{}])[0].url, date: window.GOLF_DATA.checked, address: c.course.address, kind: 'course', community: c.name });
  });

  // ---------- State ----------
  var state = {
    source: FEED.defaultSource, place: null, status: ['For Sale'], min: null, max: null, beds: 0, baths: 0, sqft: null,
    types: ['SingleFamilyResidence', 'Apartment', 'Product'], golf: false, sort: 'rec', bounds: false,
    layers: { flood: false, golf: true, comm: true, sold: false }, sel: null, cmp: []
  };
  var all = [], snapshotMeta = null, feedLabel = '';

  // ---------- Normalise both sources to one shape ----------
  function fromSnapshot(snap) {
    snapshotMeta = snap;
    return snap.listings.filter(function (l) { return l.lat && l.lng; }).map(function (l) {
      return {
        id: 'cj-' + l.id, mls: l.mls, street: l.name, city: l.city, st: l.state || 'LA', zip: l.zip, price: l.price, status: l.status, soldDate: l.soldDate,
        beds: l.beds ? +l.beds : null, baths: l.baths ? +l.baths : null, sqft: l.sqft ? +l.sqft : null, ll: [l.lat, l.lng], type: l.type,
        image: l.image, posted: l.posted, desc: l.description, source: l.source, flood: l.floodZoneMention, feed: 'snapshot', view: null
      };
    });
  }
  function fromSimplyRETS(rows) {
    return rows.filter(function (r) { return r.geo && r.geo.lat && r.geo.lng; }).map(function (r) {
      var st = (r.mls && r.mls.status) || '';
      var status = /closed|sold/i.test(st) ? 'Sold' : /pending|contract/i.test(st) ? 'Pending' : /lease/i.test(st) ? 'Leased' : 'For Sale';
      var t = (r.property && r.property.type) || '';
      var type = /CND|condo|apart/i.test(t) ? 'Apartment' : /LND|land|lot/i.test(t) ? 'Product' : 'SingleFamilyResidence';
      var p = r.property || {};
      return {
        id: 'sr-' + r.mlsId, mls: r.listingId || r.mlsId, street: r.address.full, city: r.address.city, st: ({ Texas: 'TX', Louisiana: 'LA' })[r.address.state] || r.address.state || '', zip: r.address.postalCode,
        price: status === 'Sold' ? (r.sales && r.sales.closePrice) : r.listPrice, status: status, soldDate: r.sales && r.sales.closeDate,
        beds: p.bedrooms, baths: p.bathrooms || ((p.bathsFull || 0) + (p.bathsHalf || 0) * 0.5) || null, sqft: p.area, ll: [r.geo.lat, r.geo.lng], type: type,
        image: (r.photos || [])[0], photos: r.photos, posted: r.listDate, desc: r.remarks, source: null, flood: null, feed: 'simplyrets', view: p.view,
        disclaimer: r.disclaimer, office: r.office && r.office.name
      };
    });
  }
  function load() {
    var params = new URLSearchParams(location.search);
    if (params.get('source') === 'demo') state.source = 'simplyrets';
    if (state.source === 'simplyrets' && FEED.simplyrets) {
      var f = FEED.simplyrets, url = f.base + '/properties?limit=100&status=Active,Pending,Closed';
      feedLabel = f.label || 'Live MLS feed';
      return fetch(url, { headers: { Authorization: 'Basic ' + btoa(f.key + ':' + f.secret) } })
        .then(function (r) { if (!r.ok) throw new Error('Feed returned ' + r.status); return r.json(); })
        .then(fromSimplyRETS);
    }
    return fetch('data/listings.json').then(function (r) { if (!r.ok) throw new Error('Snapshot missing'); return r.json(); }).then(function (snap) {
      feedLabel = "Caleb's own listings · snapshot " + new Date(snap.snapshot + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return fromSnapshot(snap);
    });
  }

  // ---------- Map ----------
  var map = L.map('map', { zoomControl: true, attributionControl: true, keyboard: true, tap: false });
  // Preview basemap: OpenStreetMap's standard tiles. Production should move to a keyed provider
  // (MapTiler, Stadia or similar) under Caleb's account, which is a setup step for him, not a code change.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19
  }).addTo(map);
  map.setView([30.58, -91.15], phone() ? 8 : 9);
  var homesLayer = L.layerGroup().addTo(map), soldLayer = L.layerGroup(), golfLayer = L.layerGroup(), commLayer = L.layerGroup();
  var markers = {};

  // FEMA NFHL flood zones, drawn for the current view when zoomed in enough to be honest about them.
  var FloodLayer = L.Layer.extend({
    onAdd: function (m) { this._map = m; this._img = null; m.on('moveend zoomend', this._refresh, this); this._refresh(); },
    onRemove: function (m) { m.off('moveend zoomend', this._refresh, this); if (this._img) { m.removeLayer(this._img); this._img = null; } },
    _refresh: function () {
      var m = this._map, note = $('#legend-note');
      if (m.getZoom() < 14) { if (this._img) { m.removeLayer(this._img); this._img = null; } note.textContent = 'Zoom in to street level to draw FEMA flood zones for this area.'; return; }
      note.textContent = 'FEMA National Flood Hazard Layer, drawn live. Zones inform a conversation. They are not an insurance determination or an elevation certificate.';
      var b = m.getBounds(), s = m.getSize();
      var url = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/export?f=image&format=png32&transparent=true&layers=show:28&bboxSR=4326&imageSR=4326' +
        '&bbox=' + [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',') + '&size=' + s.x + ',' + s.y;
      var img = L.imageOverlay(url, b, { opacity: .5, interactive: false, zIndex: 300 }), old = this._img, self = this;
      img.on('load', function () { if (old) m.removeLayer(old); self._img = img; });
      img.addTo(m);
    }
  });
  var floodLayer = new FloodLayer();

  function pinHtml(l) {
    if (l.status === 'Sold') return '<div class="dot"></div>';
    var cls = 'pin' + (l.status === 'Leased' ? ' lease' : '');
    return '<div class="' + cls + '">' + (l.price ? short(l.price) : l.status) + '</div>';
  }
  function addMarkers() {
    homesLayer.clearLayers(); soldLayer.clearLayers(); markers = {};
    all.forEach(function (l) {
      var m = L.marker(l.ll, { icon: L.divIcon({ className: 'cj-marker', html: pinHtml(l), iconSize: null, iconAnchor: [0, 0] }), keyboard: true, title: l.street + ', ' + l.city, riseOnHover: true });
      m.on('click', function () { select(l.id, true); });
      m.on('keypress', function (e) { var k = e.originalEvent && (e.originalEvent.key || e.originalEvent.keyCode); if (k === 'Enter' || k === ' ' || k === 13 || k === 32) select(l.id, true); });
      m.on('mouseover', function () { hot(l.id, true); }); m.on('mouseout', function () { hot(l.id, false); });
      m.listing = l; markers[l.id] = m;
      (l.status === 'Sold' ? soldLayer : homesLayer).addLayer(m);
    });
  }
  function addGolf() {
    coursePoints.forEach(function (c) {
      var m = L.marker(c.ll, { icon: L.divIcon({ className: 'cj-marker', html: '<div class="gpin' + (/private/i.test(c.access) ? ' private' : '') + '" title="' + esc(c.name) + '">⛳</div>', iconSize: null, iconAnchor: [0, 0] }), keyboard: true, title: c.name });
      m.bindPopup('<b>' + esc(c.name) + '</b><br>' + esc(c.access || '') + (c.holes ? ' · ' + c.holes + ' holes' : '') + '<br><span style="color:#5b5548">' + esc(c.address || '') + '</span>' +
        (c.source ? '<br><a href="' + esc(c.source) + '" target="_blank" rel="noopener">Source' + (c.date ? ', checked ' + esc(c.date) : '') + '</a>' : '') + '<br><a href="reference-site/explore.html#' + esc(c.id) + '">Nearby homes and detail →</a>');
      golfLayer.addLayer(m);
    });
    communities.forEach(function (c) {
      if (!c.course || !c.course.coordinates) return;
      var ll = [c.course.coordinates[1], c.course.coordinates[0]];
      var m = L.marker(ll, { icon: L.divIcon({ className: 'cj-marker', html: '<div class="gpin community" title="' + esc(c.name) + '">C</div>', iconSize: null, iconAnchor: [0, 0] }), keyboard: true, title: c.name + ' golf community' });
      m.bindPopup('<b>' + esc(c.name) + '</b> · ' + esc(c.place) + '<br>' + esc(c.tagline || '') + '<br><span style="color:#5b5548">' + esc(c.clubAccess && c.clubAccess.summary || '') + '</span><br><a href="reference-site/community.html?c=' + esc(c.id) + '">Community profile →</a>');
      commLayer.addLayer(m);
    });
  }
  function syncLayers() {
    var L_ = state.layers;
    function on(layer, want) { if (want && !map.hasLayer(layer)) map.addLayer(layer); if (!want && map.hasLayer(layer)) map.removeLayer(layer); }
    on(floodLayer, L_.flood); on(golfLayer, L_.golf); on(commLayer, L_.comm); on(soldLayer, L_.sold || state.status.indexOf('Sold') >= 0);
    $('#legend').hidden = !L_.flood;
  }

  // ---------- Filtering ----------
  function cityKey(c) { return ALIAS[c] || c; }
  function nearGolf(l) { return coursePoints.some(function (c) { return miles(l.ll, c.ll) <= 3; }); }
  function matches(l) {
    if (state.status.indexOf(l.status) < 0) return false;
    if (state.types.indexOf(l.type) < 0) return false;
    if (state.min != null && l.price != null && l.price < state.min) return false;
    if (state.max != null && l.price != null && l.price > state.max) return false;
    if (state.beds && (l.beds || 0) < state.beds) return false;
    if (state.baths && (l.baths || 0) < state.baths) return false;
    if (state.sqft && (l.sqft || 0) < state.sqft) return false;
    if (state.golf && !nearGolf(l)) return false;
    if (state.place) {
      var p = state.place;
      if (p.kind === 'city' && cityKey(l.city) !== p.key) return false;
      if (p.kind === 'zip' && l.zip !== p.key) return false;
      if ((p.kind === 'course' || p.kind === 'community') && miles(l.ll, p.ll) > 10) return false;
    }
    if (state.bounds && !map.getBounds().contains(l.ll)) return false;
    return true;
  }
  function sorted(list) {
    var s = state.sort, rank = { 'For Sale': 0, 'Pending': 1, 'Leased': 2, 'Sold': 3 };
    return list.slice().sort(function (a, b) {
      if (s === 'price-asc') return (a.price || 9e12) - (b.price || 9e12);
      if (s === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (s === 'new') return new Date(b.soldDate || b.posted || 0) - new Date(a.soldDate || a.posted || 0);
      if (s === 'size') return (b.sqft || 0) - (a.sqft || 0);
      if (state.place && state.place.ll && rank[a.status] === rank[b.status]) return miles(a.ll, state.place.ll) - miles(b.ll, state.place.ll);
      return (rank[a.status] - rank[b.status]) || (new Date(b.posted || 0) - new Date(a.posted || 0));
    });
  }
  var current = [];

  // ---------- Rendering ----------
  function cardHtml(l) {
    var priceLine = l.price ? '<div class="price">' + money(l.price) + '</div>' : '<div class="price quiet">' + (l.status === 'Sold' ? 'Sold ' + dateShort(l.soldDate) : l.status) + '</div>';
    var tagCls = l.status === 'For Sale' ? 'tag-sale' : l.status === 'Sold' ? 'tag-sold' : 'tag-lease';
    var tagTxt = l.status === 'Sold' ? 'Sold by Caleb' : l.status;
    var spec = [];
    if (l.beds) spec.push('<span><b>' + l.beds + '</b> bd</span>');
    if (l.baths) spec.push('<span><b>' + l.baths + '</b> ba</span>');
    if (l.sqft) spec.push('<span><b>' + num(l.sqft) + '</b> sq ft</span>');
    if (l.type === 'Product') spec.push('<span>Land</span>');
    var checked = state.cmp.indexOf(l.id) >= 0 ? ' checked' : '';
    return '<li class="card' + (state.sel === l.id ? ' sel' : '') + '" data-id="' + l.id + '">' +
      '<div class="ph">' + (l.image ? '<img src="' + esc(l.image) + '" alt="" loading="lazy">' : '') + '<span class="tag ' + tagCls + '">' + tagTxt + '</span></div>' +
      '<button type="button" class="open" aria-label="Open details for ' + esc(l.street) + ', ' + esc(l.city) + '">' + priceLine +
      '<div class="spec">' + spec.join('') + '</div><div class="addr">' + esc(l.street) + '<br><small>' + esc(l.city) + (l.zip ? ', ' + esc(l.st) + ' ' + esc(l.zip) : '') + '</small></div></button>' +
      '<div class="acts"><label><input type="checkbox" class="cmp-ck" data-id="' + l.id + '"' + checked + '> Compare</label>' +
      '<a class="btn btn-ghost-dark btn-xs" href="' + sms('Hi Caleb, I\'m looking at ' + l.street + ', ' + l.city + (l.price ? ' (' + money(l.price) + ')' : '') + ' on your site. ') + '">Ask Caleb</a></div></li>';
  }
  function render() {
    current = sorted(all.filter(matches));
    var ul = $('#cards');
    if (!all.length) { ul.innerHTML = ''; }
    else if (!current.length) {
      ul.innerHTML = '<li class="empty"><h3>No homes match here.</h3><p>' + (state.bounds ? 'Try widening the map, or clear the map boundary.' : state.place ? 'Nothing in the snapshot matches ' + esc(state.place.label) + ' with these filters.' : 'Loosen a filter or try another place.') +
        ' For every listing in the MLS, use the full search on calebjackson.org.</p><div class="links"><button type="button" class="btn btn-dark btn-sm" id="empty-reset">Reset filters</button><a class="btn btn-ghost-dark btn-sm" id="empty-mls" href="' + mlsHref() + '">Search the MLS</a></div></li>';
      $('#empty-reset').addEventListener('click', resetFilters);
    } else ul.innerHTML = current.map(cardHtml).join('');
    var n = current.length;
    $('#count').textContent = n; $('#count-label').textContent = n === 1 ? 'home' : 'homes';
    $('#count-badge').textContent = n + (n === 1 ? ' home' : ' homes');
    $('#f-see').textContent = 'See ' + n + (n === 1 ? ' home' : ' homes');
    $('#snap').textContent = feedLabel;
    $('#mls-link').href = mlsHref();
    $('#bounds').classList.toggle('on', state.bounds);
    var active = (state.min != null) + (state.max != null) + (state.beds > 0) + (state.baths > 0) + (state.sqft > 0) + state.golf + (state.types.length < 3) + (state.status.join() !== 'For Sale');
    $('#filters-n').hidden = !active; $('#filters-n').textContent = active;
    $('#chip-sale').setAttribute('aria-pressed', state.status.join() === 'For Sale' ? 'true' : 'false');
    $('#chip-golf').setAttribute('aria-pressed', state.golf ? 'true' : 'false');
    // Markers: dim the ones filtered out
    Object.keys(markers).forEach(function (id) {
      var m = markers[id], on = current.some(function (l) { return l.id === id; });
      var el = m.getElement(); if (el) el.style.opacity = on ? '1' : '.28';
      if (el) el.style.pointerEvents = on ? '' : 'none';
    });
    syncLayers();
    $('#tray').classList.toggle('on', state.cmp.length > 0);
    $('#tray-names').textContent = state.cmp.map(function (id) { var l = byId(id); return l ? l.street : ''; }).join(' · ');
    $('#tray-open').textContent = 'Compare ' + state.cmp.length;
    writeUrl();
  }
  function mlsHref() {
    var base = 'https://calebjackson.org/home-search/listings';
    return state.place && state.place.kind === 'city' ? base + '?city=' + encodeURIComponent(state.place.label.replace('St ', 'St. ')) : base;
  }
  function byId(id) { for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }

  // ---------- Linking cards and pins ----------
  function hot(id, on) {
    var c = $('.card[data-id="' + id + '"]'); if (c) c.classList.toggle('hot', on);
    var m = markers[id], el = m && m.getElement(); if (el) { var p = el.firstElementChild; if (p) p.classList.toggle('hot', on); }
  }
  function select(id, fromMap) {
    state.sel = id;
    $$('.card').forEach(function (c) { c.classList.toggle('sel', c.getAttribute('data-id') === id); });
    Object.keys(markers).forEach(function (k) { var el = markers[k].getElement(); if (el && el.firstElementChild) el.firstElementChild.classList.toggle('sel', k === id); });
    var l = byId(id); if (!l) return;
    if (!fromMap) { programmatic = true; map.panTo(l.ll, { animate: !reduce }); }
    openSheet(l);
    var c = $('.card[data-id="' + id + '"]'); if (c && !phone()) c.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  // ---------- Detail sheet ----------
  var floodCache = {};
  function floodLookup(l) {
    var key = l.ll.join(','); if (floodCache[key]) return floodCache[key];
    floodLookup.lastKey = key;
    var url = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?f=json&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID&geometry=' + l.ll[1] + ',' + l.ll[0];
    function get(tries) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('FEMA ' + r.status); return r.json(); }).catch(function (e) { if (tries > 0) return new Promise(function (ok) { setTimeout(ok, 1200); }).then(function () { return get(tries - 1); }); throw e; }); }
    floodCache[key] = get(2).then(function (d) {
      var f = (d.features || [])[0]; if (!f) return { zone: null };
      var a = f.attributes; return { zone: a.FLD_ZONE, sub: a.ZONE_SUBTY, sfha: a.SFHA_TF === 'T', panel: a.DFIRM_ID };
    });
    return floodCache[key];
  }
  function floodText(z) {
    if (!z) return 'FEMA has no mapped zone at this point. That can mean an unmapped area, not low risk.';
    if (z.zone === 'X' && /MINIMAL/i.test(z.sub || '')) return 'Zone X, area of minimal flood hazard. Outside the 1% annual chance floodplain on FEMA\'s map.';
    if (z.zone === 'X') return 'Zone X' + (z.sub ? ', ' + z.sub.toLowerCase() : '') + '. Usually the 0.2% annual chance area or protected by levee.';
    if (/^A|^V/.test(z.zone)) return 'Zone ' + z.zone + (z.sub ? ', ' + z.sub.toLowerCase() : '') + '. Inside FEMA\'s special flood hazard area. Lenders usually require flood insurance here.';
    if (z.zone === 'D') return 'Zone D, undetermined risk. FEMA has not studied this area.';
    return 'Zone ' + z.zone + (z.sub ? ', ' + z.sub.toLowerCase() : '') + '.';
  }
  function golfContext(l) {
    var near = coursePoints.map(function (c) { return { c: c, d: miles(l.ll, c.ll) }; }).sort(function (a, b) { return a.d - b.d; })[0];
    var rel = null;
    communities.forEach(function (c) { (c.featuredHomes || []).forEach(function (h) { if (h.source && l.source && h.source === l.source) rel = { c: c, h: h }; }); });
    return { near: near, rel: rel };
  }
  function openSheet(l) {
    var sh = $('#sheet'), sc = $('#sheet-scroll');
    var tag = $('#sheet-tag'); tag.textContent = l.status === 'Sold' ? 'Sold by Caleb' : l.status; tag.className = 'tag ' + (l.status === 'For Sale' ? 'tag-sale' : l.status === 'Sold' ? 'tag-sold' : 'tag-lease');
    var g = golfContext(l), spec = [];
    if (l.beds) spec.push('<span>' + l.beds + ' beds</span>'); if (l.baths) spec.push('<span>' + l.baths + ' baths</span>'); if (l.sqft) spec.push('<span>' + num(l.sqft) + ' sq ft</span>');
    if (l.mls) spec.push('<span>MLS ' + esc(l.mls) + '</span>');
    var golfHtml = '';
    if (g.rel) golfHtml = '<div class="big-line">' + esc(g.rel.c.name) + ': ' + (g.rel.h.relationship === 'view' ? 'course view' : g.rel.h.relationship === 'course' ? 'golf frontage' : 'inside the community') + '</div><p>' + esc(g.rel.h.note) + '</p><p class="src">Source: <a href="' + esc(g.rel.h.source) + '">the listing</a>. Frontage, a course view, living inside a golf community and being nearby are four different things. <a href="reference-site/community.html?c=' + esc(g.rel.c.id) + '">Community profile →</a></p>';
    else if (g.near) golfHtml = '<div class="big-line">' + g.near.d.toFixed(1) + ' mi to ' + esc(g.near.c.name) + '</div><p>' + esc(g.near.c.access || '') + (g.near.c.community ? ', the course inside ' + esc(g.near.c.community) : '') + '. Straight-line distance, not drive time. Being near a course is not the same as living in a golf community.</p>' + (g.near.c.source ? '<p class="src"><a href="' + esc(g.near.c.source) + '" target="_blank" rel="noopener">Course source' + (g.near.c.date ? ', checked ' + esc(g.near.c.date) : '') + '</a></p>' : '');
    var cmpOn = state.cmp.indexOf(l.id) >= 0;
    sc.innerHTML = '<div class="photo">' + (l.image ? '<img src="' + esc(l.image) + '" alt="' + esc(l.street) + '">' : '') + '</div><div class="body">' +
      '<p class="eyebrow" style="margin-bottom:0;color:var(--ink-soft)">' + esc(l.city) + (l.zip ? ', ' + esc(l.st) + ' ' + esc(l.zip) : '') + '</p><h2>' + esc(l.street) + '</h2>' +
      (l.price ? '<div class="big">' + money(l.price) + (l.status === 'Sold' ? ' <span class="note">sold ' + dateShort(l.soldDate) + '</span>' : '') + '</div>' : '<p class="sub">' + (l.status === 'Sold' ? 'Sold ' + dateShort(l.soldDate) + '. Sale prices are not published on Caleb\'s site.' : l.status) + '</p>') +
      '<div class="spec">' + spec.join('') + '</div>' +
      '<div class="cta"><a class="btn btn-dark btn-sm" href="' + sms('Hi Caleb, I\'d like to talk about ' + l.street + ', ' + l.city + (l.price ? ' (' + money(l.price) + ')' : '') + '. ') + '">Ask Caleb about this home</a>' +
      '<button type="button" class="btn btn-ghost-dark btn-sm" id="sheet-cmp">' + (cmpOn ? 'Remove from compare' : 'Add to compare') + '</button>' +
      (l.source ? '<a class="btn btn-ghost-dark btn-sm" href="' + esc(l.source) + '">Full listing on calebjackson.org</a>' : '') + '</div>' +
      '<div class="panel flood"><h3>Flood zone</h3><div id="flood-out"><p>Checking FEMA\'s flood map for this point…</p></div></div>' +
      (golfHtml ? '<div class="panel golf"><h3>Golf</h3>' + golfHtml + '</div>' : '') +
      (l.desc ? '<p class="desc">' + esc(l.desc) + (l.feed === 'snapshot' && l.desc.length >= 600 ? '…' : '') + '</p>' : '') +
      '<p class="snapnote">' + esc(feedLabel) + (l.feed === 'snapshot' ? '. Details were captured from Caleb\'s listing page and can lag the MLS. Confirm status and price before relying on them.' : (l.disclaimer ? '. ' + esc(l.disclaimer) : '')) + '</p></div>';
    sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
    sc.scrollTop = 0;
    $('#sheet-cmp').addEventListener('click', function () { toggleCmp(l.id); openSheet(l); });
    floodLookup(l).then(function (z) {
      var out = $('#flood-out'); if (!out) return;
      out.innerHTML = '<div class="big-line">' + (z.zone ? 'Zone ' + esc(z.zone) : 'Not mapped') + '</div><p>' + esc(floodText(z)) + '</p><p class="src">FEMA National Flood Hazard Layer, looked up live for the listing\'s map point' + (z.panel ? ' (panel ' + esc(z.panel) + ')' : '') + '. A point lookup is not an elevation certificate or an insurance quote.' + (l.flood ? ' The listing itself mentions Zone ' + esc(l.flood) + '.' : '') + '</p>';
    }).catch(function () { delete floodCache[key]; var out = $('#flood-out'); if (out) out.innerHTML = '<p>FEMA\'s map service didn\'t answer. <a href="https://msc.fema.gov/portal/search?AddressQuery=' + encodeURIComponent(l.street + ' ' + l.city + ' LA') + '">Check the address on FEMA\'s Flood Map Service Center</a>.</p>'; });
    if (!phone()) $('#sheet-back').focus();
  }
  function closeSheet() {
    var sh = $('#sheet'); sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true');
    state.sel = null; $$('.card.sel').forEach(function (c) { c.classList.remove('sel'); });
    Object.keys(markers).forEach(function (k) { var el = markers[k].getElement(); if (el && el.firstElementChild) el.firstElementChild.classList.remove('sel'); });
  }

  // ---------- Compare ----------
  function toggleCmp(id) {
    var i = state.cmp.indexOf(id);
    if (i >= 0) state.cmp.splice(i, 1); else { if (state.cmp.length >= 3) { alert('Compare up to three homes at a time.'); return; } state.cmp.push(id); }
    render();
  }
  function openCmp() {
    var ls = state.cmp.map(byId).filter(Boolean), sc = $('#cmp-scroll');
    function row(label, vals, fmt) {
      var out = vals.map(function (v) { return v == null || v === '' ? '<span class="note">Not listed</span>' : (fmt ? fmt(v) : esc(v)); });
      var differs = vals.every(function (v) { return v != null && v !== ''; }) && vals.some(function (v) { return String(v) !== String(vals[0]); });
      return '<tr><th>' + label + (differs ? '<br><span class="differs">Differs</span>' : '') + '</th>' + out.map(function (o) { return '<td>' + o + '</td>'; }).join('') + '</tr>';
    }
    sc.innerHTML = '<h2 style="font-size:32px;margin:16px 0 4px">Side by side</h2><p class="note">Facts as captured. Flood zones come from FEMA for each home\'s map point. Nothing here is a cost estimate; for monthly cost comparisons open the planning tool.</p>' +
      '<table><tr><th></th>' + ls.map(function (l) { return '<td>' + (l.image ? '<img src="' + esc(l.image) + '" alt="">' : '') + '<div style="margin-top:8px;font-weight:600">' + esc(l.street) + '</div><div class="note">' + esc(l.city) + '</div></td>'; }).join('') + '</tr>' +
      row('Status', ls.map(function (l) { return l.status; })) + row('Price', ls.map(function (l) { return l.price; }), money) + row('Beds', ls.map(function (l) { return l.beds; })) + row('Baths', ls.map(function (l) { return l.baths; })) +
      row('Living area', ls.map(function (l) { return l.sqft; }), function (v) { return num(v) + ' sq ft'; }) + row('Type', ls.map(function (l) { return l.type === 'Product' ? 'Land' : l.type === 'Apartment' ? 'Condo' : 'House'; })) +
      row('Nearest course', ls.map(function (l) { var g = golfContext(l); return g.near ? g.near.d.toFixed(1) + ' mi · ' + g.near.c.name : null; })) +
      '<tr id="cmp-flood"><th>Flood zone</th>' + ls.map(function () { return '<td><span class="note">Checking FEMA…</span></td>'; }).join('') + '</tr>' +
      '<tr><th></th>' + ls.map(function (l) { return '<td>' + (l.source ? '<a href="' + esc(l.source) + '">Full listing</a>' : '') + '</td>'; }).join('') + '</tr></table>' +
      (ls.length >= 2 && ls.every(function (l) { return l.price; }) ? '<p style="margin-top:18px"><a class="btn btn-dark btn-sm" href="reference-site/compare.html">Compare monthly costs with your loan applied →</a></p>' : '');
    $('#cmp').classList.add('open');
    $('#cmp-text').href = sms('Hi Caleb, I\'m comparing ' + ls.map(function (l) { return l.street + ', ' + l.city; }).join(' and ') + '. Which would you look at first?');
    ls.forEach(function (l, i) { floodLookup(l).then(function (z) { var tr = $('#cmp-flood'); if (tr) tr.children[i + 1].innerHTML = (z.zone ? 'Zone ' + esc(z.zone) : 'Not mapped') + '<div class="note">' + esc(floodText(z)) + '</div>'; }).catch(function () {}); });
  }

  // ---------- Place search ----------
  function placeIndex() {
    var items = [];
    Object.keys(CITY).forEach(function (c) { var n = all.filter(function (l) { return cityKey(l.city) === c; }).length; items.push({ kind: 'city', key: c, label: c === 'St Francisville' ? 'St. Francisville' : c, ll: CITY[c], sub: n ? n + (n === 1 ? ' home' : ' homes') : 'Louisiana' }); });
    var zips = {}; all.forEach(function (l) { if (l.zip) zips[l.zip] = (zips[l.zip] || 0) + 1; });
    Object.keys(zips).forEach(function (z) { var l = all.filter(function (x) { return x.zip === z; })[0]; items.push({ kind: 'zip', key: z, label: z, ll: l.ll, sub: l.city + ' · ' + zips[z] + (zips[z] === 1 ? ' home' : ' homes') }); });
    communities.forEach(function (c) { if (c.course && c.course.coordinates) items.push({ kind: 'community', key: c.id, label: c.name, ll: [c.course.coordinates[1], c.course.coordinates[0]], sub: 'Golf community · ' + c.place }); });
    coursePoints.forEach(function (c) { if (!c.community) items.push({ kind: 'course', key: c.id, label: c.name, ll: c.ll, sub: 'Golf course · ' + (c.access || '') }); });
    return items;
  }
  var index = [];
  function suggest(q) {
    var box = $('#suggest'), inp = $('#q');
    q = (q || '').trim().toLowerCase();
    var hits = index.filter(function (p) { return !q || p.label.toLowerCase().indexOf(q) >= 0 || (ALIAS[p.label] || '').toLowerCase().indexOf(q) >= 0 || p.sub.toLowerCase().indexOf(q) >= 0; });
    if (!q) hits = hits.filter(function (p) { return p.kind === 'city' && /home/.test(p.sub); });
    var groups = { city: 'Places', zip: 'Zip codes', community: 'Golf communities', course: 'Golf courses' }, html = '', any = false;
    Object.keys(groups).forEach(function (k) {
      var g = hits.filter(function (p) { return p.kind === k; }).slice(0, 6); if (!g.length) return; any = true;
      html += '<h4>' + groups[k] + '</h4>' + g.map(function (p) { return '<button type="button" role="option" data-kind="' + p.kind + '" data-key="' + esc(p.key) + '">' + esc(p.label) + '<small>' + esc(p.sub) + '</small></button>'; }).join('');
    });
    if (!any) html = '<h4>No match</h4><button type="button" role="option" data-kind="none">Nothing called "' + esc(q) + '" in the snapshot. Try a city, zip or course name.</button>';
    box.innerHTML = html; box.hidden = false; inp.setAttribute('aria-expanded', 'true');
  }
  function hideSuggest() { $('#suggest').hidden = true; $('#q').setAttribute('aria-expanded', 'false'); }
  function setPlace(p, quiet) {
    state.place = p; state.bounds = false;
    $('#place-chip').classList.toggle('on', !!p); $('#place-name').textContent = p ? p.label : '';
    $('#q').value = ''; $('#q').placeholder = p ? 'Add another place…' : 'City, community, golf course or zip';
    if (p && p.ll) { programmatic = true; map.flyTo(p.ll, p.kind === 'city' ? 12 : 13, { animate: !reduce, duration: .9 }); }
    if (!quiet) render();
  }
  function resolveQuery(q) {
    q = (q || '').trim(); if (!q) return null;
    var lq = q.toLowerCase().replace(/\bsaint\b/, 'st').replace(/\bst\./, 'st');
    var hit = index.filter(function (p) { return p.label.toLowerCase().replace(/\bst\./, 'st') === lq || p.key.toLowerCase() === lq; })[0] || index.filter(function (p) { return p.label.toLowerCase().replace(/\bst\./, 'st').indexOf(lq) === 0; })[0];
    return hit || null;
  }

  // ---------- URL ----------
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.source === 'simplyrets') p.set('source', 'demo');
    if (state.place) p.set('place', state.place.label);
    if (state.status.join() !== 'For Sale') p.set('status', state.status.join(',').toLowerCase().replace(/ /g, ''));
    if (state.min != null) p.set('min', state.min); if (state.max != null) p.set('max', state.max);
    if (state.beds) p.set('beds', state.beds); if (state.baths) p.set('baths', state.baths); if (state.sqft) p.set('sqft', state.sqft);
    if (state.golf) p.set('golf', '1'); if (state.sort !== 'rec') p.set('sort', state.sort);
    var ly = Object.keys(state.layers).filter(function (k) { return state.layers[k]; }).join(','); if (ly !== 'golf,comm') p.set('layer', ly);
    if (state.cmp.length) p.set('cmp', state.cmp.join(','));
    var s = p.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }
  function readUrl() {
    var p = new URLSearchParams(location.search), st = p.get('status');
    if (st) state.status = st.split(',').map(function (s) { return { forsale: 'For Sale', sold: 'Sold', leased: 'Leased', pending: 'Pending' }[s] || 'For Sale'; });
    if (p.get('min')) state.min = +p.get('min'); if (p.get('max')) state.max = +p.get('max');
    if (p.get('beds')) state.beds = +p.get('beds'); if (p.get('baths')) state.baths = +p.get('baths'); if (p.get('sqft')) state.sqft = +p.get('sqft');
    if (p.get('golf')) state.golf = true; if (p.get('sort')) state.sort = p.get('sort');
    if (p.get('layer') != null) { var ly = p.get('layer').split(','); state.layers = { flood: ly.indexOf('flood') >= 0, golf: ly.indexOf('golf') >= 0, comm: ly.indexOf('comm') >= 0, sold: ly.indexOf('sold') >= 0 }; }
    if (p.get('cmp')) state.cmp = p.get('cmp').split(',');
    return { place: p.get('place') || p.get('q'), home: p.get('home') };
  }
  function syncFilterUi() {
    $$('input[name="status"]').forEach(function (i) { i.checked = state.status.indexOf(i.value) >= 0; });
    $$('input[name="type"]').forEach(function (i) { i.checked = state.types.indexOf(i.value) >= 0; });
    $('#f-min').value = state.min != null ? state.min : ''; $('#f-max').value = state.max != null ? state.max : '';
    $('#f-beds').value = state.beds; $('#f-baths').value = state.baths; $('#f-sqft').value = state.sqft || ''; $('#f-golf').checked = state.golf; $('#sort').value = state.sort;
    $('#ly-flood').checked = state.layers.flood; $('#ly-golf').checked = state.layers.golf; $('#ly-comm').checked = state.layers.comm; $('#ly-sold').checked = state.layers.sold;
  }
  function readFilterUi() {
    state.status = $$('input[name="status"]:checked').map(function (i) { return i.value; }); if (!state.status.length) state.status = ['For Sale'];
    state.types = $$('input[name="type"]:checked').map(function (i) { return i.value; });
    state.min = $('#f-min').value ? +$('#f-min').value : null; state.max = $('#f-max').value ? +$('#f-max').value : null;
    if (state.min != null && state.max != null && state.min > state.max) { var t = state.min; state.min = state.max; state.max = t; $('#f-min').value = state.min; $('#f-max').value = state.max; }
    state.beds = +$('#f-beds').value; state.baths = +$('#f-baths').value; state.sqft = $('#f-sqft').value ? +$('#f-sqft').value : null; state.golf = $('#f-golf').checked;
  }
  function resetFilters() {
    state.status = ['For Sale']; state.types = ['SingleFamilyResidence', 'Apartment', 'Product']; state.min = state.max = state.sqft = null; state.beds = state.baths = 0; state.golf = false; state.bounds = false;
    syncFilterUi(); render();
  }

  // ---------- Wiring ----------
  var programmatic = false;
  function wire() {
    $('#filters-btn').addEventListener('click', function () { openFilters(true); });
    $('#filters-close').addEventListener('click', function () { openFilters(false); });
    $('#f-see').addEventListener('click', function () { openFilters(false); $('#results').focus(); });
    $('#f-reset').addEventListener('click', resetFilters);
    $$('#filters input, #filters select').forEach(function (i) { i.addEventListener('change', function () { readFilterUi(); render(); }); });
    $('#chip-sale').addEventListener('click', function () { state.status = ['For Sale']; syncFilterUi(); render(); });
    $('#chip-golf').addEventListener('click', function () { state.golf = !state.golf; syncFilterUi(); render(); });
    $('#sort').addEventListener('change', function () { state.sort = this.value; render(); });
    $('#bounds-clear').addEventListener('click', function () { state.bounds = false; render(); });
    $('#layers-btn').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') === 'true'; this.setAttribute('aria-expanded', String(!o)); $('#layers').hidden = o; });
    ['flood', 'golf', 'comm', 'sold'].forEach(function (k) { $('#ly-' + k).addEventListener('change', function () { state.layers[k] = this.checked; syncLayers(); writeUrl(); }); });
    $('#sheet-back').addEventListener('click', closeSheet);
    $('#tray-clear').addEventListener('click', function () { state.cmp = []; render(); });
    $('#tray-open').addEventListener('click', openCmp);
    $('#cmp-back').addEventListener('click', function () { $('#cmp').classList.remove('open'); });
    $('#cards').addEventListener('click', function (e) {
      var ck = e.target.closest('.cmp-ck'); if (ck) { toggleCmp(ck.getAttribute('data-id')); return; }
      var b = e.target.closest('.open'); if (b) select(b.closest('.card').getAttribute('data-id'));
    });
    $('#cards').addEventListener('mouseover', function (e) { var c = e.target.closest('.card'); if (c) hot(c.getAttribute('data-id'), true); });
    $('#cards').addEventListener('mouseout', function (e) { var c = e.target.closest('.card'); if (c) hot(c.getAttribute('data-id'), false); });
    $('#cards').addEventListener('focusin', function (e) { var c = e.target.closest('.card'); if (c) hot(c.getAttribute('data-id'), true); });
    $('#cards').addEventListener('focusout', function (e) { var c = e.target.closest('.card'); if (c) hot(c.getAttribute('data-id'), false); });
    // Place input
    var q = $('#q');
    q.addEventListener('focus', function () { suggest(q.value); });
    q.addEventListener('input', debounce(function () { suggest(q.value); }, 80));
    q.addEventListener('keydown', function (e) {
      var opts = $$('#suggest [role="option"]'), i = opts.findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!opts.length) return; i = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; opts.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === i)); }); opts[i].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); if (i >= 0) opts[i].click(); else { var hit = resolveQuery(q.value); if (hit) { setPlace(hit); hideSuggest(); } else suggest(q.value); } }
      else if (e.key === 'Escape') { hideSuggest(); }
    });
    $('#suggest').addEventListener('click', function (e) {
      var b = e.target.closest('[role="option"]'); if (!b) return;
      if (b.getAttribute('data-kind') === 'none') { hideSuggest(); return; }
      var p = index.filter(function (x) { return x.kind === b.getAttribute('data-kind') && x.key === b.getAttribute('data-key'); })[0];
      if (p) { setPlace(p); hideSuggest(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.where')) hideSuggest(); if (!e.target.closest('.map-ui')) { $('#layers').hidden = true; $('#layers-btn').setAttribute('aria-expanded', 'false'); } });
    $('#place-clear').addEventListener('click', function () { setPlace(null); q.focus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#cmp').classList.contains('open')) $('#cmp').classList.remove('open');
      else if ($('#sheet').classList.contains('open')) closeSheet();
      else if ($('#filters').classList.contains('open')) openFilters(false);
      else if (!$('#layers').hidden) { $('#layers').hidden = true; $('#layers-btn').setAttribute('aria-expanded', 'false'); }
    });
    // Map interaction: a user-driven move narrows the list to the view
    map.on('movestart', function () { if (!programmatic) userMoving = true; });
    map.on('moveend', function () { if (userMoving && !programmatic) { state.bounds = true; render(); } userMoving = false; programmatic = false; });
    map.on('click', function () { hideSuggest(); });
    // Phone
    $('#dock-mode').addEventListener('click', function (e) { e.preventDefault(); setMode(!document.body.classList.contains('mode-map')); });
    $('#dock-filters').addEventListener('click', function (e) { e.preventDefault(); setMode(false); openFilters(true); });
    addEventListener('resize', debounce(function () { map.invalidateSize(); }, 150));
  }
  var userMoving = false;
  function openFilters(open) {
    $('#filters').classList.toggle('open', open); document.body.classList.toggle('panel-open', open); $('#filters-btn').setAttribute('aria-expanded', String(open));
    if (open) { closeSheet(); $('#filters-close').focus(); } else $('#filters-btn').focus();
  }
  function setMode(mapMode) {
    document.body.classList.toggle('mode-map', mapMode);
    $('#dock-mode').setAttribute('aria-label', mapMode ? 'Show list' : 'Show map');
    if (mapMode) { closeSheet(); setTimeout(function () { map.invalidateSize(); }, 50); }
  }

  // ---------- Go ----------
  wire();
  var q0 = readUrl();
  syncFilterUi();
  load().then(function (rows) {
    all = rows; index = placeIndex(); addMarkers(); addGolf();
    if (state.source === 'simplyrets' && all.length) { programmatic = true; map.fitBounds(L.latLngBounds(all.map(function (l) { return l.ll; })).pad(0.1), { animate: false }); }
    var p = q0.place && resolveQuery(q0.place);
    if (p) setPlace(p, true); else if (q0.place) $('#q').value = q0.place;
    render();
    if (q0.home) { var h = all.filter(function (l) { return l.mls === q0.home; })[0]; if (h) { programmatic = true; map.setView(h.ll, 14, { animate: false }); select(h.id, true); } }
    else if (!p && !q0.place && !phone()) { programmatic = true; map.fitBounds(L.latLngBounds(current.map(function (l) { return l.ll; })).pad(0.15), { animate: false }); }
    if (q0.place && !p) { $('#cards').insertAdjacentHTML('afterbegin', '<li class="bad">Nothing in the snapshot is called "' + esc(q0.place) + '". Showing everything instead. Try a city, zip or course from the suggestions.</li>'); }
  }).catch(function (err) {
    $('#cards').innerHTML = '<li class="empty"><h3>The listing data didn\'t load.</h3><p>' + esc(err.message) + '. You can still search every MLS listing on calebjackson.org, or text Caleb directly.</p><div class="links"><a class="btn btn-dark btn-sm" href="https://calebjackson.org/home-search/listings">Search the MLS</a><a class="btn btn-ghost-dark btn-sm" href="sms:' + PHONE + '">Text Caleb</a></div></li>';
    $('#count').textContent = '0';
  });
})();
