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
