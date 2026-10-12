// Homepage scenes. Each one checks for motion and bails out cleanly, so the static page always reads.
(function () {
  var CJ = window.CJ, root = document.documentElement;
  var motion = root.classList.contains('motion');
  var clamp = CJ.clamp, ease = CJ.ease;
  function easeInOut(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }

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
      var cities = el.getAttribute('data-count').split('|'), out = el.querySelector('small') || el;
      var n = snap.listings.filter(function (l) { return cities.indexOf(l.city) >= 0 && l.status === 'Sold'; }).length;
      var a = snap.listings.filter(function (l) { return cities.indexOf(l.city) >= 0 && l.status === 'For Sale'; }).length;
      out.textContent = (n ? n + ' sold' : '') + (n && a ? ' · ' : '') + (a ? a + ' for sale' : '');
    });
  }).catch(function () {});

  if (!motion) { root.classList.add('no-motion'); return; }

  // ---- Opening focus: the porch comes into focus left to right ----
  var story = document.getElementById('story'), stage = document.getElementById('stage');
  var media = document.getElementById('hero-media'), scene = media.querySelector('.hero-scene'), blur = media.querySelector('.hero-blur');
  var copy = document.getElementById('hero-copy'), frame = document.getElementById('frame'), caption = document.querySelector('.hero-caption');
  var places = document.getElementById('places'), head = [].slice.call(document.querySelectorAll('#places-head > *'));
  var tiles = [].slice.call(document.querySelectorAll('.tile:not(.slot)')), slot = document.getElementById('slot'), more = document.getElementById('places-more');
  var t0 = performance.now(), focusDone = false;
  function focus(now) {
    var t = (now - t0) / 1000, p = clamp((t - 0.1) / 1.3, 0, 1);
    blur.style.setProperty('--f', (-10 + 150 * easeInOut(p)).toFixed(2));
    if (p < 1) requestAnimationFrame(focus); else { focusDone = true; blur.style.display = 'none'; }
  }
  requestAnimationFrame(focus);

  // ---- The story: the porch photo shrinks into its place among the places ----
  // 0 to .2   the opening rests, a slow drift
  // .18 to .4 the words and the search lift away; the paper comes up behind
  // .3 to .72 the photo travels into its tile while the question and the other places arrive
  // .72 to 1  hold, then the stage lets go and the page continues
  var handed = false;
  function target() {
    var r = slot.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }
  CJ.onScroll(function (y, vh) {
    var r = story.getBoundingClientRect(), total = story.offsetHeight - vh;
    var p = clamp(-r.top / total, 0, 1), W = stage.clientWidth, H = stage.clientHeight;
    if (focusDone) scene.style.animation = 'none';

    // Words and search lift away first
    var c = ease(clamp((p - 0.16) / 0.2, 0, 1));
    copy.style.opacity = (1 - c).toFixed(3); copy.style.transform = 'translate3d(0,' + (-c * 60).toFixed(1) + 'px,0)';
    copy.style.pointerEvents = c > 0.6 ? 'none' : '';
    frame.style.opacity = (1 - c).toFixed(3); if (caption) caption.style.opacity = (1 - c).toFixed(3);

    // Paper rises behind the photo
    var bg = ease(clamp((p - 0.26) / 0.18, 0, 1));
    places.style.opacity = bg.toFixed(3);
    places.style.pointerEvents = bg > 0.8 ? '' : 'none';
    var hero = media.parentNode; var wasDark = hero.hasAttribute('data-bar'); if (bg > 0.5) hero.removeAttribute('data-bar'); else hero.setAttribute('data-bar', 'dark'); if (wasDark !== hero.hasAttribute('data-bar') && CJ.tone) CJ.tone();

    // The photo travels into its tile. Size and position move, never a text scale.
    var k = easeInOut(clamp((p - 0.3) / 0.42, 0, 1)), t = target();
    var drift = p < 0.3 ? y * 0.18 : 0;
    media.style.left = lerp(0, t.x, k).toFixed(1) + 'px';
    media.style.top = lerp(0, t.y, k).toFixed(1) + 'px';
    media.style.width = lerp(W, t.w, k).toFixed(1) + 'px';
    media.style.height = lerp(H, t.h, k).toFixed(1) + 'px';
    media.style.borderRadius = (k * 12).toFixed(1) + 'px';
    media.style.zIndex = k >= 1 ? 0 : 2;
    scene.style.transform = 'translate3d(0,' + drift.toFixed(1) + 'px,0)';
    var shade = media.querySelector('.hero-shade'); shade.style.opacity = (1 - k).toFixed(3);

    // Handoff: once the photo is in its slot the real tile takes over, and takes it back when scrolling up
    var want = k >= 1;
    if (want !== handed) { handed = want; slot.classList.toggle('handed', handed); media.style.visibility = handed ? 'hidden' : ''; }

    // The question and the other places arrive, each on its own beat
    head.forEach(function (el, i) {
      var h = ease(clamp((p - 0.32 - i * 0.05) / 0.22, 0, 1));
      el.style.opacity = h.toFixed(3); el.style.transform = 'translate3d(0,' + ((1 - h) * 28).toFixed(1) + 'px,0)';
    });
    tiles.forEach(function (el, i) {
      var h = ease(clamp((p - 0.5 - i * 0.045) / 0.24, 0, 1));
      el.style.opacity = h.toFixed(3); el.style.transform = 'translate3d(0,' + ((1 - h) * 40).toFixed(1) + 'px,0)';
    });
    var m = ease(clamp((p - 0.78) / 0.14, 0, 1)); more.style.opacity = m.toFixed(3);
  });
  addEventListener('resize', function () { CJ.onScroll(function () {}); });

  // ---- "Caleb" blows in across the sky behind the Basil Lane roofline, once ----
  var box = document.querySelector('.roofline'), name = box && box.querySelector('.name');
  if (name) {
    function rand(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }
    var word = name.textContent.trim(), chars = [];
    name.textContent = '';
    for (var i = 0; i < word.length; i++) {
      var ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = word[i];
      name.appendChild(ch); chars.push({ el: ch, r: [rand(i, 1), rand(i, 2), rand(i, 3)] });
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
