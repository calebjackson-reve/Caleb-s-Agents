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
  MK.text = {
    words(el, { color, fast = false, highlight = '.mk-highlight', accent = cssVar('--mk-accent', '#0f5c4c'), ...vars } = {}) {
      const s = split(el, 'lines, words');
      const toColor = color || getComputedStyle(el).color;
      const from = 'rgba(0,0,0,0)';
      gsap.set(s.words, { color: from });
      const tl = gsap.timeline({ paused: true, onComplete: () => s.revert(), ...vars });
      s.words.forEach((w, i) => {
        const end = w.closest(highlight) ? accent : toColor;
        tl.to(w, { keyframes: { color: [from, accent, end], easeEach: 'power2.in', ease: 'power1.out' }, duration: fast ? 0.8 : 1 }, i * (fast ? 0.03 : 0.08));
      });
      return tl;
    },
    heading(el, { stagger = 0.02, duration = 0.8, ...vars } = {}) {
      const s = split(el, 'lines, words', { mask: 'lines', linesClass: 'mk-line' });
      gsap.set(s.words, { yPercent: 100, autoAlpha: 0 });
      return gsap.to(s.words, { yPercent: 0, autoAlpha: 1, duration, stagger, ease: 'power2.out', paused: true, ...vars });
    },
    scrub(el, { from = cssVar('--mk-muted', '#b4b4b0'), to = cssVar('--mk-ink', '#282828'), start = 'center bottom+=10%', end = 'center top+=40%', stagger = 0.03 } = {}) {
      const s = split(el, 'lines, words');
      gsap.set(s.words, { color: from });
      return gsap.to(s.words, { color: to, stagger, duration: 0.5, ease: 'none', scrollTrigger: { trigger: el, start, end, scrub: true } });
    },
  };

  /* ------------------------------------------------------------------------
     6. Declarative reveals.
     data-reveal="fade-up | fade-down | fade-left | fade-right | fade |
                  heading | words | image"
     Observed: fade = opacity 0 + 32px offset -> 1, duration 1, ease power3,
     clearProps all. image = autoAlpha 0 + scale 1.08 -> 1, duration 1.6,
     expo.out. Sections (data-reveal-group) play one timeline with children
     offset 0.05s each, triggered once at "top+=40% bottom".
     ------------------------------------------------------------------------ */
  MK.reveal = {
    tween(el) {
      const type = el.dataset.reveal || 'fade-up';
      const delay = parseFloat(el.dataset.revealDelay || 0);
      if (type === 'heading') return MK.text.heading(el, { delay });
      if (type === 'words') return MK.text.words(el, { delay, fast: el.hasAttribute('data-fast') });
      if (type === 'image') { gsap.set(el, { autoAlpha: 0, scale: 1.08 }); return gsap.to(el, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'all', paused: true, delay }); }
      const offs = { 'fade-up': { y: 32 }, 'fade-down': { y: -32 }, 'fade-left': { x: 32 }, 'fade-right': { x: -32 }, fade: {} };
      const from = { opacity: 0, ...(offs[type] || offs['fade-up']) };
      gsap.set(el, from);
      const to = { opacity: 1, x: 0, y: 0, duration: 1, ease: 'power3', clearProps: 'all', paused: true, delay };
      return gsap.to(el, to);
    },
    init({ start = 'top+=40% bottom', groupStagger = 0.05 } = {}) {
      if (!global.SplitText) return;
      const handled = new Set();
      $$('[data-reveal-group]').forEach((group) => {
        const items = $$('[data-reveal]', group); if (!items.length) return;
        const tl = gsap.timeline({ paused: true });
        items.forEach((el, i) => { handled.add(el); tl.add(MK.reveal.tween(el).play(), i * groupStagger); });
        tl.pause(0);
        ScrollTrigger.create({ trigger: group, start: group.dataset.revealStart || start, once: true, onEnter: () => tl.play() });
      });
      $$('[data-reveal]').filter((el) => !handled.has(el)).forEach((el) => {
        const tw = MK.reveal.tween(el);
        ScrollTrigger.create({ trigger: el, start: el.dataset.revealStart || start, once: true, onEnter: () => tw.play() });
      });
      $$('[data-anim="fade-loop"]').forEach((el) => gsap.to(el, { opacity: 0.15, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    },
  };

  /* ------------------------------------------------------------------------
     7. Sticky scroll sequence.
     Observed: outer wrapper 700dvh tall, inner "stick" is position: sticky,
     a scrubbed timeline over the wrapper fades each frame in
     (autoAlpha 0, y 3rem, scale 1.04 -> 1, 0, 1) then out
     (-> 0, -3rem, 0.96); a caption card gets .active while its frame is
     between 0 and 1 progress.
     ------------------------------------------------------------------------ */
  MK.sequence = {
    init(sel = '[data-sequence]') {
      $$(sel).forEach((wrap) => {
        const frames = $$('[data-frame]', wrap); if (!frames.length) return;
        const captions = $$('[data-frame-caption]', wrap);
        const holdLast = !wrap.hasAttribute('data-sequence-exit-last');
        wrap.style.setProperty('--mk-frames', frames.length);
        const y = rem(3);
        const tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: true } });
        let active = -1;
        const setActive = (i) => { if (i === active) return; active = i; frames.forEach((f, k) => f.classList.toggle('active', k === i)); captions.forEach((c) => c.classList.toggle('active', String(i) === c.dataset.frameCaption)); };
        frames.forEach((f, i) => {
          const last = i === frames.length - 1;
          gsap.set(f, { autoAlpha: i === 0 ? 1 : 0 });
          tl.fromTo(f, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : y, scale: i === 0 ? 1 : 1.04 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: 'none', onStart: () => setActive(i), onReverseComplete: () => setActive(i - 1) });
          tl.to({}, { duration: 0.6 });
          if (!(last && holdLast)) tl.to(f, { autoAlpha: 0, y: -y, scale: 0.96, duration: 1, ease: 'none' });
        });
        setActive(0);
      });
    },
  };

  /* ------------------------------------------------------------------------
     8. Pixel-dissolve button fill.
     Observed: a .btn-fill-bg layer sized to a 24x6 cell grid (cell =
     max((w+2)/24, (h+2)/6)), masked by a 20-frame sprite, mask-position
     tweened 0% -> 100% in 580ms with ease steps(19) while the label color
     tweens in 150ms. Leaving plays the same dissolve with the bg painted in
     the resting color (class is-fill-exiting) then clears. Touch pointers
     are ignored; reduced motion jumps to the end state.
     ------------------------------------------------------------------------ */
  function pixelSprite(frames = 20, cols = 24, rows = 6, seed = 7) {
    let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const th = []; for (let r = 0; r < rows; r++) { th[r] = []; for (let c = 0; c < cols; c++) th[r][c] = (c + rnd() * 7) / (cols + 7); }
    let g = '';
    for (let f = 0; f < frames; f++) {
      const p = f / (frames - 1);
      let full = '', half = '', quarter = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = th[r][c] - p;
        const rect = `M${c + f * cols} ${r}h1v1h-1z`;
        if (d <= 0) full += rect; else if (d < 0.05) half += rect; else if (d < 0.1) quarter += rect;
      }
      g += `<path d="${full}"/><path d="${half}" opacity=".5"/><path d="${quarter}" opacity=".2"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * frames} ${rows}" preserveAspectRatio="none" shape-rendering="crispEdges"><g fill="#fff">${g}</g></svg>`;
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  }
  MK.btnFill = {
    frames: 20,
    init(sel = '.mk-btn') {
      const mask = pixelSprite(this.frames);
      const reduced = prefersReduced();
      $$(sel).forEach((btn) => {
        if (btn.__mk) return; btn.__mk = true;
        let bg = btn.querySelector('.mk-btn-bg');
        if (!bg) { bg = document.createElement('span'); bg.className = 'mk-btn-bg'; btn.prepend(bg); }
        bg.style.position = 'absolute'; bg.style.webkitMaskImage = bg.style.maskImage = mask;
        bg.style.webkitMaskSize = bg.style.maskSize = `${this.frames * 100}% 100%`;
        const size = () => { const { width: w, height: h } = btn.getBoundingClientRect(); if (!w || !h) return; const cell = Math.max((w + 2) / 24, (h + 2) / 6); bg.style.width = cell * 24 + 'px'; bg.style.height = cell * 6 + 'px'; };
        size(); if (global.ResizeObserver) new ResizeObserver(size).observe(btn);
        const resting = getComputedStyle(btn).color;
        const active = (btn.dataset.fillColor || '').trim() || getComputedStyle(btn).getPropertyValue('--mk-btn-active-color').trim() || '#fff';
        const run = (color) => gsap.timeline({ paused: true })
          .to(bg, { webkitMaskPosition: '100% 0', maskPosition: '100% 0', duration: 0.58, ease: `steps(${this.frames - 1})` }, 0)
          .to(btn, { color, duration: 0.15, ease: 'power1.out' }, 0);
        const enter = run(active), exit = run(resting);
        let over = false, entered = false;
        const reset = () => { enter.pause(0); exit.pause(0); btn.classList.remove('is-fill-entered', 'is-fill-exiting', 'is-fill-active'); gsap.set(bg, { webkitMaskPosition: '0% 0', maskPosition: '0% 0' }); gsap.set(btn, { clearProps: 'color' }); entered = false; };
        const leave = () => { if (!entered) { btn.classList.remove('is-fill-active'); return reset(); } btn.classList.add('is-fill-exiting'); btn.classList.remove('is-fill-entered'); gsap.set(bg, { webkitMaskPosition: '0% 0', maskPosition: '0% 0' }); exit.eventCallback('onComplete', () => { if (!over) reset(); }); exit.restart(); };
        btn.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'touch') return;
          over = true; exit.pause(0); btn.classList.remove('is-fill-exiting', 'is-fill-entered'); btn.classList.add('is-fill-active'); entered = false;
          gsap.set(bg, { webkitMaskPosition: '0% 0', maskPosition: '0% 0' }); gsap.set(btn, { color: resting });
          if (prefersReduced()) { entered = true; enter.progress(1).pause(); btn.classList.add('is-fill-entered'); return; }
          enter.eventCallback('onComplete', () => { if (over) { entered = true; btn.classList.add('is-fill-entered'); } });
          enter.restart();
        });
        btn.addEventListener('pointerleave', () => { over = false; if (enter.isActive()) enter.eventCallback('onComplete', () => { entered = true; leave(); }); else leave(); });
      });
    },
  };

  /* ------------------------------------------------------------------------
     9. Marquee. Observed: items cloned until they cover the viewport, CSS
     animation with duration = itemWidth / 40 seconds (40px per second).
     ------------------------------------------------------------------------ */
  MK.marquee = {
    init(sel = '[data-marquee]') {
      $$(sel).forEach((m) => {
        const track = m.querySelector('.mk-marquee-track') || m.firstElementChild; if (!track) return;
        const speed = parseFloat(m.dataset.speed || 40);
        const items = Array.from(track.children);
        const unit = items.reduce((w, el) => w + el.getBoundingClientRect().width, 0); if (!unit) return;
        const copies = Math.max(2, Math.ceil((global.innerWidth * 2) / unit));
        for (let i = 1; i < copies; i++) items.forEach((el) => track.appendChild(el.cloneNode(true)));
        const half = track.scrollWidth / 2;
        m.style.setProperty('--mk-marquee-duration', (half / speed).toFixed(2) + 's');
      });
    },
  };

  /* ------------------------------------------------------------------------
     10. Loader. Observed: progress hairline, live pointer coordinates via
     the ruler, title words rise, then the top and bottom lines travel to
     where the header and hero sit and the panel fades (0.4s). Repeat visits
