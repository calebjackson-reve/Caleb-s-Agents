// Page headline motion, matching the homepage opening.
// The page's main headline rides in on a gust from the left, holds still, then a soft gust passes through it
// at long intervals. Scrolling blows it off to the right. A top photograph marked .focus-pull comes into
// focus from left to right on the same gust. With reduced motion none of this runs.
(function () {
  var root = document.documentElement;
  var h1 = document.querySelector('main h1');
  if (!root.classList.contains('wind') || !h1) return;
  window.__fx = true;

  var ENTRY = 0.3, CROSS = 1.1, FLIGHT = 1.1, SETTLED = ENTRY + CROSS + FLIGHT + 0.3;
  var CALM = 4.4, PERIOD = 11, RIPPLE_CROSS = 2.4, RIPPLE_W = 0.11;
  var FOCUS_START = 0.15, FOCUS_TIME = 1.7;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rand(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

  // ---------- Split the headline into words and letters, keeping <em> and <br> ----------
  var text = h1.textContent.replace(/\s+/g, ' ').trim(), letters = [];
  function split(node) {
    [].slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { if (n.tagName !== 'BR') split(n); return; }
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w';
        for (var i = 0; i < part.length; i++) {
          var c = document.createElement('span'); c.className = 'ch'; c.textContent = part[i];
          c.style.opacity = '0'; w.appendChild(c); letters.push(c);
        }
        frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  }
  split(h1);
  var fly = document.createElement('span'); fly.setAttribute('aria-hidden', 'true');
  while (h1.firstChild) fly.appendChild(h1.firstChild);
  var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
  h1.appendChild(sr); h1.appendChild(fly);
  root.classList.add('fx-ready');

  var L = letters.map(function (c, i) {
    return { el: c, x: 0, line: 0, r: [rand(i, 1), rand(i, 2), rand(i, 3), rand(i, 4)], rx: 0, ry: 0, rr: 0 };
  });
  function measure() {
    var tops = [], W = document.documentElement.clientWidth;
    L.forEach(function (l) {
      l.el.style.transform = 'none';
      var b = l.el.getBoundingClientRect();
      l.x = (b.left + b.width / 2) / W; l.top = b.top;
      if (!tops.some(function (t) { return Math.abs(t - b.top) < 12; })) tops.push(b.top);
    });
    tops.sort(function (a, b) { return a - b; });
    L.forEach(function (l) { tops.forEach(function (t, k) { if (Math.abs(t - l.top) < 12) l.line = k; }); });
  }
  measure();
  addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var blurs = [].slice.call(document.querySelectorAll('.focus-pull .fx-blur'));

  function rippleFront(t) {
    var k = t - (SETTLED + CALM);
    if (k < 0) return -9;
    k %= PERIOD;
    return k > RIPPLE_CROSS ? -9 : -0.2 + 1.45 * (k / RIPPLE_CROSS);
  }

  var last = 0;
  function draw(t) {
    var dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    var hb = h1.getBoundingClientRect();
    // Blow away once the headline has scrolled about two-thirds of the way out of view
    var out = clamp((90 - hb.top) / Math.max(200, innerHeight * 0.55));
    var gx = rippleFront(t), k = 1 - Math.exp(-dt * 6);
    L.forEach(function (l) {
      var r = l.r;
      var p = clamp((t - (ENTRY + (l.x + 0.04) * CROSS + l.line * 0.12)) / FLIGHT), e = easeOut(p);
      var ex = -(60 + 50 * r[0]) * (1 - e);
      var ey = (r[1] - 0.5) * 34 * (1 - e) - 22 * Math.sin(Math.PI * e) * (0.4 + r[2]);
      var er = -(8 + 16 * r[3]) * (1 - e);
      var g = Math.exp(-Math.pow((l.x - gx) / RIPPLE_W, 2));
      l.rx += (3 * g - l.rx) * k; l.ry += (-4 * g - l.ry) * k; l.rr += ((2 + 2.5 * r[0]) * g - l.rr) * k;
      var w = clamp(out * 1.55 - l.x * 0.55), we = Math.pow(w, 1.5);
      var wx = we * (220 + 140 * r[1]), wy = -w * (26 + 40 * r[2]) - 14 * Math.sin(Math.PI * w), wr = w * (14 + 20 * r[3]);
      var blurPx = (1 - e) * 6 + w * 4;
      l.el.style.opacity = (Math.min(1, p * 2.4) * (1 - Math.pow(w, 1.2))).toFixed(3);
      l.el.style.filter = blurPx > 0.05 ? 'blur(' + blurPx.toFixed(2) + 'px)' : 'none';
      l.el.style.transform = 'translate(' + (ex + l.rx + wx).toFixed(2) + 'px,' + (ey + l.ry + wy).toFixed(2) + 'px) rotate(' + (er + l.rr + wr).toFixed(2) + 'deg)';
    });
    var f = (-10 + 150 * easeInOut(clamp((t - FOCUS_START) / FOCUS_TIME))).toFixed(2);
    blurs.forEach(function (b) { b.style.setProperty('--f', f); });
  }

  // Runs only while the headline is on screen
  var t0 = performance.now(), visible = true, running = false;
  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    draw((now - t0) / 1000);
    requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }, { rootMargin: '200px 0px' }).observe(h1);
  document.addEventListener('visibilitychange', start);
  start();
})();
