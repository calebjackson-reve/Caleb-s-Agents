// Shared behaviour: the floating bar changes tone over light sections, sections settle in once,
// and anything scroll-driven registers with one clock. With reduced motion only the bar tone runs.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.CJ = window.CJ || {};
  window.CJ.reduce = reduce;

  // ---- Bar tone: dark glass over photos, paper over light sections ----
  var bar = document.querySelector('.bar');
  if (bar && 'IntersectionObserver' in window) {
    var darks = document.querySelectorAll('[data-bar="dark"]');
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;right:0;height:' + (parseInt(getComputedStyle(root).getPropertyValue('--bar-h')) + 32) + 'px;pointer-events:none;visibility:hidden';
    document.body.appendChild(probe);
    function tone() {
      var top = probe.getBoundingClientRect().bottom, dark = false;
      darks.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < top && r.bottom > top * 0.5) dark = true;
      });
      bar.classList.toggle('on-paper', !dark);
    }
    tone();
    addEventListener('scroll', tone, { passive: true });
    addEventListener('resize', tone);
  }

  // ---- Reveal once ----
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal, .reveal-lines').forEach(function (el) { io.observe(el); });
  }

  // ---- One scroll clock for pages that want it ----
  var jobs = [], running = false;
  function tick() {
    running = false;
    var y = window.scrollY, vh = innerHeight;
    for (var i = 0; i < jobs.length; i++) jobs[i](y, vh);
  }
  function ask() { if (!running) { running = true; requestAnimationFrame(tick); } }
  window.CJ.onScroll = function (fn) { jobs.push(fn); ask(); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  window.CJ.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  window.CJ.ease = function (p) { return 1 - Math.pow(1 - p, 3); };
})();
