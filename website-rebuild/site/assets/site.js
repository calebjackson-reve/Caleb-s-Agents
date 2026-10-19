/* calebjackson.org rebuild, shared behavior. Modules per DESIGN-SYSTEM.md section 2.
   Lenis on native scroll (no virtual scroll), GSAP + ScrollTrigger for scrubbed stages, IntersectionObserver for entrances. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 900px)').matches;
  var page = document.body.dataset.page || '';

  /* ---------- responsive video sources (browsers ignore media= on <source>) ---------- */
  document.querySelectorAll('video[data-src-wide]').forEach(function (v) {
    var tall = window.matchMedia('(max-aspect-ratio: 1/1)').matches;
    if (tall && v.dataset.posterTall) v.poster = v.dataset.posterTall;
    v.src = tall ? v.dataset.srcTall : v.dataset.srcWide;
    v.load();
  });

  /* ---------- shared header, menu, footer ---------- */
  var NAV = [['search.html', 'Search'], ['communities.html', 'Communities'], ['sell.html', 'Sell'], ['about.html', 'About']];
  function navHtml(cls) {
    return NAV.map(function (n) { return '<a href="' + n[0] + '"' + (page === n[0].replace('.html', '') ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
  }
  var header = document.createElement('header');
  header.className = 'header is-dark';
  header.id = 'header';
  header.innerHTML =
    '<a class="wordmark" href="index.html">caleb jackson<span class="dot">.</span><small>Keller Williams First Choice</small></a>' +
    '<nav class="nav" aria-label="Main">' + navHtml() + '</nav>' +
    '<div class="header-right">' +
      '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu <i></i></button>' +
      '<a class="pill inverse" href="sms:+12257470303"><span class="t"><span>Call or text</span><span>(225) 747-0303</span></span><span class="arrow">&rarr;</span></a>' +
    '</div>';
  var menu = document.createElement('nav');
  menu.className = 'menu'; menu.id = 'menu'; menu.setAttribute('aria-label', 'Menu');
  menu.innerHTML = '<a href="index.html">Home</a>' + navHtml() + '<a href="contact.html">Contact</a><p class="small">(225) 747-0303 &middot; aire@calebjackson.org</p>';
  document.body.insertBefore(menu, document.body.firstChild);
  document.body.insertBefore(header, document.body.firstChild);

  var footer = document.createElement('footer');
  footer.className = 'footer ui-dark';
  footer.innerHTML =
    '<div class="wrap">' +
      '<div class="footer-grid">' +
        '<div><b>Stay in the loop</b><form class="news" onsubmit="return false"><label class="visually-hidden" for="news-email">Email</label><input id="news-email" type="email" placeholder="Email address" autocomplete="email"><button type="submit" aria-label="Subscribe">&rarr;</button></form><p class="small" style="margin-top:1rem">One note a month on the Baton Rouge and Felicianas market. Unsubscribe any time.</p></div>' +
        '<div><b>Pages</b>' + NAV.map(function (n) { return '<a href="' + n[0] + '">' + n[1] + '</a><br>'; }).join('') + '<a href="contact.html">Contact</a></div>' +
        '<div><b>Office</b>Keller Williams First Choice<br>17111 Commerce Centre Drive<br>Prairieville, LA 70769</div>' +
        '<div><b>Reach me</b><a href="tel:+12257470303">(225) 747-0303</a><br><a href="mailto:aire@calebjackson.org">aire@calebjackson.org</a><br><a href="https://www.instagram.com/calebjacksonla/" rel="noopener">Instagram</a><br><a href="https://www.youtube.com/@calebjacksonla" rel="noopener">YouTube</a></div>' +
      '</div>' +
      '<div class="legal"><span>Caleb Jackson, REALTOR&reg;. Keller Williams First Choice. Louisiana license 995709547. Each office is independently owned and operated.</span><span>Equal Housing Opportunity.</span></div>' +
      '<div class="giant" aria-hidden="true">caleb jackson<span class="dot">.</span></div>' +
    '</div>';
  document.body.appendChild(footer);

  /* menu */
  var menuBtn = header.querySelector('.menu-btn');
  menuBtn.addEventListener('click', function () {
    var open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* loader, first visit only in this browser */
  var loader = document.getElementById('loader');
  if (loader) {
    var seen = false; try { seen = sessionStorage.getItem('cj-seen') === '1'; } catch (e) {}
    if (seen || reduce) loader.classList.add('is-done');
    else { setTimeout(function () { loader.classList.add('is-done'); }, 1300); try { sessionStorage.setItem('cj-seen', '1'); } catch (e) {} }
  }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------- header: hide on down, return on up, flip color per section ---------- */
  var lastY = 0;
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-surface]'));
  function headerTick() {
    var y = window.scrollY || 0;
    if (!reduce) header.classList.toggle('is-hidden', y > lastY && y > 160 && !menu.classList.contains('is-open'));
    lastY = y;
    var probe = header.offsetHeight * 0.6;
    var dark = true;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { dark = sections[i].dataset.surface === 'dark'; break; }
    }
    header.classList.toggle('is-dark', dark);
    header.classList.toggle('is-light', !dark);
  }
  window.addEventListener('scroll', headerTick, { passive: true });
  headerTick();

  /* ---------- word split ---------- */
  document.querySelectorAll('.words').forEach(function (el) {
    var lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map(function (line) {
      var tmp = document.createElement('div'); tmp.innerHTML = line;
      var out = '';
      tmp.childNodes.forEach(function (node) {
        if (node.nodeType === 3) {
          out += node.textContent.split(/\s+/).filter(Boolean).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
        } else if (node.nodeType === 1) {
          var inner = node.textContent.split(/\s+/).filter(Boolean).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
          node.innerHTML = inner; out += ' ' + node.outerHTML + ' ';
        }
      });
      return '<span class="line">' + out + '</span>';
    }).join('');
    var i = 0;
    el.querySelectorAll('.w').forEach(function (w) { w.style.transitionDelay = (i++ * 30) + 'ms'; });
  });

  /* ---------- entrances ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  document.querySelectorAll('.words, .reveal, .fade, .chevrons, .sweep').forEach(function (el) { io.observe(el); });
  document.querySelectorAll('[data-stagger]').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); }); });

  /* sweep: gray words turn ink as they pass the middle of the viewport */
  var sweeps = Array.prototype.slice.call(document.querySelectorAll('.sweep'));
  if (sweeps.length) {
    sweeps.forEach(function (el) { el.innerHTML = el.textContent.split(/\s+/).filter(Boolean).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' '); });
    function sweepTick() {
      var mid = window.innerHeight * 0.6;
      sweeps.forEach(function (el) {
        var ws = el.querySelectorAll('.w'); var r = el.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (mid - r.top) / (r.height + window.innerHeight * 0.3)));
        var n = Math.round(p * ws.length);
        ws.forEach(function (w, i) { w.classList.toggle('is-in', i < n); });
      });
    }
    window.addEventListener('scroll', sweepTick, { passive: true }); sweepTick();
  }

  /* ---------- stat count up ---------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.dataset.count); var prefix = el.dataset.prefix || ''; var suffix = el.dataset.suffix || ''; var dec = (el.dataset.count.split('.')[1] || '').length;
    var done = false;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || done) return; done = true;
      if (reduce) { el.textContent = prefix + target.toFixed(dec) + suffix; return; }
      var t0 = null;
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1200); var e = 1 - Math.pow(1 - p, 3); el.textContent = prefix + (target * e).toFixed(dec) + suffix; if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    o.observe(el);
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (lenis) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.lagSmoothing(0); }

  /* ---------- home hero: pinned stage ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
    tl.to('.hero-media video, .hero-media img', { scale: 1.12, ease: 'none', duration: 1 }, 0)
      .to('.hero-copy', { y: '-30vh', opacity: 0, ease: 'none', duration: 0.3 }, 0.15)
      .to('.hero-hint', { opacity: 0, duration: 0.1 }, 0);
    if (document.querySelector('.hero-portrait')) {
      tl.fromTo('.hero-portrait', { y: '100%' }, { y: '6%', ease: 'none', duration: 0.4 }, 0.3);
    }
    tl.fromTo('.hero-wordmark', { opacity: 0, y: '30%' }, { opacity: 1, y: '0%', ease: 'none', duration: 0.3 }, 0.55);
  }

  /* ---------- split panels: slow drift on the photo ---------- */
  document.querySelectorAll('.world-media img, .world-media video').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.world'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- runway: vertical scroll to horizontal travel ---------- */
  document.querySelectorAll('.runway').forEach(function (rw) {
    var track = rw.querySelector('.runway-track');
    function setup() {
      var travel = track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(track).paddingLeft) * 2;
      rw.style.height = (window.innerHeight + Math.max(travel, 0) * 1.2) + 'px';
      return travel;
    }
    var travel = setup();
    gsap.to(track, { x: function () { return -Math.max(setup(), 0); }, ease: 'none', scrollTrigger: { trigger: rw, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true } });
  });

  /* ---------- curved gallery with Curve switch ---------- */
  var gallery = document.querySelector('.gallery');
  if (gallery) {
    var panels = gsap.utils.toArray('.panel');
    var curve = { on: true }; var prog = { p: 0 };
    function render() {
      var p = curve.on ? Math.min(1, prog.p * 1.6) : 1;
      panels.forEach(function (el, i) {
        if (phone) gsap.set(el, { rotateX: -28 * (1 - p), z: -60 * (1 - p), opacity: 0.55 + 0.45 * p });
        else gsap.set(el, { rotateY: (i === 0 ? 1 : -1) * 34 * (1 - p), z: -140 * (1 - p), opacity: 0.65 + 0.35 * p });
      });
    }
    gsap.timeline({ scrollTrigger: { trigger: gallery, start: 'top top', end: 'bottom bottom', scrub: 0.8, onUpdate: function (s) { prog.p = s.progress; render(); } } }).to({}, { duration: 1 });
    gsap.fromTo('.gallery-title', { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: gallery, start: 'top 60%', end: 'top 10%', scrub: true } });
    var sw = document.getElementById('curveSwitch');
    try { curve.on = localStorage.getItem('cj-curve') !== 'off'; } catch (e) {}
    if (sw) {
      sw.setAttribute('aria-checked', String(curve.on));
      sw.addEventListener('click', function () { curve.on = !curve.on; sw.setAttribute('aria-checked', String(curve.on)); try { localStorage.setItem('cj-curve', curve.on ? 'on' : 'off'); } catch (e) {} render(); });
    }
    render();
  }

  /* ---------- closing statement: gradient fill scrubbed ---------- */
  document.querySelectorAll('.closing .fill').forEach(function (el) {
    gsap.fromTo(el, { backgroundPosition: '0 100%' }, { backgroundPosition: '0 0%', ease: 'none', scrollTrigger: { trigger: el.closest('.closing'), start: 'top 70%', end: 'center 40%', scrub: true } });
  });

  /* ---------- page hero parallax ---------- */
  document.querySelectorAll('.page-hero .bg img, .page-hero .bg video').forEach(function (img) {
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('.page-hero'), start: 'top top', end: 'bottom top', scrub: true } });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
