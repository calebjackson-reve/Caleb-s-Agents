// Homepage opening: Focus.
// The porch photograph comes into focus from left to right while the headline letters ride in on the same gust.
// Then everything holds still for a few seconds. Only after that does a softer gust ripple through the words,
// and it returns at long, calm intervals. Scrolling blows the letters off to the right and lets the photo
// drift slower than the page. With reduced motion none of this runs and the page is static.
(function () {
  var root = document.documentElement, hero = document.querySelector('.hero');
  if (!root.classList.contains('wind') || !hero) return;
  window.__fx = true;

  var media = hero.querySelector('.hero-media'), blur = hero.querySelector('.fx-blur');
  var cue = hero.querySelector('.scroll-cue');
  var supporting = [hero.querySelector('.eyebrow'), hero.querySelector('.lede'), hero.querySelector('.actions')];

  // ---------- Timing (seconds from page load) ----------
  var FOCUS_START = 0.2, FOCUS_TIME = 1.8;          // photo comes into focus, left to right
  var ENTRY = 0.4, CROSS = 1.25, FLIGHT = 1.15;     // the gust that carries the letters in
  var SETTLED = ENTRY + CROSS + FLIGHT + 0.3;       // about 3.1 s: everything is at rest
  var SUPPORT = [0.1, 1.6, 1.9];                    // eyebrow, sentence, buttons
  var CUE_AT = SETTLED + 0.5;                       // scroll cue appears once the words are still
  var CALM = 4.4;                                   // stillness before the first gust through the words
  var PERIOD = 11, RIPPLE_CROSS = 2.4, RIPPLE_W = 0.11;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rand(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

  // ---------- Split the headline into letters (screen readers get the plain sentence) ----------
  var h1 = hero.querySelector('h1'), text = h1.textContent.replace(/\s+/g, ' ').trim(), letters = [];
  [].forEach.call(h1.querySelectorAll('.w'), function (w) {
    var t = w.textContent; w.textContent = '';
    for (var i = 0; i < t.length; i++) {
      var c = document.createElement('span'); c.className = 'ch'; c.textContent = t[i];
      c.style.opacity = '0'; w.appendChild(c); letters.push(c);
    }
  });
  var fly = document.createElement('span'); fly.setAttribute('aria-hidden', 'true');
  while (h1.firstChild) fly.appendChild(h1.firstChild);
  var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
  h1.appendChild(sr); h1.appendChild(fly);
  root.classList.add('fx-ready');

  var L = letters.map(function (c, i) {
    return { el: c, x: 0, line: 0, r: [rand(i, 1), rand(i, 2), rand(i, 3), rand(i, 4)], rx: 0, ry: 0, rr: 0 };
  });
  function measure() {
    var hb = hero.getBoundingClientRect(), tops = [];
    L.forEach(function (l) {
      l.el.style.transform = 'none';
      var b = l.el.getBoundingClientRect();
      l.x = (b.left + b.width / 2 - hb.left) / hb.width; l.top = b.top;
      if (!tops.some(function (t) { return Math.abs(t - b.top) < 12; })) tops.push(b.top);
    });
    tops.sort(function (a, b) { return a - b; });
    L.forEach(function (l) { tops.forEach(function (t, k) { if (Math.abs(t - l.top) < 12) l.line = k; }); });
  }
  measure();
  addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  function rippleFront(t) {
    var k = t - (SETTLED + CALM);
    if (k < 0) return -9;
    k %= PERIOD;
    return k > RIPPLE_CROSS ? -9 : -0.2 + 1.45 * (k / RIPPLE_CROSS);
  }

  // ---------- Each frame ----------
  var last = 0;
  function draw(t) {
    var dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    var y = window.scrollY, out = clamp(y / (Math.min(hero.offsetHeight, innerHeight) * 0.62));
    var gx = rippleFront(t), k = 1 - Math.exp(-dt * 6);

    L.forEach(function (l) {
      var r = l.r;
      // Carried in from the left, lifting like a leaf before it settles.
      var p = clamp((t - (ENTRY + (l.x + 0.04) * CROSS + l.line * 0.12)) / FLIGHT), e = easeOut(p);
      var ex = -(70 + 60 * r[0]) * (1 - e);
      var ey = (r[1] - 0.5) * 40 * (1 - e) - 26 * Math.sin(Math.PI * e) * (0.4 + r[2]);
      var er = -(10 + 18 * r[3]) * (1 - e);
      // A soft gust passing through the settled words.
      var g = Math.exp(-Math.pow((l.x - gx) / RIPPLE_W, 2));
      l.rx += (3 * g - l.rx) * k; l.ry += (-5 * g - l.ry) * k; l.rr += ((2.5 + 2.5 * r[0]) * g - l.rr) * k;
      // Scrolling blows them off to the right, left side first.
      var w = clamp(out * 1.55 - l.x * 0.55), we = Math.pow(w, 1.5);
      var wx = we * (240 + 160 * r[1]), wy = -w * (30 + 50 * r[2]) - 16 * Math.sin(Math.PI * w), wr = w * (16 + 22 * r[3]);
      var blurPx = (1 - e) * 7 + w * 5;
      l.el.style.opacity = (Math.min(1, p * 2.4) * (1 - Math.pow(w, 1.2))).toFixed(3);
      l.el.style.filter = blurPx > 0.05 ? 'blur(' + blurPx.toFixed(2) + 'px)' : 'none';
      l.el.style.transform = 'translate(' + (ex + l.rx + wx).toFixed(2) + 'px,' + (ey + l.ry + wy).toFixed(2) + 'px) rotate(' + (er + l.rr + wr).toFixed(2) + 'deg)';
    });

    supporting.forEach(function (el, i) {
      if (!el) return;
      var a = easeOut(clamp((t - SUPPORT[i]) / 0.8)), o = clamp(out * 1.4);
      el.style.opacity = (a * (1 - o)).toFixed(3);
      el.style.transform = 'translate(' + (o * 36).toFixed(1) + 'px,' + ((1 - a) * 14).toFixed(1) + 'px)';
    });

    var c = easeOut(clamp((t - CUE_AT) / 0.9)) * (1 - clamp(out * 3));
    cue.style.opacity = c.toFixed(3);
    cue.style.transform = 'translate(-50%,' + ((1 - c) * 10).toFixed(1) + 'px)';

    // The photograph: focus sweeps left to right, then it drifts slower than the page as you scroll.
    blur.style.setProperty('--f', (-10 + 150 * easeInOut(clamp((t - FOCUS_START) / FOCUS_TIME))).toFixed(2));
    media.style.transform = 'translate3d(0,' + (y * 0.32).toFixed(1) + 'px,0) scale(' + (1 + out * 0.05).toFixed(4) + ')';
  }

  // ---------- One clock, paused when the opening is off screen ----------
  var t0 = performance.now(), visible = true, running = false;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    draw((now - t0) / 1000);
    requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  start();
})();
