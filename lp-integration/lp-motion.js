/* ==========================================================================
   calebjackson.org on Luxury Presence: motion bootstrap
   Loads GSAP, ScrollTrigger, SplitText and the motion kit from jsDelivr,
   then applies the effects Caleb approved to LP's own markup:
     - heading rise (lines masked) on section headings
     - word color sweep on the first paragraph of each section
     - fade-up on cards and buttons
     - pixel-dissolve fill on LP buttons
   No smooth scroll, no custom cursor, no loader (not approved).
   Change KIT_REF to "main" once PR 17 is merged.
   ========================================================================== */
(function () {
  var KIT_REF = 'claude/kind-cannon-oxugur';
  var base = 'https://cdn.jsdelivr.net/gh/calebjackson-reve/Caleb-s-Agents@' + KIT_REF + '/motion-kit/';
  var scripts = [
    'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
    'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
    'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js',
    base + 'motion.js'
  ];
  function load(i) {
    if (i >= scripts.length) return ready();
    var s = document.createElement('script'); s.src = scripts[i]; s.async = false; s.onload = function () { load(i + 1); }; s.onerror = function () { load(i + 1); };
    document.head.appendChild(s);
  }
  function ready() {
    if (!window.gsap || !window.ScrollTrigger || !window.MotionKit) return;
    gsap.registerPlugin(ScrollTrigger, window.SplitText);
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Tag LP sections for the kit's declarative reveals
    document.querySelectorAll('section.solid-section, section.video-section').forEach(function (sec) {
      if (sec.querySelector('[data-reveal]')) return;
      sec.setAttribute('data-reveal-group', '');
      sec.querySelectorAll('h1, h2, .lp-h2, h3, .lp-h3').forEach(function (h) { if (!reduce) h.setAttribute('data-reveal', 'heading'); });
      var p = sec.querySelector('p');
      if (p && p.textContent.trim().length > 40 && p.textContent.trim().length < 400) p.setAttribute('data-reveal', 'words');
      sec.querySelectorAll('.gallery-card, .lp-btn, .btn, img').forEach(function (el) { if (!el.closest('[data-reveal]')) el.setAttribute('data-reveal', el.tagName === 'IMG' ? 'image' : 'fade-up'); });
    });
    // Buttons: give each LP button the kit's two-copy label and pixel fill
    document.querySelectorAll('.lp-btn, .btn').forEach(function (b) {
      if (b.classList.contains('mk-btn')) return;
      b.classList.add('mk-btn');
    });
    MotionKit.btnFill.init('.mk-btn');
    if (!reduce) MotionKit.reveal.init();
    ScrollTrigger.refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { load(0); }); else load(0);
})();
