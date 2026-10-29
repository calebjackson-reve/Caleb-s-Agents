// Pipeline map. A small slippy map with no library and no build step, same as the rest of the app.
// Tiles: OpenStreetMap for streets, USGS The National Map imagery (public domain) for satellite. Both free, both credited
// on the map. Pins, deals, market rows and farms are drawn on one canvas. Past 200 pins in view they cluster.
// PMap.create(el, opts) -> { setData, setBase, fit, focus, bounds, startDraw, cancelDraw, view, destroy }
window.PMap = (function () {
  const TILE = 256;
  const BASES = {
    street: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, max: 19, attr: '© OpenStreetMap contributors' },
    sat: { url: (z, x, y) => `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}`, max: 16, attr: 'Imagery: USGS The National Map' },
  };
  const BAND = { hot: '#ff5c7a', warm: '#ffb547', lukewarm: '#35f0c8', cold: '#4f9dff', 'ice-cold': '#9fb4cf', '': '#5d6b7c' };
  const STAGE = { lead: '#9fb4cf', consult: '#4f9dff', active: '#35f0c8', showing: '#19d3ff', under_contract: '#a78bfa' };
  const MARKET = { permit: '#ffb547', new_listing: '#35f0c8', price_change: '#19d3ff', back_on_market: '#19d3ff', pending: '#a78bfa', sold: '#ff5c7a' };
  const CLUSTER_PAST = 200, CELL = 54;

  const project = (lat, lng, z) => { const s = TILE * 2 ** z, sin = Math.sin(lat * Math.PI / 180); return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
  const unproject = (x, y, z) => { const s = TILE * 2 ** z, n = Math.PI - 2 * Math.PI * y / s; return [180 / Math.PI * Math.atan(Math.sinh(n)), x / s * 360 - 180]; };

  function create(el, opts = {}) {
    el.classList.add('pmap');
    el.innerHTML = '<div class="pm-tiles"></div><canvas class="pm-canvas"></canvas><div class="pm-zoom"><button data-z="1" title="Zoom in">+</button><button data-z="-1" title="Zoom out">−</button></div><div class="pm-attr"></div><div class="pm-hint" hidden></div>';
    const tilesEl = el.querySelector('.pm-tiles'), cv = el.querySelector('.pm-canvas'), ctx = cv.getContext('2d'), attr = el.querySelector('.pm-attr'), hint = el.querySelector('.pm-hint');
    const st = { center: (opts.view && opts.view.center) || [30.45, -91.15], zoom: (opts.view && opts.view.zoom) || 10, base: opts.base || 'street',
      data: { pins: [], deals: [], market: [], farms: [], selected: '' }, hits: [], w: 0, h: 0, draw: null, raf: 0, pulse: 0, dead: false };
    const tiles = new Map();

    function clampZoom(z) { return Math.max(3, Math.min(BASES[st.base].max, z)); }
    function centerPx() { return project(st.center[0], st.center[1], st.zoom); }
    function toScreen(lat, lng) { const [cx, cy] = centerPx(), [x, y] = project(lat, lng, st.zoom); return [x - cx + st.w / 2, y - cy + st.h / 2]; }
    function toLatLng(sx, sy) { const [cx, cy] = centerPx(); return unproject(cx + sx - st.w / 2, cy + sy - st.h / 2, st.zoom); }

    function layoutTiles() {
      const base = BASES[st.base], z = st.zoom, n = 2 ** z, [cx, cy] = centerPx();
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
      attr.textContent = base.attr;
    }

    function dot(x, y, r, fill, ring) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = ring ? 2.5 : 1.2; ctx.strokeStyle = ring || 'rgba(4,9,22,.85)'; ctx.stroke();
    }
    function house(x, y, s, fill, ring) {
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y - s * .1); ctx.lineTo(x + s * .75, y - s * .1); ctx.lineTo(x + s * .75, y + s * .8);
      ctx.lineTo(x - s * .75, y + s * .8); ctx.lineTo(x - s * .75, y - s * .1); ctx.lineTo(x - s, y - s * .1); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = ring ? 2.5 : 1.2; ctx.strokeStyle = ring || 'rgba(4,9,22,.9)'; ctx.stroke();
    }
    function diamond(x, y, s, fill, ring) {
      ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = ring ? 2.5 : 1; ctx.strokeStyle = ring || 'rgba(4,9,22,.9)'; ctx.stroke();
    }

    function drawFarms() {
      for (const f of st.data.farms) {
        if (!f.polygon || f.polygon.length < 3) continue;
        const pts = f.polygon.map(([a, b]) => toScreen(a, b));
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        const on = st.data.farm === f.id;
        ctx.fillStyle = on ? 'rgba(25,211,255,.14)' : 'rgba(25,211,255,.07)'; ctx.fill();
        ctx.setLineDash([6, 4]); ctx.lineWidth = on ? 2.4 : 1.6; ctx.strokeStyle = '#19d3ff'; ctx.stroke(); ctx.setLineDash([]);
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        ctx.font = '600 11px ' + getComputedStyle(document.body).getPropertyValue('--mono'); ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,9,22,.85)'; ctx.strokeText(f.name.toUpperCase(), cx, cy); ctx.fillStyle = '#d9f3ff'; ctx.fillText(f.name.toUpperCase(), cx, cy);
      }
      if (st.draw) {
        const pts = st.draw.pts.map(([a, b]) => toScreen(a, b));
        if (st.draw.hover && pts.length) pts.push(st.draw.hover);
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.lineWidth = 2; ctx.strokeStyle = '#35f0c8'; ctx.stroke(); ctx.fillStyle = 'rgba(53,240,200,.08)'; ctx.fill();
        st.draw.pts.forEach(([a, b], i) => { const [x, y] = toScreen(a, b); dot(x, y, i === 0 ? 6 : 4, '#35f0c8'); });
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
          const r = Math.min(26, 10 + Math.sqrt(list.length) * 2.2);
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(8,22,46,.86)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = BAND[top]; ctx.stroke();
          ctx.font = '700 11px ' + getComputedStyle(document.body).getPropertyValue('--mono'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d9f3ff'; ctx.fillText(String(list.length), x, y + .5); ctx.textBaseline = 'alphabetic';
          st.hits.push({ x, y, r: r + 2, cluster: list.map(o => o.p) });
        }
      } else {
        for (const o of people) {
          const sel = o.p.key === st.data.selected;
          if (o.p.new_lead) { pulsing = true; const k = (st.pulse % 60) / 60; ctx.beginPath(); ctx.arc(o.s[0], o.s[1], 6 + k * 14, 0, Math.PI * 2); ctx.strokeStyle = `rgba(53,240,200,${1 - k})`; ctx.lineWidth = 2; ctx.stroke(); }
          if (o.p.owes_reply) { ctx.beginPath(); ctx.arc(o.s[0], o.s[1], 9, 0, Math.PI * 2); ctx.strokeStyle = '#ffb547'; ctx.lineWidth = 1.5; ctx.stroke(); }
          dot(o.s[0], o.s[1], sel ? 7.5 : 5.5, BAND[o.p.band || ''] || BAND[''], sel ? '#ffffff' : null);
          st.hits.push({ x: o.s[0], y: o.s[1], r: 8, pin: o.p });
        }
      }
      for (const m of st.data.market) {
        const s = toScreen(m.lat, m.lng); if (!inView(s)) continue;
        const sel = m.key === st.data.selected;
        diamond(s[0], s[1], sel ? 8 : 5.5, MARKET[m.type] || '#ffb547', sel ? '#ffffff' : null);
        st.hits.push({ x: s[0], y: s[1], r: 8, pin: m });
      }
      for (const d of st.data.deals) {
        const s = toScreen(d.lat, d.lng); if (!inView(s)) continue;
        const sel = d.key === st.data.selected;
        house(s[0], s[1], sel ? 11 : 8.5, STAGE[d.stage] || '#a78bfa', sel ? '#ffffff' : null);
        st.hits.push({ x: s[0], y: s[1], r: 11, pin: d });
      }
      cancelAnimationFrame(st.raf);
      if (pulsing) st.raf = requestAnimationFrame(() => { st.pulse++; draw(); });
    }

    function emitMove() { opts.onMove && opts.onMove({ center: st.center.slice(), zoom: st.zoom }); }
    function zoomAt(dz, sx, sy) {
      const z = clampZoom(st.zoom + dz); if (z === st.zoom) return;
      const ll = toLatLng(sx, sy); st.zoom = z;
      const [px, py] = project(ll[0], ll[1], z); st.center = unproject(px - (sx - st.w / 2), py - (sy - st.h / 2), z);
      draw(); emitMove();
    }

    // ---- pointer
    let drag = null;
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
      if (h && h.cluster) { zoomAt(2, h.x, h.y); return; }
      opts.onPick && opts.onPick(h ? h.pin : null);
    });
    cv.addEventListener('dblclick', e => { e.preventDefault(); if (st.draw) { finishDraw(); return; } zoomAt(1, e.offsetX, e.offsetY); });
    let wheelAt = 0;
    cv.addEventListener('wheel', e => { e.preventDefault(); const t = performance.now(); if (t - wheelAt < 180) return; wheelAt = t; zoomAt(e.deltaY < 0 ? 1 : -1, e.offsetX, e.offsetY); }, { passive: false });
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
      bounds() { const a = toLatLng(0, 0), b = toLatLng(st.w, st.h); return { north: a[0], west: a[1], south: b[0], east: b[1] }; },
      startDraw(done) { st.draw = { pts: [], hover: null, done }; setHint(); draw(); },
      cancelDraw, drawing: () => !!st.draw,
      view: () => ({ center: st.center.slice(), zoom: st.zoom }),
      destroy() { st.dead = true; cancelAnimationFrame(st.raf); ro.disconnect(); document.removeEventListener('keydown', onKey, true); el.innerHTML = ''; },
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
  return { create, inPolygon, BAND, STAGE, MARKET };
})();
