// Homepage scenes. Each one checks for motion and bails out cleanly, so the static page always reads.
(function () {
  var CJ = window.CJ, root = document.documentElement;
  var motion = root.classList.contains('motion');
  var clamp = CJ.clamp, ease = CJ.ease;

  // ---- Buying / Selling tabs in the opening ----
  var tabs = document.querySelectorAll('.finder-tabs [role="tab"]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (tab.id === 'tab-buy') document.querySelector('#finder-buy input').focus();
    });
  });

  // ---- Area counts from the listing snapshot ----
  fetch('data/listings.json').then(function (r) { return r.json(); }).then(function (snap) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var cities = el.getAttribute('data-count').split('|');
      var n = snap.listings.filter(function (l) { return cities.indexOf(l.city) >= 0 && l.status === 'Sold'; }).length;
      var a = snap.listings.filter(function (l) { return cities.indexOf(l.city) >= 0 && l.status === 'For Sale'; }).length;
      el.textContent = (n ? n + ' sold' : '') + (n && a ? ' · ' : '') + (a ? a + ' for sale' : '');
    });
  }).catch(function () {});

  if (!motion) return;

  // ---- Opening: the porch comes into focus left to right, then drifts slower than the page ----
  var hero = document.querySelector('.hero'), scene = hero.querySelector('.hero-scene'), blur = hero.querySelector('.hero-blur');
  var copy = [hero.querySelector('.eyebrow'), hero.querySelector('h1'), hero.querySelector('.lede')];
  var t0 = performance.now(), focusDone = false;
  function focus(now) {
    var t = (now - t0) / 1000, p = clamp((t - 0.1) / 1.3, 0, 1);
    blur.style.setProperty('--f', (-10 + 150 * (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)).toFixed(2));
    if (p < 1) requestAnimationFrame(focus); else { focusDone = true; blur.style.display = 'none'; }
  }
  requestAnimationFrame(focus);
  CJ.onScroll(function (y, vh) {
    var h = Math.min(hero.offsetHeight, vh), out = clamp(y / (h * 0.8), 0, 1);
    scene.style.transform = 'translate3d(0,' + (y * 0.25).toFixed(1) + 'px,0) scale(' + (1 + out * 0.06).toFixed(4) + ')';
    if (focusDone) scene.style.animation = 'none';
    copy.forEach(function (el, i) {
      var k = clamp(out * 1.6 - i * 0.08, 0, 1);
      el.style.opacity = (1 - k).toFixed(3);
      el.style.transform = 'translate3d(0,' + (-k * (40 + i * 10)).toFixed(1) + 'px,0)';
    });
  });

  // ---- Statement: the question holds while the places fly in and settle into a grid ----
  var places = document.getElementById('places'), head = document.getElementById('places-head');
  var areas = [].slice.call(document.querySelectorAll('.area'));
  var fine = matchMedia('(min-width: 760px)').matches;
  CJ.onScroll(function (y, vh) {
    var r = places.getBoundingClientRect(), total = places.offsetHeight - vh;
    var p = clamp(-r.top / total, 0, 1);
    // 0 to .35: the heading alone, large. .35 to .85: cards arrive. .85 to 1: hold.
    var hs = 1 + 0.55 * (1 - ease(clamp(p / 0.45, 0, 1)));
    var hy = (1 - ease(clamp(p / 0.45, 0, 1))) * (fine ? vh * 0.16 : vh * 0.1);
    head.style.transform = 'translate3d(0,' + hy.toFixed(1) + 'px,0) scale(' + hs.toFixed(4) + ')';
    areas.forEach(function (a, i) {
      var from = a.getAttribute('data-from').split(',').map(Number);
      var k = ease(clamp((p - 0.3 - i * 0.06) / 0.4, 0, 1));
      var dx = from[0] * (fine ? vh * 0.9 : vh * 0.6) * (1 - k), dy = from[1] * vh * 0.9 * (1 - k);
      a.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) rotate(' + ((1 - k) * (from[0] * 6 + from[1] * 3)).toFixed(2) + 'deg)';
      a.style.opacity = clamp(k * 1.6, 0, 1).toFixed(3);
    });
  });

  // ---- "Caleb" blows in across the sky behind the Basil Lane roofline, once ----
  var box = document.querySelector('.roofline'), name = box && box.querySelector('.name');
  if (name) {
    function rand(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }
    var word = name.textContent.trim(), chars = [];
    name.textContent = '';
    for (var i = 0; i < word.length; i++) {
      var c = document.createElement('span'); c.className = 'ch'; c.textContent = word[i];
      name.appendChild(c); chars.push({ el: c, r: [rand(i, 1), rand(i, 2), rand(i, 3)] });
    }
    var start = -1, seen = false, run = false;
    function drawName(t) {
      var H = box.clientHeight, W = box.clientWidth, r = box.getBoundingClientRect();
      var p = clamp((innerHeight - r.top) / (innerHeight * 0.85), 0, 1);
      if (start < 0 && p > 0.45) start = t;
      var k = start < 0 ? 0 : t - start, done = true;
      chars.forEach(function (c, i) {
        var e = ease(clamp((k - i * 0.12) / 1.4, 0, 1)); if (e < 1) done = false;
        var x = -(W * 0.35 + 80 * c.r[0]) * (1 - e), y = (c.r[1] - 0.5) * H * 0.12 * (1 - e) - H * 0.06 * Math.sin(Math.PI * e);
        c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (-(14 + 20 * c.r[2]) * (1 - e)).toFixed(2) + 'deg)';
        c.el.style.opacity = Math.min(1, e * 2.2).toFixed(3);
        c.el.style.filter = e < 1 ? 'blur(' + ((1 - e) * 10).toFixed(2) + 'px)' : 'none';
      });
      return done && start >= 0;
    }
    var tn = performance.now();
    function frameName(now) { if (!seen) { run = false; return; } if (drawName((now - tn) / 1000)) { run = false; return; } requestAnimationFrame(frameName); }
    new IntersectionObserver(function (e) { seen = e[0].isIntersecting; if (seen && !run) { run = true; requestAnimationFrame(frameName); } }, { rootMargin: '25% 0px' }).observe(box);
    drawName(0);
  }

  // ---- How I work: the big number follows the step in view ----
  var steps = [].slice.call(document.querySelectorAll('#steps li')), nums = [].slice.call(document.querySelectorAll('#work-num span'));
  if (steps.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = steps.indexOf(en.target);
        steps.forEach(function (s, j) { s.classList.toggle('on', j === i); });
        nums.forEach(function (n, j) { n.classList.toggle('on', j === i); });
      });
    }, { rootMargin: '-40% 0px -45% 0px' });
    steps.forEach(function (s) { so.observe(s); });
  }
})();
