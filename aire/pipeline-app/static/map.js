// Pipeline map. A small slippy map with no library and no build step, same as the rest of the app.
// Tiles: OpenStreetMap for streets (shown dark by a CSS filter on the same tiles, so no new tile provider),
// USGS The National Map imagery (public domain) for satellite. All free, all credited on the map.
// Pins, deals, market rows, farms and a searched place are drawn on one canvas. Past 200 pins in view they cluster.
// Zoom is smooth like Google Maps: fractional zoom levels scale the nearest tile set, wheel and pinch are continuous,
// buttons and double-click glide.
// PMap.create(el, opts) -> { setData, setBase, fit, focus, flyTo, bounds, startDraw, cancelDraw, view, destroy }
window.PMap = (function () {
  const TILE = 256;
  const OSM = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const BASES = {
    dark: { url: OSM, max: 19, attr: '© OpenStreetMap contributors', cls: 'dark' },
    street: { url: OSM, max: 19, attr: '© OpenStreetMap contributors', cls: 'light' },
    sat: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}`, max: 16, attr: 'Imagery: USGS The National Map', cls: 'sat' },
  };
  // Black and coral. Bands run hot to cold from coral through tan to slate so they still read apart.
  const CORAL = '#ff5a4f';
  const BAND = { hot: CORAL, warm: '#ff9a62', lukewarm: '#e6c49a', cold: '#8fa3b8', 'ice-cold': '#5f6b78', '': '#3f444b' };
  const STAGE = { lead: '#8f8a84', consult: '#e6c49a', active: '#ff9a62', showing: '#ff9a62', under_contract: CORAL };
  const MARKET = { permit: '#e6c49a', new_listing: '#ffffff', price_change: '#ff9a62', back_on_market: '#ff9a62', pending: '#b8b2aa', sold: CORAL, listing_change: '#8f8a84' };
  const CLUSTER_PAST = 200, CELL = 54;

  const project = (lat, lng, z) => { const s = TILE * 2 ** z, sin = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
  const unproject = (x, y, z) => { const s = TILE * 2 ** z, n = Math.PI - 2 * Math.PI * y / s; return [180 / Math.PI * Math.atan(Math.sinh(n)), x / s * 360 - 180]; };

  function create(el, opts = {}) {
    el.classList.add('pmap');
    el.innerHTML = '<div class="pm-tiles"></div><canvas class="pm-canvas"></canvas><div class="pm-zoom"><button data-z="1" title="Zoom in" aria-label="Zoom in">+</button><i></i><button data-z="-1" title="Zoom out" aria-label="Zoom out">−</button></div><div class="pm-attr"></div><div class="pm-hint" hidden></div>';
    const tilesEl = el.querySelector('.pm-tiles'), cv = el.querySelector('.pm-canvas'), ctx = cv.getContext('2d'), attr = el.querySelector('.pm-attr'), hint = el.querySelector('.pm-hint');
    const st = { center: (opts.view && opts.view.center) || [30.45, -91.15], zoom: (opts.view && opts.view.zoom) || 10, base: BASES[opts.base] ? opts.base : 'dark',
      data: { pins: [], deals: [], market: [], farms: [], selected: '', place: null }, hits: [], w: 0, h: 0, draw: null, raf: 0, anim: 0, moveT: 0, pulse: 0, dead: false };
    const tiles = new Map();

    function clampZoom(z) { return Math.max(3, Math.min(BASES[st.base].max, z)); }
    function centerPx() { return project(st.center[0], st.center[1], st.zoom); }
    function toScreen(lat, lng) { const [cx, cy] = centerPx(), [x, y] = project(lat, lng, st.zoom); return [x - cx + st.w / 2, y - cy + st.h / 2]; }
    function toLatLng(sx, sy) { const [cx, cy] = centerPx(); return unproject(cx + sx - st.w / 2, cy + sy - st.h / 2, st.zoom); }

    // Fractional zoom: draw the nearest whole-zoom tile set, scaled. A tile set changes only when the zoom
    // crosses a half step, so a pinch or wheel glide does not refetch tiles every frame.
    function layoutTiles() {
      const base = BASES[st.base], tz = Math.max(0, Math.min(base.max, Math.round(st.zoom))), n = 2 ** tz;
      const size = TILE * 2 ** (st.zoom - tz), [cx, cy] = centerPx();
      const x0 = Math.floor((cx - st.w / 2) / size), x1 = Math.floor((cx + st.w / 2) / size), y0 = Math.max(0, Math.floor((cy - st.h / 2) / size)), y1 = Math.min(n - 1, Math.floor((cy + st.h / 2) / size));
      const want = new Set();
      tilesEl.className = 'pm-tiles ' + (base.cls || '');
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const wx = ((x % n) + n) % n, key = `${st.base}/${tz}/${wx}/${y}@${x}`;
        want.add(key);
        let img = tiles.get(key);
        if (!img) { img = new Image(); img.draggable = false; img.alt = ''; img.onerror = () => img.classList.add('err'); img.onload = () => img.classList.add('in'); img.src = base.url(tz, wx, y); tilesEl.appendChild(img); tiles.set(key, img); }
        img.style.width = img.style.height = (size + .5) + 'px';
        img.style.transform = `translate(${x * size - cx + st.w / 2}px, ${y * size - cy + st.h / 2}px)`;
      }
      for (const [k, img] of tiles) if (!want.has(k)) { img.remove(); tiles.delete(k); }
      attr.textContent = base.attr;
    }

    const font = (w, px) => `${w} ${px}px ` + (getComputedStyle(el).getPropertyValue('--gm-font') || 'sans-serif');
    function shadow(on) { ctx.shadowColor = on ? 'rgba(0,0,0,.45)' : 'transparent'; ctx.shadowBlur = on ? 6 : 0; ctx.shadowOffsetY = on ? 2 : 0; }
    // A Google-style dot: solid fill, white edge.
    function dot(x, y, r, fill, ring) {
      shadow(true); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); shadow(false);
      ctx.lineWidth = ring ? 2.5 : 1.5; ctx.strokeStyle = ring || 'rgba(255,255,255,.92)'; ctx.stroke();
    }
    // A teardrop map pin whose tip sits on (x, y). Deals use it with a small house inside; the selected place uses it big in coral.
    function teardrop(x, y, s, fill, inner) {
      const r = s, cy = y - s * 1.75;
      shadow(true);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - r * .35, cy + r * 1.05, x - r, cy + r * .55, x - r, cy);
      ctx.arc(x, cy, r, Math.PI, 0);
      ctx.bezierCurveTo(x + r, cy + r * .55, x + r * .35, cy + r * 1.05, x, y);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); shadow(false);
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
      if (inner === 'house') {
        const h = r * .55, b = cy + h * .7;
        ctx.beginPath(); ctx.moveTo(x, cy - h); ctx.lineTo(x + h, cy - h * .05); ctx.lineTo(x + h * .7, cy - h * .05); ctx.lineTo(x + h * .7, b);
        ctx.lineTo(x - h * .7, b); ctx.lineTo(x - h * .7, cy - h * .05); ctx.lineTo(x - h, cy - h * .05); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
      } else { ctx.beginPath(); ctx.arc(x, cy, r * .38, 0, Math.PI * 2); ctx.fillStyle = inner || '#1a0f0e'; ctx.fill(); }
      return cy;
    }
    function diamond(x, y, s, fill, ring) {
      shadow(true); ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); shadow(false); ctx.lineWidth = ring ? 2.5 : 1.3; ctx.strokeStyle = ring || 'rgba(17,17,19,.9)'; ctx.stroke();
    }

    function drawFarms() {
      for (const f of st.data.farms) {
        if (!f.polygon || f.polygon.length < 3) continue;
        const pts = f.polygon.map(([a, b]) => toScreen(a, b));
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        const on = st.data.farm === f.id;
        ctx.fillStyle = on ? 'rgba(255,90,79,.16)' : 'rgba(255,90,79,.07)'; ctx.fill();
        ctx.setLineDash([7, 5]); ctx.lineWidth = on ? 2.4 : 1.6; ctx.strokeStyle = CORAL; ctx.stroke(); ctx.setLineDash([]);
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        ctx.font = font(600, 12); ctx.textAlign = 'center';
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(12,12,13,.85)'; ctx.strokeText(f.name, cx, cy); ctx.fillStyle = '#ffffff'; ctx.fillText(f.name, cx, cy);
      }
      if (st.draw) {
        const pts = st.draw.pts.map(([a, b]) => toScreen(a, b));
        if (st.draw.hover && pts.length) pts.push(st.draw.hover);
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.lineWidth = 2; ctx.strokeStyle = CORAL; ctx.stroke(); ctx.fillStyle = 'rgba(255,90,79,.08)'; ctx.fill();
        st.draw.pts.forEach(([a, b], i) => { const [x, y] = toScreen(a, b); dot(x, y, i === 0 ? 6 : 4, CORAL); });
      }
    }

    function draw() {
      if (st.dead) return;
      layoutTiles();
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== st.w * dpr || cv.height !== st.h * dpr) { cv.width = st.w * dpr; cv.height = st.h * dpr; cv.style.width = st.w + 'px'; cv.style.height = st.h + 'px'; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, st.w, st.h);
      drawFarms();
      st.hits = [];
      const pad = 20, inView = ([x, y]) => x > -pad && y > -pad && x < st.w + pad && y < st.h + pad;
      const people = st.data.pins.map(p => ({ p, s: toScreen(p.lat, p.lng) })).filter(o => inView(o.s));
      let pulsing = false;
      if (people.length > CLUSTER_PAST) {
        const cells = new Map();
        for (const o of people) { const k = Math.floor(o.s[0] / CELL) + ':' + Math.floor(o.s[1] / CELL); (cells.get(k) || cells.set(k, []).get(k)).push(o); }
        for (const list of cells.values()) {
          if (list.length === 1) { const o = list[0]; dot(o.s[0], o.s[1], 4.5, BAND[o.p.band || ''] || BAND['']); st.hits.push({ x: o.s[0], y: o.s[1], r: 7, pin: o.p }); continue; }
          const x = list.reduce((s, o) => s + o.s[0], 0) / list.length, y = list.reduce((s, o) => s + o.s[1], 0) / list.length;
          const top = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'].find(b => list.some(o => o.p.band === b)) || '';
          const r = Math.min(26, 11 + Math.sqrt(list.length) * 2.2);
          shadow(true); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(17,17,19,.92)'; ctx.fill(); shadow(false);
          ctx.lineWidth = 3; ctx.strokeStyle = BAND[top]; ctx.stroke();
          ctx.font = font(700, 12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(String(list.length), x, y + .5); ctx.textBaseline = 'alphabetic';
          st.hits.push({ x, y, r: r + 2, cluster: list.map(o => o.p) });
        }
      } else {
        for (const o of people) {
          const sel = o.p.key === st.data.selected;
          if (sel) continue; // the selected person is drawn last, as the big coral pin
          if (o.p.new_lead) { pulsing = true; const k = (st.pulse % 60) / 60; ctx.beginPath(); ctx.arc(o.s[0], o.s[1], 6 + k * 14, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,90,79,${1 - k})`; ctx.lineWidth = 2; ctx.stroke(); }
          if (o.p.owes_reply) { ctx.beginPath(); ctx.arc(o.s[0], o.s[1], 9.5, 0, Math.PI * 2); ctx.strokeStyle = '#ffd2a8'; ctx.lineWidth = 1.6; ctx.stroke(); }
          dot(o.s[0], o.s[1], 5.5, BAND[o.p.band || ''] || BAND['']);
          st.hits.push({ x: o.s[0], y: o.s[1], r: 8, pin: o.p });
        }
      }
      for (const m of st.data.market) {
        const s = toScreen(m.lat, m.lng); if (!inView(s)) continue;
        if (m.key === st.data.selected) continue;
        diamond(s[0], s[1], 5.5, MARKET[m.type] || '#e6c49a');
        st.hits.push({ x: s[0], y: s[1], r: 8, pin: m });
      }
      for (const d of st.data.deals) {
        const s = toScreen(d.lat, d.lng); if (!inView(s)) continue;
        if (d.key === st.data.selected) continue;
        const cy = teardrop(s[0], s[1], 8.5, STAGE[d.stage] || CORAL, 'house');
        st.hits.push({ x: s[0], y: cy, r: 11, pin: d });
      }
      // The selected pin and a searched place: the big coral pin, on top of everything.
      const all = st.data.selected ? st.data.pins.concat(st.data.market, st.data.deals) : [];
      const chosen = all.find(p => p.key === st.data.selected);
      for (const p of [chosen, st.data.place].filter(Boolean)) {
        if (p.lat == null) continue;
        const s = toScreen(p.lat, p.lng); if (!inView(s)) continue;
        ctx.beginPath(); ctx.ellipse(s[0], s[1], 6, 2.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
        const cy = teardrop(s[0], s[1], 13, CORAL, p.kind === 'deal' ? 'house' : '#1a0f0e');
        st.hits.push({ x: s[0], y: cy, r: 15, pin: p.kind === 'place' ? null : p, place: p.kind === 'place' ? p : null });
      }
      cancelAnimationFrame(st.raf);
      if (pulsing) st.raf = requestAnimationFrame(() => { st.pulse++; draw(); });
    }

    function emitMove() { clearTimeout(st.moveT); opts.onMove && opts.onMove({ center: st.center.slice(), zoom: st.zoom }); }
    function emitMoveSoon() { clearTimeout(st.moveT); st.moveT = setTimeout(emitMove, 160); }
    // Zoom around a screen point so the place under the pointer stays put.
    function setZoomAt(z, sx, sy, ll) {
      ll = ll || toLatLng(sx, sy); st.zoom = clampZoom(z);
      const [px, py] = project(ll[0], ll[1], st.zoom); st.center = unproject(px - (sx - st.w / 2), py - (sy - st.h / 2), st.zoom);
      draw();
    }
    const ease = t => 1 - Math.pow(1 - t, 3);
    function animate(frame, ms, done) {
      cancelAnimationFrame(st.anim); const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / ms); frame(ease(k)); if (k < 1 && !st.dead) st.anim = requestAnimationFrame(step); else done && done(); };
      st.anim = requestAnimationFrame(step);
    }
    function zoomAt(dz, sx, sy) {
      const z0 = st.zoom, z1 = clampZoom(Math.round(st.zoom + dz)); if (z1 === z0) return;
      const ll = toLatLng(sx, sy);
      animate(k => setZoomAt(z0 + (z1 - z0) * k, sx, sy, ll), 240, emitMove);
    }
    function flyTo(lat, lng, zoom) {
      const z0 = st.zoom, z1 = clampZoom(zoom == null ? Math.max(st.zoom, 15) : zoom), c0 = st.center.slice();
      animate(k => { st.zoom = z0 + (z1 - z0) * k; st.center = [c0[0] + (lat - c0[0]) * k, c0[1] + (lng - c0[1]) * k]; draw(); }, 420, emitMove);
    }

    // ---- pointer
    let drag = null;
    cv.addEventListener('pointerdown', e => { cancelAnimationFrame(st.anim); cv.setPointerCapture(e.pointerId); drag = { x: e.offsetX, y: e.offsetY, c: centerPx(), moved: 0 }; });
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
      if (h && h.cluster) { zoomAt(2, h.x, h.y); return; }
      if (h && h.place) { opts.onPlace && opts.onPlace(h.place); return; }
      opts.onPick && opts.onPick(h ? h.pin : null);
    });
    cv.addEventListener('dblclick', e => { e.preventDefault(); if (st.draw) { finishDraw(); return; } zoomAt(1, e.offsetX, e.offsetY); });
    // Wheel and trackpad pinch (ctrlKey) zoom continuously, the way Google Maps does.
    cv.addEventListener('wheel', e => {
      e.preventDefault(); cancelAnimationFrame(st.anim);
      const per = e.ctrlKey ? 0.012 : e.deltaMode === 1 ? 0.12 : 0.004;
      const dz = Math.max(-.8, Math.min(.8, -e.deltaY * per));
      setZoomAt(st.zoom + dz, e.offsetX, e.offsetY); emitMoveSoon();
    }, { passive: false });
    el.querySelector('.pm-zoom').addEventListener('click', e => { const b = e.target.closest('button'); if (b) zoomAt(Number(b.dataset.z), st.w / 2, st.h / 2); });
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
    return {
      setData(d) { st.data = { ...st.data, ...d }; draw(); },
      setBase(b) { if (!BASES[b] || b === st.base) return; st.base = b; st.zoom = clampZoom(st.zoom); for (const img of tiles.values()) img.remove(); tiles.clear(); draw(); },
      fit,
      focus(lat, lng, zoom = 16) { st.zoom = clampZoom(zoom); st.center = [lat, lng]; draw(); emitMove(); },
      flyTo,
      base: () => st.base,
      bounds() { const a = toLatLng(0, 0), b = toLatLng(st.w, st.h); return { north: a[0], west: a[1], south: b[0], east: b[1] }; },
      startDraw(done) { st.draw = { pts: [], hover: null, done }; setHint(); draw(); },
      cancelDraw, drawing: () => !!st.draw,
      view: () => ({ center: st.center.slice(), zoom: st.zoom }),
      destroy() { st.dead = true; cancelAnimationFrame(st.raf); cancelAnimationFrame(st.anim); clearTimeout(st.moveT); ro.disconnect(); document.removeEventListener('keydown', onKey, true); el.innerHTML = ''; },
    };
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
  return { create, inPolygon, BAND, STAGE, MARKET, CORAL };
})();
