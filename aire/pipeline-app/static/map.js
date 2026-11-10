// Pipeline map. A small slippy map with no library and no build step, same as the rest of the app.
// The surface is Pipeline's own light cartography, drawn on the canvas: an ivory field, the Mississippi as a slate
// spine, False River as a slender oxbow at New Roads, and typeset place names. No street tiles. The basemap is only a
// layer: every pin sits at its contact's real coordinates, projected the same way as before (Web Mercator).
// Pins are colored by CRM stage (stage.js), never by temperature, and are never merged into numbered discs.
// Satellite stays as an option for drawing a farm: USGS The National Map imagery, public domain, credited on the map.
// PMap.create(el, opts) -> { setData, setBase, fit, focus, bounds, startDraw, cancelDraw, view, destroy }
window.PMap = (function () {
  const TILE = 256;
  const BASES = {
    paper: { url: null, max: 16, attr: '' },
    sat: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}`, max: 16, attr: 'Imagery: USGS The National Map' },
  };
  // Deal houses and market diamonds are quiet ink and stone, so the only color on the map is a person's stage.
  const STAGE = { lead: '#B9B2A8', consult: '#B9B2A8', active: '#B9B2A8', showing: '#B9B2A8', under_contract: '#B9B2A8' };
  const MARKET = { permit: '#B9B2A8', new_listing: '#B9B2A8', price_change: '#B9B2A8', back_on_market: '#B9B2A8', pending: '#B9B2A8', sold: '#B9B2A8', listing_change: '#B9B2A8' };
  const IVORY = '#FBF8F3', INK = '#14100E', SLATE = '#8A9AA0', SLATE_SOFT = '#A8B4B8', GRAPHITE = '#5A5550', STONE = '#8A837B';
  // The designed basemap, as [lat, lng]. The river and the oxbow are hand-plotted centerlines, drawn wider than life.
  const RIVER = [[31.02, -91.63], [30.96, -91.6], [30.9, -91.56], [30.85, -91.52], [30.8, -91.47], [30.765, -91.41], [30.735, -91.36], [30.7, -91.31],
    [30.66, -91.285], [30.62, -91.3], [30.585, -91.305], [30.555, -91.26], [30.525, -91.205], [30.49, -91.195], [30.45, -91.195], [30.415, -91.21],
    [30.38, -91.235], [30.345, -91.245], [30.31, -91.225], [30.295, -91.18], [30.31, -91.14], [30.29, -91.1], [30.25, -91.085], [30.21, -91.05], [30.17, -91]];
  const FALSE_RIVER = [[30.697, -91.437], [30.67, -91.455], [30.64, -91.468], [30.612, -91.462], [30.595, -91.435], [30.597, -91.4], [30.615, -91.375], [30.645, -91.36], [30.675, -91.355]];
  const PLACES = [{ name: 'Baton Rouge', at: [30.4515, -91.1871], size: 24, cities: ['baton rouge'] }, { name: 'Zachary', at: [30.6485, -91.1565], size: 18, cities: ['zachary'] },
    { name: 'St. Francisville', at: [30.7799, -91.3765], size: 16, cities: ['st. francisville', 'st francisville', 'saint francisville'] },
    { name: 'New Roads', at: [30.7016, -91.4362], size: 15, cities: ['new roads'] },
    { name: 'The Felicianas', at: [30.86, -91.08], size: 15, cities: ['clinton', 'jackson', 'slaughter', 'ethel', 'norwood', 'wilson'] }];
  // What the first view frames: the river corridor from St. Francisville to south Baton Rouge.
  const HOME = [[30.9, -91.5], [30.33, -90.95]];

  const project = (lat, lng, z) => { const s = TILE * 2 ** z, sin = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
  const unproject = (x, y, z) => { const s = TILE * 2 ** z, n = Math.PI - 2 * Math.PI * y / s; return [180 / Math.PI * Math.atan(Math.sinh(n)), x / s * 360 - 180]; };

  // Area labels: each takes the first free spot around its point (on it, above, below, then further out and to the sides),
  // never over another label, a pin or a cluster. A label with no free spot is left off rather than overlap.
  // bounds ({w, h}, the map's size): a label is slid inside the edges, never cut off at the left or right (round 4).
  function placeLabels(labels, obstacles, width, bounds) {
    const boxes = obstacles.map(o => ({ x0: o.x - o.r, x1: o.x + o.r, y0: o.y - o.r, y1: o.y + o.r }));
    const hit = b => boxes.some(o => b.x1 > o.x0 && b.x0 < o.x1 && b.y1 > o.y0 && b.y0 < o.y1);
    const out = [];
    for (const l of labels.slice().sort((a, b) => (b.on - a.on) || (b.name.length - a.name.length))) {
      const w = width(l.name) + 12, h = 20, step = h + 4;
      const offs = [[0, 0], [0, -step], [0, step], [0, -2 * step], [0, 2 * step], [w / 2 + 14, 0], [-(w / 2 + 14), 0], [w / 2 + 14, -step], [-(w / 2 + 14), step]];
      const pad = 4, inside = b => { if (!bounds) return b;
        const sx = b.x0 < pad ? pad - b.x0 : b.x1 > bounds.w - pad ? bounds.w - pad - b.x1 : 0;
        const sy = b.y0 < pad ? pad - b.y0 : b.y1 > bounds.h - pad ? bounds.h - pad - b.y1 : 0;
        return { x0: b.x0 + sx, x1: b.x1 + sx, y0: b.y0 + sy, y1: b.y1 + sy, dx: b.dx + sx, dy: b.dy + sy }; };
      const spot = offs.map(([dx, dy]) => inside({ x0: l.x + dx - w / 2, x1: l.x + dx + w / 2, y0: l.y + dy - h / 2, y1: l.y + dy + h / 2, dx, dy }))
        .find(b => !hit(b) && (!bounds || (b.x0 >= 0 && b.x1 <= bounds.w)));
      if (!spot) continue;
      boxes.push(spot); out.push({ ...l, ...spot, w, h });
    }
    return out;
  }

  function create(el, opts = {}) {
    el.classList.add('pmap');
    el.innerHTML = '<div class="pm-tiles"></div><canvas class="pm-canvas"></canvas>' + (opts.still ? '' : '<div class="pm-zoom"><button data-z="1" title="Zoom in">+</button><button data-z="-1" title="Zoom out">−</button></div>') + '<div class="pm-attr"></div><div class="pm-hint" hidden></div>';
    const tilesEl = el.querySelector('.pm-tiles'), cv = el.querySelector('.pm-canvas'), ctx = cv.getContext('2d'), attr = el.querySelector('.pm-attr'), hint = el.querySelector('.pm-hint');
    const st = { center: (opts.view && opts.view.center) || [30.45, -91.15], zoom: (opts.view && opts.view.zoom) || 10, base: opts.base || 'paper',
      data: { pins: [], deals: [], market: [], farms: [], selected: '' }, hits: [], w: 0, h: 0, draw: null, raf: 0, pulse: 0, dead: false };
    const tiles = new Map();

    function clampZoom(z) { return Math.max(3, Math.min(BASES[st.base].max, z)); }
    function centerPx() { return project(st.center[0], st.center[1], st.zoom); }
    function toScreen(lat, lng) { const [cx, cy] = centerPx(), [x, y] = project(lat, lng, st.zoom); return [x - cx + st.w / 2, y - cy + st.h / 2]; }
    function toLatLng(sx, sy) { const [cx, cy] = centerPx(); return unproject(cx + sx - st.w / 2, cy + sy - st.h / 2, st.zoom); }

    function layoutTiles() {
      const base = BASES[st.base], z = st.zoom, n = 2 ** z, [cx, cy] = centerPx();
      attr.textContent = base.attr; attr.hidden = !base.attr;
      if (!base.url) { for (const img of tiles.values()) img.remove(); tiles.clear(); return; }
      const x0 = Math.floor((cx - st.w / 2) / TILE), x1 = Math.floor((cx + st.w / 2) / TILE), y0 = Math.max(0, Math.floor((cy - st.h / 2) / TILE)), y1 = Math.min(n - 1, Math.floor((cy + st.h / 2) / TILE));
      const want = new Set();
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const wx = ((x % n) + n) % n, key = `${st.base}/${z}/${wx}/${y}`;
        want.add(key + '@' + x);
        let img = tiles.get(key + '@' + x);
        if (!img) { img = new Image(); img.draggable = false; img.alt = ''; img.onerror = () => img.classList.add('err'); img.src = base.url(z, wx, y); tilesEl.appendChild(img); tiles.set(key + '@' + x, img); }
        img.style.transform = `translate(${Math.round(x * TILE - cx + st.w / 2)}px, ${Math.round(y * TILE - cy + st.h / 2)}px)`;
      }
      for (const [k, img] of tiles) if (!want.has(k)) { img.remove(); tiles.delete(k); }
    }

    const stage = () => window.Stage || { hex: () => '#B9B2A8', is: () => false };
    const skey = p => String(p.stage || '').trim().toLowerCase();
    // A person: a disc in the stage color. Closed is an ink rounded square. A new lead's lemon disc gets a thin ink
    // ring so it holds on ivory. Everyone else gets a hairline of ivory, so neighbors in a dense area stay separate.
    function person(x, y, r, p, sel) {
      const k = skey(p), fill = stage().hex(k);
      ctx.beginPath();
      if (k === 'closed') { const q = r * .95; ctx.roundRect ? ctx.roundRect(x - q, y - q, q * 2, q * 2, 2) : ctx.rect(x - q, y - q, q * 2, q * 2); }
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = k === 'new lead' ? INK : IVORY; ctx.stroke();
      if (sel) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); }
    }
    function dot(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
    function house(x, y, s, fill, sel) {
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y - s * .1); ctx.lineTo(x + s * .75, y - s * .1); ctx.lineTo(x + s * .75, y + s * .8);
      ctx.lineTo(x - s * .75, y + s * .8); ctx.lineTo(x - s * .75, y - s * .1); ctx.lineTo(x - s, y - s * .1); ctx.closePath();
      ctx.fillStyle = IVORY; ctx.fill(); ctx.lineWidth = sel ? 2.5 : 1.4; ctx.strokeStyle = INK; ctx.stroke();
    }
    function diamond(x, y, s, fill, sel) {
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = sel ? 2.5 : 1; ctx.strokeStyle = sel ? INK : IVORY; ctx.stroke();
    }

    // ---- the basemap: ivory, the river, the oxbow, the place names. Drawn first, under everything.
    const serif = () => '"Instrument Serif", "Iowan Old Style", Georgia, serif', sans = () => 'Nunito, -apple-system, "Helvetica Neue", sans-serif';
    const pxPerMeter = lat => 2 ** st.zoom * TILE / (40075016.686 * Math.cos(lat * Math.PI / 180));
    function ribbon(line, meters, min, color) {
      const pts = line.map(([a, b]) => toScreen(a, b));
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(min, Math.min(90, meters * pxPerMeter(30.5))); ctx.strokeStyle = color; ctx.stroke();
      return ctx.lineWidth;
    }
    function drawBase() {
      if (st.base !== 'paper') return;
      ctx.fillStyle = IVORY; ctx.fillRect(0, 0, st.w, st.h);
      const w = ribbon(RIVER, 1900, opts.still ? 4 : 8, SLATE);
      ribbon(FALSE_RIVER, 700, opts.still ? 2 : 3.5, SLATE_SOFT);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if (!opts.still && st.zoom >= 9) { const [x, y] = toScreen(30.6, -91.3); ctx.font = 'italic 13px ' + serif(); ctx.fillStyle = SLATE; ctx.fillText('Mississippi', x - w / 2 - 44, y); }
    }
    // Place names with a count of the people pinned there, set over the pins. An ivory halo keeps the type clear of
    // the water and of the pins beneath it.
    function drawPlaces() {
      if (st.base !== 'paper') return;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
      for (const pl of PLACES) {
        const [x, y] = toScreen(pl.at[0], pl.at[1]); if (x < -80 || y < -40 || x > st.w + 80 || y > st.h + 40) continue;
        const size = opts.still ? Math.max(9, pl.size * .52) : pl.size * (st.zoom >= 11 ? 1.15 : st.zoom <= 9 ? .8 : 1), top = y - (opts.still ? 8 : 20);
        ctx.font = `${size}px ${serif()}`; ctx.lineWidth = 5; ctx.strokeStyle = IVORY; ctx.strokeText(pl.name, x, top); ctx.fillStyle = INK; ctx.fillText(pl.name, x, top);
        const n = st.data.pins.filter(p => pl.cities.includes(String(p.city || '').trim().toLowerCase())).length;
        if (n >= 5 && !opts.still) { ctx.font = '11px ' + sans(); ctx.strokeText(`${n} people`, x, top + 15); ctx.fillStyle = STONE; ctx.fillText(`${n} people`, x, top + 15); }
      }
    }

    // Farm names never sit on top of each other: the selected farm goes first, then bigger names, and a label whose
    // box would overlap one already drawn is nudged below, then above, then left out at this zoom.
    // Drawn last, after every pin, which are the obstacles (st.hits).
    function drawLabels(labels) {
      ctx.font = '600 11px ' + sans(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const s of placeLabels(labels, st.hits, t => ctx.measureText(t).width, { w: cv.clientWidth, h: cv.clientHeight })) {
        ctx.fillStyle = 'rgba(251,248,243,.9)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(s.x0, s.y0, s.w, s.h, 4) : ctx.rect(s.x0, s.y0, s.w, s.h); ctx.fill();
        ctx.fillStyle = s.on ? INK : GRAPHITE; ctx.fillText(s.name, s.x + s.dx, s.y + s.dy + .5);
      }
      ctx.textBaseline = 'alphabetic';
    }
    // A farm is a dashed graphite enclosure with its name. Graphite, never a stage color.
    function drawFarms() {
      const labels = [];
      for (const f of st.data.farms) {
        if (!f.polygon || f.polygon.length < 3) continue;
        const pts = f.polygon.map(([a, b]) => toScreen(a, b));
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        const on = st.data.farm === f.id;
        ctx.fillStyle = on ? 'rgba(20,16,14,.05)' : 'rgba(20,16,14,.02)'; ctx.fill();
        ctx.setLineDash([6, 4]); ctx.lineWidth = on ? 1.8 : 1.2; ctx.strokeStyle = GRAPHITE; ctx.stroke(); ctx.setLineDash([]);
        if (!opts.still) labels.push({ name: f.name, x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: Math.max(...pts.map(p => p[1])) + 14, on });
      }
      if (st.draw) {
        const pts = st.draw.pts.map(([a, b]) => toScreen(a, b));
        if (st.draw.hover && pts.length) pts.push(st.draw.hover);
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = GRAPHITE; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(20,16,14,.04)'; ctx.fill();
        st.draw.pts.forEach(([a, b], i) => { const [x, y] = toScreen(a, b); dot(x, y, i === 0 ? 6 : 4, GRAPHITE); });
      }
      return labels;
    }

    function draw() {
      if (st.dead) return;
      layoutTiles();
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== st.w * dpr || cv.height !== st.h * dpr) { cv.width = st.w * dpr; cv.height = st.h * dpr; cv.style.width = st.w + 'px'; cv.style.height = st.h + 'px'; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, st.w, st.h);
      drawBase();
      const farmLabels = drawFarms();
      st.hits = [];
      const pad = 20, inView = ([x, y]) => x > -pad && y > -pad && x < st.w + pad && y < st.h + pad;
      // Every person is their own pin at their own address, however dense the area: a constellation, not a numbered disc.
      // The pins only get smaller as more of them share the view. The selected pin is drawn last, on top.
      const people = st.data.pins.map(p => ({ p, s: toScreen(p.lat, p.lng) })).filter(o => inView(o.s));
      const r = opts.still ? 2.6 : people.length > 900 ? 3 : people.length > 300 ? 4 : 5.2;
      for (const o of people.sort((a, b) => (a.p.key === st.data.selected) - (b.p.key === st.data.selected))) {
        const sel = o.p.key === st.data.selected;
        person(o.s[0], o.s[1], sel ? r + 1.5 : r, o.p, sel);
        st.hits.push({ x: o.s[0], y: o.s[1], r: r + 3, pin: o.p });
      }
      for (const m of st.data.market) {
        const s = toScreen(m.lat, m.lng); if (!inView(s)) continue;
        const sel = m.key === st.data.selected;
        diamond(s[0], s[1], sel ? 8 : 5.5, MARKET[m.type] || '#B9B2A8', sel);
        st.hits.push({ x: s[0], y: s[1], r: 8, pin: m });
      }
      for (const d of st.data.deals) {
        const s = toScreen(d.lat, d.lng); if (!inView(s)) continue;
        const sel = d.key === st.data.selected;
        house(s[0], s[1], sel ? 11 : 8.5, STAGE[d.stage] || '#B9B2A8', sel);
        st.hits.push({ x: s[0], y: s[1], r: 11, pin: d });
      }
      drawPlaces();
      drawLabels(farmLabels);
      cancelAnimationFrame(st.raf);
    }

    function emitMove() { opts.onMove && opts.onMove({ center: st.center.slice(), zoom: st.zoom }); }
    function zoomAt(dz, sx, sy) {
      const z = clampZoom(st.zoom + dz); if (z === st.zoom) return;
      const ll = toLatLng(sx, sy); st.zoom = z;
      const [px, py] = project(ll[0], ll[1], z); st.center = unproject(px - (sx - st.w / 2), py - (sy - st.h / 2), z);
      draw(); emitMove();
    }

    // ---- pointer (a still map, the Home preview, takes none)
    let drag = null;
    if (opts.still) cv.style.pointerEvents = 'none';
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = { x: e.offsetX, y: e.offsetY, c: centerPx(), moved: 0 }; });
    cv.addEventListener('pointermove', e => {
      if (st.draw) { st.draw.hover = [e.offsetX, e.offsetY]; if (!drag) draw(); }
      if (!drag) { const h = hitAt(e.offsetX, e.offsetY); cv.style.cursor = st.draw ? 'crosshair' : h ? 'pointer' : 'grab'; return; }
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
      if (drag.moved > 3) { cv.style.cursor = 'grabbing'; st.center = unproject(drag.c[0] - dx, drag.c[1] - dy, st.zoom); draw(); }
    });
    cv.addEventListener('pointerup', e => {
      const d = drag; drag = null; if (!d) return;
      if (d.moved > 3) { emitMove(); return; }
      if (st.draw) { addVertex(e.offsetX, e.offsetY); return; }
      const h = hitAt(e.offsetX, e.offsetY);
      opts.onPick && opts.onPick(h ? h.pin : null);
    });
    cv.addEventListener('dblclick', e => { e.preventDefault(); if (st.draw) { finishDraw(); return; } zoomAt(1, e.offsetX, e.offsetY); });
    let wheelAt = 0;
    cv.addEventListener('wheel', e => { e.preventDefault(); const t = performance.now(); if (t - wheelAt < 180) return; wheelAt = t; zoomAt(e.deltaY < 0 ? 1 : -1, e.offsetX, e.offsetY); }, { passive: false });
    if (!opts.still) el.querySelector('.pm-zoom').addEventListener('click', e => { const b = e.target.closest('button'); if (b) zoomAt(Number(b.dataset.z), st.w / 2, st.h / 2); });
    function hitAt(x, y) { for (let i = st.hits.length - 1; i >= 0; i--) { const h = st.hits[i]; if ((h.x - x) ** 2 + (h.y - y) ** 2 <= h.r ** 2) return h; } return null; }

    // ---- farm drawing
    function addVertex(x, y) {
      const pts = st.draw.pts;
      if (pts.length >= 3) { const [fx, fy] = toScreen(pts[0][0], pts[0][1]); if ((fx - x) ** 2 + (fy - y) ** 2 < 100) { finishDraw(); return; } }
      pts.push(toLatLng(x, y).map(v => Math.round(v * 1e6) / 1e6)); setHint(); draw();
    }
    function setHint() { const n = st.draw ? st.draw.pts.length : 0; hint.hidden = !st.draw; hint.textContent = n < 3 ? `Click the map to place corners (${n} so far). Esc cancels.` : `${n} corners. Double-click, Enter, or click the first corner to finish.`; }
    function finishDraw() { const d = st.draw; if (!d || d.pts.length < 3) return; st.draw = null; setHint(); draw(); d.done(d.pts); }
    function cancelDraw() { const d = st.draw; st.draw = null; setHint(); draw(); if (d) d.done(null); }
    function onKey(e) { if (!st.draw || e.target.matches('input, textarea, select')) return; if (e.key === 'Escape') { e.stopPropagation(); cancelDraw(); } else if (e.key === 'Enter') finishDraw(); else if (e.key === 'Backspace') { st.draw.pts.pop(); setHint(); draw(); } }
    document.addEventListener('keydown', onKey, true);

    const ro = new ResizeObserver(() => { st.w = el.clientWidth; st.h = el.clientHeight; draw(); });
    ro.observe(el); st.w = el.clientWidth; st.h = el.clientHeight;

    function fit(points, maxZoom = 15) {
      const pts = (points || []).filter(p => p && isFinite(p[0]) && isFinite(p[1])); if (!pts.length || !st.w) return;
      let z = clampZoom(maxZoom);
      for (; z > 3; z--) {
        const xy = pts.map(([a, b]) => project(a, b, z)), xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
        if (Math.max(...xs) - Math.min(...xs) <= st.w - 60 && Math.max(...ys) - Math.min(...ys) <= st.h - 60) break;
      }
      const xy = pts.map(([a, b]) => project(a, b, z)), xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
      st.zoom = z; st.center = unproject((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, z); draw(); emitMove();
    }
    draw();
    // The place names are set in a web font: draw once more when it arrives, so they never stay in the stand-in serif.
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(() => draw());
    const api = {
      setData(d) { st.data = { ...st.data, ...d }; draw(); },
      setBase(b) { if (!BASES[b] || b === st.base) return; st.base = b; st.zoom = clampZoom(st.zoom); for (const img of tiles.values()) img.remove(); tiles.clear(); draw(); },
      fit,
      focus(lat, lng, zoom = 16) { st.zoom = clampZoom(zoom); st.center = [lat, lng]; draw(); emitMove(); },
      bounds() { const a = toLatLng(0, 0), b = toLatLng(st.w, st.h); return { north: a[0], west: a[1], south: b[0], east: b[1] }; },
      startDraw(done) { st.draw = { pts: [], hover: null, done }; setHint(); draw(); },
      cancelDraw, drawing: () => !!st.draw,
      view: () => ({ center: st.center.slice(), zoom: st.zoom }),
      destroy() { st.dead = true; cancelAnimationFrame(st.raf); ro.disconnect(); document.removeEventListener('keydown', onKey, true); el.innerHTML = ''; },
    };
    return api;
  }

  // Ray casting, [lat, lng] pairs. Same rule as aire/map-crm/geo.py so the screen and the feed agree.
  function inPolygon(lat, lng, poly) {
    let inside = false;
    if (!poly || poly.length < 3) return false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return { create, inPolygon, placeLabels, STAGE, MARKET, PLACES, RIVER, FALSE_RIVER, HOME };
})();
