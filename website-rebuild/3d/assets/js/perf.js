// Times the page on the machine it is open on. It scrolls the whole story at a steady pace, draws every frame,
// and reports how long the frames took. Started with ?perf=1, or by pressing Shift+P three times.
// The build machine has no graphics card, so this is the only way to get a real number: open the page on a
// real phone or laptop, run it, and copy the result into judge/3d-scorecards.md.

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) { return 'unknown'; }
}

function card(lines, text) {
  let el = document.getElementById('perf-card');
  if (!el) {
    el = document.createElement('div'); el.id = 'perf-card';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999;max-width:min(92vw,560px);' +
      'background:#14100E;color:#FBF8F3;border:1px solid rgba(251,248,243,.25);border-radius:10px;padding:22px 24px;' +
      'font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 20px 60px rgba(0,0,0,.45);white-space:pre-wrap';
    document.body.appendChild(el);
  }
  el.textContent = lines.join('\n');
  if (text) {
    const row = document.createElement('div'); row.style.cssText = 'margin-top:16px;display:flex;gap:10px';
    const mk = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'font:inherit;color:#14100E;background:#E87757;border:0;border-radius:6px;padding:8px 14px;cursor:pointer'; b.onclick = fn; row.appendChild(b); return b; };
    const copy = mk('Copy result', () => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { copy.textContent = 'Copied'; }, () => { copy.textContent = 'Select and copy the text above'; }); });
    mk('Close', () => el.remove());
    el.appendChild(row);
  }
  return el;
}

const stats = (times) => {
  const s = times.slice().sort((a, b) => a - b), n = s.length;
  const median = pct(s, 0.5), hz = Math.round(1000 / median);
  const budget = 1000 / Math.min(hz, 60) * 1.25;   // a frame that took a quarter longer than its slot counts as late
  return {
    frames: n, median_ms: +median.toFixed(2), p95_ms: +pct(s, 0.95).toFixed(2), p99_ms: +pct(s, 0.99).toFixed(2), worst_ms: +s[n - 1].toFixed(2),
    fps_median: +(1000 / median).toFixed(1), late_frames_pct: +(times.filter((x) => x > budget).length / n * 100).toFixed(1),
  };
};

// opts: stage, force(on) makes the page draw every frame, phases: [{ name, seconds, begin(), drive(u), end() }]
export function runPerf(opts) {
  if (runPerf.busy) return; runPerf.busy = true;
  const { stage, force, phases } = opts, warm = 1.5, out = {};
  const total = phases.reduce((a, p) => a + p.seconds + warm, 0);
  force(true);
  card(['Timing this page. Hands off for about ' + Math.round(total) + ' seconds.']);
  const done = () => {
    force(false); runPerf.busy = false;
    const info = stage.info ? stage.info() : {};
    const r = Object.assign({ when: new Date().toISOString() }, out, {
      gpu: gpuName(stage.renderer.getContext()), quality: stage.quality, pixel_ratio: +stage.renderer.getPixelRatio().toFixed(2),
      canvas: stage.w + 'x' + stage.h, viewport: innerWidth + 'x' + innerHeight, calls: info.calls, triangles: info.triangles,
      agent: navigator.userAgent,
    });
    window.__perf = r;
    const lines = ['Frame timing, every frame drawn', ''];
    for (const p of phases) {
      const x = out[p.name];
      lines.push(p.label, '  median ' + x.median_ms + ' ms (' + x.fps_median + ' a second)   95th ' + x.p95_ms + ' ms   worst ' + x.worst_ms + ' ms',
        '  late   ' + x.late_frames_pct + '% of ' + x.frames + ' frames', '');
    }
    lines.push('graphics ' + r.gpu, 'drawn at ' + r.canvas + ', pixel ratio ' + r.pixel_ratio + ', ' + r.quality + ' setting');
    card(lines, JSON.stringify(r, null, 2));
  };
  const run = (i) => {
    if (i >= phases.length) { done(); return; }
    const p = phases[i], times = [];
    let t0 = 0, prev = 0;
    if (p.begin) p.begin();
    p.drive(0);
    const step = (now) => {
      if (!t0) { t0 = now; prev = now; requestAnimationFrame(step); return; }
      const t = (now - t0) / 1000;
      if (t > warm) times.push(now - prev);
      prev = now;
      const u = Math.min(1, Math.max(0, (t - warm) / p.seconds));
      p.drive(u);
      if (u < 1) { requestAnimationFrame(step); return; }
      out[p.name] = stats(times);
      if (p.end) p.end();
      setTimeout(() => run(i + 1), 600);
    };
    requestAnimationFrame(step);
  };
  run(0);
}
