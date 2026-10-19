/* calebjackson.org rebuild, shared behavior. Modules per DESIGN-SYSTEM.md section 2.
   Lenis on native scroll (no virtual scroll), GSAP + ScrollTrigger for scrubbed stages, IntersectionObserver for entrances. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 900px)').matches;
  var page = document.body.dataset.page || '';

  /* ---------- responsive video sources (browsers ignore media= on <source>) ---------- */
  document.querySelectorAll('video[data-src-wide]').forEach(function (v) {
    var tall = window.matchMedia('(max-aspect-ratio: 1/1)').matches;
    if (tall && v.dataset.posterTall) v.poster = v.dataset.posterTall;
    var mp4 = tall ? v.dataset.srcTall : v.dataset.srcWide;
    var webm = tall ? v.dataset.srcTallWebm : v.dataset.srcWideWebm;
    [[mp4, 'video/mp4'], [webm, 'video/webm']].forEach(function (pair) {
      if (!pair[0]) return;
      var src = document.createElement('source'); src.src = pair[0]; src.type = pair[1]; v.appendChild(src);
    });
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
      '<a class="pill inverse" href="sms:+12257470303?&body=Hey%20Caleb%2C%20"><span class="t"><span>Call or text</span><span>(225) 747-0303</span></span><span class="arrow">&rarr;</span></a>' +
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
    if (window.gsap) { gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); }
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

  /* ---------- engagement previews: forms show their done state, nothing is sent yet ---------- */
  document.querySelectorAll('form[data-preview]').forEach(function (f) {
    var done = document.createElement('p'); done.className = 'done'; done.textContent = f.dataset.done || 'Got it.'; f.appendChild(done);
    f.addEventListener('submit', function (e) { e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; } f.classList.add('is-done'); });
  });
  var news = document.querySelector('.news');
  if (news) {
    var nd = document.createElement('p'); nd.className = 'news-done small'; nd.textContent = "You're on the list. One note a month, nothing else."; news.after(nd);
    news.addEventListener('submit', function (e) { e.preventDefault(); if (!news.checkValidity()) { news.reportValidity(); return; } news.classList.add('is-done'); nd.classList.add('is-on'); });
  }
  var bd = document.getElementById('bookDays'), bs = document.getElementById('bookSlots'), bsl = document.getElementById('bookSlot');
  if (bd && bs) {
    var d = new Date(), days = [], names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    while (days.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() > 0 && d.getDay() < 6) days.push(new Date(d)); }
    var times = ['9:00 am', '11:30 am', '2:00 pm', '4:30 pm', '6:00 pm'];
    days.forEach(function (day) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
      b.textContent = names[day.getDay()] + ' ' + (day.getMonth() + 1) + '/' + day.getDate();
      b.addEventListener('click', function () {
        bd.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true');
        bs.innerHTML = ''; bsl.value = '';
        times.forEach(function (t) { var c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.setAttribute('aria-pressed', 'false'); c.textContent = t;
          c.addEventListener('click', function () { bs.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); c.setAttribute('aria-pressed', 'true'); bsl.value = b.textContent + ' ' + t; }); bs.appendChild(c); });
      });
      bd.appendChild(b);
    });
  }


  /* ---------- videos: play only while on screen, one decode at a time below the hero ---------- */
  (function () {
    var vids = Array.prototype.slice.call(document.querySelectorAll('video'));
    if (!vids.length || !('IntersectionObserver' in window)) return;
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.25) { if (v.preload === 'none') v.preload = 'auto'; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.25, 0.6] });
    vids.forEach(function (v) { v.removeAttribute('autoplay'); vio.observe(v); });
  })();

  /* ---------- pixel mosaic reveal: coarse blocks resolve to the image as it enters ---------- */
  function pixelReveal(host, src, steps) {
    if (reduce || !src) return;
    var img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
    img.onload = function () {
      var c = document.createElement('canvas'); c.className = 'pix'; c.width = host.clientWidth || 600; c.height = host.clientHeight || 400; c.style.width = '100%'; c.style.height = '100%';
      var ctx = c.getContext('2d'); if (!ctx) return;
      host.appendChild(c);
      var cells = steps || [48, 32, 20, 12, 7, 4, 2], i = 0;
      function draw() {
        var n = cells[i]; var w = Math.max(1, Math.round(c.width / n)), h = Math.max(1, Math.round(c.height / n));
        ctx.imageSmoothingEnabled = true; ctx.clearRect(0, 0, c.width, c.height);
        var tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; var t = tmp.getContext('2d');
        var r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r;
        t.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, w, h, 0, 0, c.width, c.height);
        i++; if (i < cells.length) setTimeout(draw, 70); else { c.style.transition = 'opacity 0.4s ease-out'; c.style.opacity = '0'; setTimeout(function () { c.remove(); }, 450); }
      }
      draw();
    };
  }
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia) { var hv = heroMedia.querySelector('video'); var poster = hv && hv.getAttribute('poster'); setTimeout(function () { pixelReveal(heroMedia, poster, [40, 28, 18, 11, 6, 3]); }, sessionStorage.getItem('cj-seen') ? 100 : 900); }
  var pio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { var im = e.target.querySelector('img'); pixelReveal(e.target, im && (im.currentSrc || im.src)); pio.unobserve(e.target); } });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-pixelate]').forEach(function (el) { pio.observe(el); });

  /* ---------- pixel dissolve fill on pills (motion kit idea, self-contained) ---------- */
  (function () {
    if (reduce || !window.matchMedia('(hover: hover)').matches) return;
    var cols = 24, rows = 6, frames = 16;
    var order = []; for (var k = 0; k < cols * rows; k++) order.push(k);
    for (var a = order.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)); var tmp = order[a]; order[a] = order[b]; order[b] = tmp; }
    var sprite = document.createElement('canvas'); sprite.width = cols * frames; sprite.height = rows; var sc = sprite.getContext('2d'); sc.fillStyle = '#000';
    for (var f = 0; f < frames; f++) { var upto = Math.round(order.length * f / (frames - 1)); for (var q = 0; q < upto; q++) { var idx = order[q]; sc.fillRect(f * cols + (idx % cols), Math.floor(idx / cols), 1, 1); } }
    var url = 'url(' + sprite.toDataURL() + ')';
    document.querySelectorAll('.pill').forEach(function (pill) {
      var bg = document.createElement('span'); bg.className = 'fillbg'; pill.prepend(bg);
      bg.style.webkitMaskImage = bg.style.maskImage = url; bg.style.webkitMaskSize = bg.style.maskSize = (frames * 100) + '% 100%';
      function size() { var r = pill.getBoundingClientRect(); var cell = Math.max(r.width / cols, r.height / rows); bg.style.width = cell * cols + 'px'; bg.style.height = cell * rows + 'px'; }
      size();
      var step = 0, timer = null;
      function run(dir, done) { clearInterval(timer); timer = setInterval(function () { step += dir; if (step < 0 || step >= frames) { clearInterval(timer); step = Math.max(0, Math.min(frames - 1, step)); done && done(); return; } var pos = (step / (frames - 1)) * 100; bg.style.webkitMaskPosition = bg.style.maskPosition = pos + '% 0'; }, 28); }
      pill.addEventListener('pointerenter', function () { size(); pill.classList.add('is-filling'); pill.classList.remove('is-filled'); step = 0; run(1, function () { pill.classList.add('is-filled'); }); });
      pill.addEventListener('pointerleave', function () { pill.classList.remove('is-filled'); run(-1, function () { pill.classList.remove('is-filling'); }); });
    });
  })();

  /* ---------- entrances ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  document.querySelectorAll('.words, .reveal, .fade, .chevrons, .chev, .sweep').forEach(function (el) { io.observe(el); });
  /* runway cards sit off to the right, so reveal them all once the runway itself is on screen */
  var rio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.querySelectorAll('.reveal, .fade').forEach(function (el, i) { el.style.transitionDelay = (i * 90) + 'ms'; el.classList.add('is-in'); io.unobserve(el); }); rio.unobserve(e.target); } });
  }, { threshold: 0.2 });
  document.querySelectorAll('.runway').forEach(function (r) { rio.observe(r); });
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
    /* One pass, nothing bounces: the copy lifts away, the ground darkens, the name rises behind him and he rises in front of it and stays. Timings are fractions of the 400vh stage. */
    var veil = document.createElement('div'); veil.className = 'hero-veil'; hero.querySelector('.hero-media').after(veil);
    var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
    tl.to('.hero-media video, .hero-media img', { scale: 1.18, ease: 'none', duration: 1 }, 0)
      .to('.hero-hint, .hero-meta', { opacity: 0, duration: 0.08 }, 0)
      .to('.hero-copy', { y: '-24vh', opacity: 0, ease: 'none', duration: 0.28 }, 0.1)
      .to('.hero-veil', { opacity: 0.55, ease: 'none', duration: 0.4 }, 0.2)
      .fromTo('.hero-wordmark', { opacity: 0, y: '40%' }, { opacity: 1, y: '0%', ease: 'none', duration: 0.34 }, 0.3)
      .fromTo('.hero-portrait', { y: '100%', scale: 0.94 }, { y: '2%', scale: 1, ease: 'none', duration: 0.42 }, 0.34);
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


  /* ---------- scrubbed motion below the hero (FIND: every image moves a little while on screen) ---------- */
  document.querySelectorAll('.reveal > img, .reveal > video').forEach(function (m) {
    if (m.closest('.hero') || m.closest('.panel')) return;
    gsap.fromTo(m, { yPercent: -7, scale: 1.14 }, { yPercent: 7, scale: 1.0, ease: 'none', scrollTrigger: { trigger: m.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  document.querySelectorAll('.chev i').forEach(function (c, i) {
    gsap.fromTo(c, { xPercent: -60 - i * 15 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: c.parentNode, start: 'top 95%', end: 'top 35%', scrub: true } });
  });
  document.querySelectorAll('.rows li, .service, .feature, .tl').forEach(function (el, i) {
    gsap.fromTo(el, { y: 70, scale: 0.97 }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 55%', scrub: true } });
  });
  document.querySelectorAll('.service-word').forEach(function (w) {
    gsap.fromTo(w, { x: 80 }, { x: 0, ease: 'none', scrollTrigger: { trigger: w, start: 'top 100%', end: 'top 45%', scrub: true } });
  });
  document.querySelectorAll('.stack-item').forEach(function (item, i, all) {
    if (i === all.length - 1 || phone) return;
    gsap.to(item, { scale: 0.96, ease: 'none', scrollTrigger: { trigger: all[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
  });
  document.querySelectorAll('.why-strip, .asym-wide').forEach(function (el) {
    gsap.fromTo(el, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- page hero parallax ---------- */
  document.querySelectorAll('.page-hero .bg img, .page-hero .bg video').forEach(function (img) {
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.closest('.page-hero'), start: 'top top', end: 'bottom top', scrub: true } });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
