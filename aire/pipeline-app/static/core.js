/* Pipeline core: a particle neural network on a canvas. Five clusters, one per band, sized by the feed's counts.
   Edges link near nodes, streaks run along edges, a radar sweep turns. The voice state drives the energy:
   idle breathes, listening tightens, thinking fires streaks, speaking pulses with the words. */
'use strict';
const Core = (() => {
  const COLORS = { hot: [255, 92, 122], warm: [255, 181, 71], lukewarm: [53, 240, 200], cold: [25, 211, 255], 'ice-cold': [120, 160, 200] };
  const ORDER = ['hot', 'warm', 'lukewarm', 'cold', 'ice-cold'];
  let canvas, ctx, W, H, nodes = [], edges = [], streaks = [], raf = 0, t0 = performance.now();
  let state = 'idle', energy = 0.25, target = 0.25, sweep = 0, reduced = false, lastKey = '';

  function build(counts) {
    const total = Math.max(1, ORDER.reduce((s, k) => s + (counts[k] || 0), 0));
    nodes = []; edges = []; streaks = [];
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
    ORDER.forEach((band, bi) => {
      const share = (counts[band] || 0) / total;
      const n = Math.max(6, Math.round(14 + share * 70));
      const ang = (bi / ORDER.length) * Math.PI * 2 - Math.PI / 2;
      const ccx = cx + Math.cos(ang) * R * 0.55, ccy = cy + Math.sin(ang) * R * 0.55 * 0.8;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * (0.28 + share * 0.25);
        nodes.push({ x: ccx + Math.cos(a) * r, y: ccy + Math.sin(a) * r * 0.8, ox: 0, oy: 0, band, c: COLORS[band], ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.8, s: 1 + Math.random() * 1.6 });
      }
    });
    // a few bridge nodes in the middle so the clusters read as one brain
    for (let i = 0; i < 16; i++) nodes.push({ x: cx + (Math.random() - .5) * R * 0.8, y: cy + (Math.random() - .5) * R * 0.5, ox: 0, oy: 0, band: 'cold', c: COLORS.cold, ph: Math.random() * 6, sp: 0.6, s: 1.2 });
    const maxD = R * 0.26;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.hypot(dx, dy);
      if (d < maxD && Math.random() < 0.55) edges.push([i, j, d]);
    }
  }
  function fire(n = 1) { for (let k = 0; k < n && edges.length; k++) { const e = edges[(Math.random() * edges.length) | 0]; streaks.push({ e, p: 0, v: 0.012 + Math.random() * 0.02, dir: Math.random() < 0.5 ? 1 : -1 }); } }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    energy += (target - energy) * 0.04;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
    // radial glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
    g.addColorStop(0, `rgba(25,211,255,${0.10 + energy * 0.12})`); g.addColorStop(0.6, 'rgba(25,211,255,0.03)'); g.addColorStop(1, 'rgba(25,211,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // orbit rings and radar sweep
    ctx.lineWidth = 1;
    [1.0, 0.86].forEach((k, i) => { ctx.beginPath(); ctx.ellipse(cx, cy, R * k, R * k * 0.78, 0, 0, Math.PI * 2); ctx.strokeStyle = `rgba(25,211,255,${0.22 - i * 0.08})`; ctx.setLineDash(i ? [2, 6] : [1, 4]); ctx.stroke(); });
    ctx.setLineDash([]);
    if (!reduced) sweep += 0.004 + energy * 0.012;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(sweep, cx, cy) : null;
    if (sg) { sg.addColorStop(0, 'rgba(53,240,200,0.0)'); sg.addColorStop(0.08, 'rgba(53,240,200,0.14)'); sg.addColorStop(0.1, 'rgba(53,240,200,0)'); sg.addColorStop(1, 'rgba(53,240,200,0)'); ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.78, 0, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // node drift
    const jitter = reduced ? 0 : 1.5 + energy * 4;
    nodes.forEach(n => { n.ox = Math.sin(t * n.sp + n.ph) * jitter; n.oy = Math.cos(t * n.sp * 0.8 + n.ph) * jitter * 0.8; });
    // edges
    ctx.lineWidth = 0.7;
    edges.forEach(([i, j, d]) => {
      const a = nodes[i], b = nodes[j];
      const alpha = (0.10 + energy * 0.18) * (1 - d / (R * 0.26));
      ctx.strokeStyle = `rgba(${a.c[0]},${a.c[1]},${a.c[2]},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(a.x + a.ox, a.y + a.oy); ctx.lineTo(b.x + b.ox, b.y + b.oy); ctx.stroke();
    });
    // streaks
    if (!reduced && Math.random() < (state === 'thinking' ? 0.45 : state === 'speaking' ? 0.3 : state === 'listening' ? 0.12 : 0.05)) fire(1);
    streaks = streaks.filter(s => s.p <= 1);
    streaks.forEach(s => {
      s.p += s.v;
      const [i, j] = s.e, a = s.dir > 0 ? nodes[i] : nodes[j], b = s.dir > 0 ? nodes[j] : nodes[i];
      const x = a.x + a.ox + (b.x + b.ox - a.x - a.ox) * s.p, y = a.y + a.oy + (b.y + b.oy - a.y - a.oy) * s.p;
      const x2 = a.x + a.ox + (b.x + b.ox - a.x - a.ox) * Math.max(0, s.p - 0.18), y2 = a.y + a.oy + (b.y + b.oy - a.y - a.oy) * Math.max(0, s.p - 0.18);
      const lg = ctx.createLinearGradient(x2, y2, x, y); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(${a.c[0]},${a.c[1]},${a.c[2]},0.95)`);
      ctx.strokeStyle = lg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    });
    // nodes
    nodes.forEach(n => {
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 * n.sp + n.ph) * (0.5 + energy);
      const r = n.s * (0.9 + pulse * 0.6);
      ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${(0.45 + pulse * 0.5).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(n.x + n.ox, n.y + n.oy, r, 0, Math.PI * 2); ctx.fill();
      if (n.s > 2.2) { ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.12)`; ctx.beginPath(); ctx.arc(n.x + n.ox, n.y + n.oy, r * 3.2, 0, Math.PI * 2); ctx.fill(); }
    });
    // speaking ring: a breathing circle around the center when it talks
    if (state === 'speaking' || state === 'listening') {
      const k = state === 'speaking' ? 0.5 + 0.5 * Math.sin(t * 9) : 0.5 + 0.5 * Math.sin(t * 2.5);
      ctx.strokeStyle = state === 'speaking' ? `rgba(53,240,200,${0.25 + k * 0.5})` : `rgba(25,211,255,${0.2 + k * 0.4})`;
      ctx.lineWidth = 1.5 + k * 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, R * (0.3 + k * 0.08), R * (0.3 + k * 0.08) * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function resize(counts) {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, r.width); H = Math.max(160, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const key = `${Math.round(W)}x${Math.round(H)}:${JSON.stringify(counts || {})}`;
    if (key !== lastKey || !nodes.length) { build(counts || {}); lastKey = key; }
  }
  return {
    mount(el, counts) {
      if (canvas === el) return;
      canvas = el; ctx = canvas.getContext('2d');
      reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resize(counts); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      let ro; try { ro = new ResizeObserver(() => resize(counts)); ro.observe(canvas); } catch (e) { }
    },
    setState(s) { state = s; target = { idle: 0.25, listening: 0.55, thinking: 0.95, speaking: 0.8 }[s] ?? 0.25; if (s === 'thinking') fire(8); },
    burst() { fire(10); },
    unmount() { cancelAnimationFrame(raf); canvas = null; },
  };
})();

window.Core = Core;
