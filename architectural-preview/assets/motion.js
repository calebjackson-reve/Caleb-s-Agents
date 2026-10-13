/* ==========================================================================
   Motion Kit
   Rebuilt from a teardown of heronaiapp.com. Nothing here is copied; each
   module re-implements the observed mechanic (same lerp factors, eases,
   durations and trigger points) in plain, readable code.

   Requires on the page before this file:
     gsap 3.13+, ScrollTrigger, SplitText (free since 3.13), Lenis 1.x

   Usage:
     MotionKit.init({ loader: true, cursor: true, header: '.mk-header' });
   or call modules one by one (see README.md).
   ========================================================================== */
(function (global) {
  'use strict';

  const MK = {};
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const rem = (n) => n * parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cssVar = (name, fallback) => (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
  const prefersReduced = () => global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = () => global.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const bp = () => { const w = global.innerWidth; return { w, isMobile: w <= 767, isTablet: w > 767 && w <= 991, isDesktop: w > 991 }; };
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const hexToRgb = (hex, fb) => { const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : fb; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  MK.util = { lerp, clamp, dist, rem, cssVar, prefersReduced, finePointer, bp };

  /* Shared pointer position, read by the cursor and the ruler. */
  const pointer = { x: global.innerWidth / 2, y: global.innerHeight / 2, moved: false };
  global.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true; }, { passive: true });
  global.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) { pointer.x = t.clientX; pointer.y = t.clientY; } }, { passive: true });
  MK.pointer = pointer;

  /* ------------------------------------------------------------------------
     1. Smooth scroll: Lenis driven by the GSAP ticker, ScrollTrigger synced.
     Heron: smoothWheel true, syncTouch true, smoothTouch false, lenis.raf fed
     from gsap.ticker, ScrollTrigger.update on every scroll event.
     ------------------------------------------------------------------------ */
  MK.scroll = {
    lenis: null,
    init(opts = {}) {
      if (!global.Lenis || !global.gsap) return null;
      const lenis = new global.Lenis({ smoothWheel: true, syncTouch: true, ...opts });
      lenis.on('scroll', global.ScrollTrigger.update);
      global.gsap.ticker.add((t) => lenis.raf(t * 1000));
      global.gsap.ticker.lagSmoothing(0);
      this.lenis = lenis;
      return lenis;
    },
    to(target, opts = {}) { if (this.lenis) this.lenis.scrollTo(target, opts); else if (typeof target === 'number') global.scrollTo(0, target); },
    stop() { this.lenis && this.lenis.stop(); },
    start() { this.lenis && this.lenis.start(); },
    on(fn) { if (this.lenis) this.lenis.on('scroll', fn); else global.addEventListener('scroll', () => fn({ scroll: global.scrollY, direction: 0 }), { passive: true }); },
  };

  /* ------------------------------------------------------------------------
     2. Header: hide on scroll down past a threshold, show on scroll up.
     ------------------------------------------------------------------------ */
  MK.header = {
    init(sel = '.mk-header', { threshold = 120 } = {}) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return;
      let last = 0;
      MK.scroll.on(({ scroll, direction }) => {
        const dir = direction || (scroll > last ? 1 : -1);
        last = scroll;
        el.classList.toggle('on-hide', dir > 0 && scroll > threshold);
      });
    },
  };

  /* ------------------------------------------------------------------------
     3. Canvas cursor.
     Observed: a full-screen <canvas id="canvas-cursor">, position eased with
     factor 0.18, a 34-point trail stroked at 1.4px whose alpha scales with
     pointer speed, a 9px square dot that only appears on interactive hover
     or while pressed, and a DOM "hover square" that scales 6/14 -> 1 over
     interactive elements and gets a border while pressed. Only enabled on
     (hover: hover) and (pointer: fine) and never with reduced motion.
     Elements under [data-cursor="hidden"] hide the whole thing.
     ------------------------------------------------------------------------ */
  class CanvasCursor {
    constructor(opts = {}) {
      this.opts = Object.assign({
        accent: cssVar('--mk-accent', '#0f5c4c'),
        dark: cssVar('--mk-ink', '#282828'),
        trailLength: 34,
        interactive: 'a,button,[role="button"],input,textarea,select,label,summary,[data-cursor]:not([data-cursor="hidden"])',
        darkOn: '[data-cursor="dark"]',
      }, opts);
      this.target = { x: global.innerWidth / 2, y: global.innerHeight / 2 };
      this.current = { ...this.target };
      this.trail = [];
      this.speed = 0;
      this.hoverProgress = 0; this.pressProgress = 0; this.visibilityProgress = 0; this.darkProgress = 0;
      this.isInteractive = false; this.isPressed = false; this.isVisible = false; this.isHidden = false; this.useDark = false;
      this.raf = null; this.destroyed = false;
      this.squareState = {};
      ['onMove', 'onLeave', 'onDown', 'onUp', 'resize', 'render'].forEach((k) => (this[k] = this[k].bind(this)));
    }
    init() {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'mk-cursor-canvas';
      this.ctx = this.canvas.getContext('2d');
      this.square = document.createElement('div');
      this.square.className = 'mk-cursor-square';
      document.body.append(this.canvas, this.square);
      this.accentRgb = hexToRgb(this.opts.accent, '#0f5c4c');
      this.darkRgb = hexToRgb(this.opts.dark, '#282828');
      this.resize();
      global.addEventListener('resize', this.resize);
      document.addEventListener('mousemove', this.onMove, { passive: true });
      document.addEventListener('mouseleave', this.onLeave);
      document.addEventListener('mousedown', this.onDown);
      global.addEventListener('mouseup', this.onUp);
      global.addEventListener('blur', this.onUp);
      document.documentElement.classList.add('mk-has-cursor');
      this.wake();
      return this;
    }
    destroy() {
      this.destroyed = true;
      if (this.raf) cancelAnimationFrame(this.raf);
      global.removeEventListener('resize', this.resize);
      document.removeEventListener('mousemove', this.onMove);
      document.removeEventListener('mouseleave', this.onLeave);
      document.removeEventListener('mousedown', this.onDown);
      global.removeEventListener('mouseup', this.onUp);
      global.removeEventListener('blur', this.onUp);
      this.canvas.remove(); this.square.remove();
      document.documentElement.classList.remove('mk-has-cursor');
    }
    wake() { if (this.raf === null && !this.destroyed) this.raf = requestAnimationFrame(this.render); }
    resize() {
      this.w = global.innerWidth; this.h = global.innerHeight;
      this.dpr = Math.max(1, Math.min(2, global.devicePixelRatio || 1, 3072 / Math.max(1, this.w)));
      this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
      this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.wake();
    }
    onMove(e) {
      this.target.x = e.clientX; this.target.y = e.clientY; this.isVisible = true;
      const t = e.target;
      const hidden = !!(t && t.closest && t.closest('[data-cursor="hidden"]'));
      if (hidden !== this.isHidden) {
        this.isHidden = hidden;
        this.canvas.style.visibility = this.square.style.visibility = hidden ? 'hidden' : 'visible';
        if (hidden) this.isPressed = false;
      }
      this.isInteractive = !!(t && t.closest && t.closest(this.opts.interactive));
      this.useDark = !!(t && t.closest && t.closest(this.opts.darkOn));
      this.wake();
    }
    onLeave() { this.isVisible = false; this.isPressed = false; this.wake(); }
    onDown() { this.pressProgress = 0; this.isPressed = true; this.hoverProgress = Math.max(this.hoverProgress, 0.6); this.wake(); }
    onUp() { this.isPressed = false; this.wake(); }
    approach(cur, tgt, f, eps = 0.001) { const v = cur + (tgt - cur) * f; return Math.abs(tgt - v) < eps ? tgt : v; }
    mix(a, b, t) { return 'rgb(' + a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',') + ')'; }
    updateSquare(opacity, scale, border) {
      const s = this.squareState;
      const o = clamp(opacity, 0, 1).toFixed(3);
      const tr = `translate3d(${this.current.x.toFixed(2)}px,${this.current.y.toFixed(2)}px,0) translate(-50%,-50%) scale(${scale.toFixed(3)})`;
      if (s.o !== o) { this.square.style.opacity = o; s.o = o; }
      if (s.tr !== tr) { this.square.style.transform = tr; s.tr = tr; }
      if (s.b !== border) { this.square.style.borderColor = border; s.b = border; }
      const mode = this.isPressed ? 'pressed' : 'hover';
      if (s.mode !== mode) { this.square.style.mixBlendMode = this.isPressed ? 'normal' : 'difference'; this.square.style.background = this.isPressed ? 'none' : 'rgba(255,255,255,0.12)'; s.mode = mode; }
    }
    render() {
      this.raf = null;
      if (document.hidden || this.destroyed) return;
      const px = this.current.x, py = this.current.y;
      const ph = this.hoverProgress, pp = this.pressProgress, pv = this.visibilityProgress, pd = this.darkProgress, ps = this.speed;
      this.current.x = this.approach(this.current.x, this.target.x, 0.18, 0.01);
      this.current.y = this.approach(this.current.y, this.target.y, 0.18, 0.01);
      this.hoverProgress = this.approach(this.hoverProgress, this.isInteractive ? 1 : 0, 0.15);
      this.pressProgress = this.isPressed ? this.approach(this.pressProgress, 1, 0.2) : 0;
      this.visibilityProgress = this.approach(this.visibilityProgress, this.isVisible ? 1 : 0, 0.12);
      this.darkProgress = this.approach(this.darkProgress, this.useDark ? 1 : 0, 0.15);

      const color = this.mix(this.accentRgb, this.darkRgb, this.darkProgress);
      const base = this.accentRgb.map((c, i) => c + (this.darkRgb[i] - c) * this.darkProgress);
      const light = this.mix(base, [255, 255, 255], 0.3);
      const hoverScale = (6 + this.hoverProgress * 8) / 14;
      const pressScale = 0.5 + this.pressProgress * 0.3;
      this.updateSquare((this.isPressed ? 1 : this.hoverProgress) * this.visibilityProgress, this.isPressed ? pressScale : hoverScale, this.isPressed ? light : 'transparent');

      const moved = Math.hypot(this.current.x - px, this.current.y - py);
      this.speed += (moved - this.speed) * 0.2;
      if (moved > 0.05) { this.trail.push({ x: this.current.x, y: this.current.y }); if (this.trail.length > this.opts.trailLength) this.trail.shift(); }
      const fast = this.speed > 1.5 || ps > 1.5;
      const changed = this.current.x !== px || this.current.y !== py || this.hoverProgress !== ph || this.pressProgress !== pp || this.visibilityProgress !== pv || this.darkProgress !== pd || (fast && this.speed !== ps);
      if (changed) {
        const c = this.ctx;
        c.clearRect(0, 0, this.w, this.h);
        if (this.visibilityProgress > 0) {
          const k = clamp((this.speed - 1.5) / 6, 0, 1);
          if (k > 0.02) {
            c.strokeStyle = color; c.lineWidth = 1.4; c.lineCap = 'round';
            for (let i = 1; i < this.trail.length; i++) {
              const t = i / this.trail.length;
              c.globalAlpha = t * t * 0.7 * this.visibilityProgress * k;
              c.beginPath(); c.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); c.lineTo(this.trail[i].x, this.trail[i].y); c.stroke();
            }
          }
          const dot = 9;
          if ((this.isPressed || this.hoverProgress > 0.99) && !this.isHidden) {
            c.globalAlpha = (this.isPressed ? 1 : this.hoverProgress) * this.visibilityProgress;
            c.fillStyle = color;
            c.fillRect(this.current.x - dot / 2, this.current.y - dot / 2, dot, dot);
          }
        }
        c.globalAlpha = 1;
        if (!fast && moved <= 0.05) this.trail = [{ x: this.current.x, y: this.current.y }];
        this.wake();
      }
    }
  }
  MK.cursor = {
    instance: null,
    init(opts) {
      if (!finePointer() || prefersReduced()) return null;
      if (this.instance) this.instance.destroy();
      this.instance = new CanvasCursor(opts).init();
      return this.instance;
    },
  };

  /* ------------------------------------------------------------------------
     4. Ruler / crosshair + drag-select box.
     Observed: lines and plus marker lerp toward the pointer at 0.3 each
     frame, clamped 16px inside the wrapper; lines fade to 0 at the edges
     (lerp 0.1); the plus grows to 1.2x and fades at the edges (lerp 0.08);
     the coordinate readout and tooltip sit on the side of the pointer that
     keeps them inside the box; everything fades in over 0.25s on enter and
     the RAF loop pauses when the pointer is outside.
     Drag-select: mousedown creates a bordered box, mousemove sizes it and
     chooses the gradient angle by drag quadrant, overlapped .mk-select-item
     elements get .active, mouseup removes the box.
     ------------------------------------------------------------------------ */
  class Ruler {
    constructor(opts = {}) {
      this.o = Object.assign({
        wrapper: null, vertical: '.mk-ruler-line-v', horizontal: '.mk-ruler-line-h', plus: '.mk-ruler-plus',
        coords: '.mk-ruler-coords', tip: '.mk-ruler-tip', hover: '.mk-ruler-hover',
        attrX: '[data-coord="x"]', attrY: '[data-coord="y"]', pauseOutside: true, offset: 16, select: false, selectItems: '.mk-select-item',
      }, opts);
      this.wrapper = typeof this.o.wrapper === 'string' ? document.querySelector(this.o.wrapper) : this.o.wrapper;
      if (!this.wrapper) return;
      const q = (s) => $$(s, this.wrapper);
      this.lines = { v: q(this.o.vertical), h: q(this.o.horizontal) };
      this.plus = q(this.o.plus); this.coords = q(this.o.coords); this.tip = q(this.o.tip); this.hover = q(this.o.hover);
      this.cur = { x: 0, y: 0 }; this.tgt = { x: 0, y: 0 };
      this.lineAlpha = { v: 0, h: 0 }; this.plusScale = 1; this.plusFade = 0;
      this.inside = false; this.animating = false; this.raf = null;
      ['onEnter', 'onLeave', 'onMove', 'loop'].forEach((k) => (this[k] = this[k].bind(this)));
    }
    start() {
      if (!this.wrapper) return this;
      this.inside = this.wrapper.matches(':hover');
      this.wrapper.addEventListener('mouseenter', this.onEnter);
      this.wrapper.addEventListener('mouseleave', this.onLeave);
      this.wrapper.addEventListener('mousemove', this.onMove);
      this.setHover(true);
      if (!this.o.pauseOutside || this.inside) this.resume();
      if (this.o.select) this.initSelect();
      return this;
    }
    stop() { this.pause(); if(this.selectCleanup)this.selectCleanup(); this.wrapper.removeEventListener('mouseenter', this.onEnter); this.wrapper.removeEventListener('mouseleave', this.onLeave); this.wrapper.removeEventListener('mousemove', this.onMove); }
    onEnter() { this.inside = true; this.setHover(); if (this.o.pauseOutside) this.resume(); }
    onLeave() { this.inside = false; this.setHover(); if (this.o.pauseOutside) this.pause(); }
    onMove() { if (!this.inside) this.onEnter(); }
    setHover(instant) { if (this.hover.length) gsap.to(this.hover, { autoAlpha: this.inside ? 1 : 0, duration: instant ? 0 : 0.25, ease: 'power2.out', overwrite: 'auto' }); }
    resume() { if (this.animating) return; this.animating = true; this.loop(); }
    pause() { this.animating = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
    loop() { if (!this.animating) return; this.updateTarget(); this.draw(); this.raf = requestAnimationFrame(this.loop); }
    updateTarget() { const r = this.wrapper.getBoundingClientRect(); this.tgt.x = pointer.x - r.left; this.tgt.y = pointer.y - r.top; }
    draw() {
      const W = this.wrapper.offsetWidth, H = this.wrapper.offsetHeight, off = this.o.offset;
      const minX = off, maxX = W - off, minY = off, maxY = H - off;
      this.cur.x = clamp(lerp(this.cur.x, this.tgt.x, 0.3), minX, maxX);
      this.cur.y = clamp(lerp(this.cur.y, this.tgt.y, 0.3), minY, maxY);
      const x = this.cur.x, y = this.cur.y;
      const atEdgeX = x === minX || x === maxX, atEdgeY = y === minY || y === maxY;
      this.lineAlpha.v = lerp(this.lineAlpha.v, atEdgeX ? 0 : 0.16, 0.1);
      this.lineAlpha.h = lerp(this.lineAlpha.h, atEdgeY ? 0 : 0.16, 0.1);
      this.plusScale = lerp(this.plusScale, atEdgeX || atEdgeY ? 1.2 : 1, 0.08);
      this.plusFade = lerp(this.plusFade, atEdgeX || atEdgeY ? 1 : 0, 0.08);
      if (this.lines.v.length) gsap.set(this.lines.v, { x, autoAlpha: this.lineAlpha.v });
      if (this.lines.h.length) gsap.set(this.lines.h, { y, autoAlpha: this.lineAlpha.h });
      if (this.plus.length) gsap.set(this.plus, { x, y, scale: this.plusScale, opacity: 1 - this.plusFade });
      const gap = rem(2);
      const place = (els) => {
        if (!els.length) return;
        const el = els[0], w = el.offsetWidth, h = el.offsetHeight;
        const left = x > W / 2 ? x - w - gap : x + gap;
        const top = y > H / 2 ? y - h - gap : y + gap;
        gsap.set(els, { x: left, y: top });
      };
      place(this.coords); place(this.tip);
      const sx = $$(this.o.attrX, this.wrapper), sy = $$(this.o.attrY, this.wrapper);
      sx.forEach((e) => (e.textContent = this.tgt.x.toFixed(0)));
      sy.forEach((e) => (e.textContent = this.tgt.y.toFixed(0)));
    }
    initSelect() {
      const wrap = this.wrapper; let box = null, down = false, start = null;
      const accent = cssVar('--mk-accent-rgb', '15, 92, 76');
      const pos = (e) => { const r = wrap.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: p.clientX - r.left, y: p.clientY - r.top }; };
      const onDown = (e) => {
        if (prefersReduced() || !finePointer() || e.button !== 0 || e.target.closest('button,a')) return;
        if (box) box.remove();
        box = document.createElement('div'); box.className = 'mk-select-box';
        start = pos(e); box.style.left = start.x + 'px'; box.style.top = start.y + 'px';
        wrap.prepend(box); down = true;
      };
      const onMove = (e) => {
        if (!down || !box) return;
        const p = pos(e);
        if (dist(p.x, p.y, start.x, start.y) <= 2) return;
        const right = p.x > start.x, below = p.y > start.y;
        const w = Math.abs(p.x - start.x), h = Math.abs(p.y - start.y);
        const angle = right ? (below ? '315deg' : '225deg') : (below ? '45deg' : '135deg');
        Object.assign(box.style, { width: w + 'px', height: h + 'px', left: Math.min(p.x, start.x) + 'px', top: Math.min(p.y, start.y) + 'px', background: `linear-gradient(${angle}, rgba(${accent}, 0.64) 0%, rgba(${accent}, 0) 67%)` });
        const b = box.getBoundingClientRect();
        $$(this.o.selectItems, wrap).forEach((it) => {
          const r = it.getBoundingClientRect();
          const hit = !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom);
          if (hit) { it.classList.add('active'); this.tip.forEach((t) => t.classList.add('hidden')); }
        });
      };
      const onUp = () => { down = false; if (box) { box.remove(); box = null; } };
      
      wrap.addEventListener('mousedown', onDown); wrap.addEventListener('touchstart', onDown, { passive: true });
      wrap.addEventListener('mousemove', onMove); wrap.addEventListener('touchmove', onMove, { passive: true });
      global.addEventListener('mouseup', onUp); global.addEventListener('blur', onUp); wrap.addEventListener('touchend', onUp);
      this.selectCleanup=()=>{onUp();wrap.removeEventListener('mousedown',onDown);wrap.removeEventListener('touchstart',onDown);wrap.removeEventListener('mousemove',onMove);wrap.removeEventListener('touchmove',onMove);global.removeEventListener('mouseup',onUp);global.removeEventListener('blur',onUp);wrap.removeEventListener('touchend',onUp)};
    }
  }
  MK.Ruler = Ruler;
  MK.ruler = { init(opts) { return new Ruler(opts).start(); } };

  /* ------------------------------------------------------------------------
     5. Text reveals built on SplitText.
     Observed timings:
       words:   color keyframes [transparent, accent, final], easeEach
                power2.in, ease power1.out, duration 1 (fast 0.8),
                stagger 0.08 (fast 0.03). Words inside .mk-highlight end on
                the accent instead of the body color.
       heading: lines masked, words from yPercent 100 / autoAlpha 0 to 0 / 1,
                duration 0.8, power2.out, stagger 0.02.
       scrub:   per-word color from muted to ink, stagger 0.03, duration 0.5,
                scrubbed between "center bottom+=10%" and "center top+=40%".
     ------------------------------------------------------------------------ */
  const split = (el, type, extra = {}) => {
    const ST = global.SplitText;
    return ST.create ? ST.create(el, { type, ...extra }) : new ST(el, { type, ...extra });
  };
