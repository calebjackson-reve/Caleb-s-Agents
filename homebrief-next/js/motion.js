/* Motion and small delights. Everything here degrades to a finished, static page. */
(function () {
  "use strict";
  const doc = document;
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));

  /* ---------- header: transparent over the hero, solid after ---------- */
  const header = $(".site-header");
  const hero = $(".hero");
  function headerState() {
    if (!header) return;
    const solid = !hero || window.scrollY > (hero.offsetHeight - 80);
    header.classList.toggle("solid", solid);
  }
  headerState();
  addEventListener("scroll", headerState, { passive: true });

  /* ---------- menu ---------- */
  const menuBtn = $("[data-menu-open]"), menu = $("[data-menu]");
  if (menuBtn && menu) {
    const close = () => { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus(); };
    menuBtn.addEventListener("click", () => { menu.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); $("[data-menu-close]", menu)?.focus(); });
    $("[data-menu-close]", menu)?.addEventListener("click", close);
    menu.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- kinetic headlines ---------- */
  function split(el) {
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    // Tokens: words, <br>, and the coral period span (kept intact, no space before it).
    const tokens = el.innerHTML.split(/(<span class="period"[\s\S]*?<\/span>|<br\s*\/?>)/).flatMap(part => {
      if (!part) return [];
      if (/^<span class="period"/.test(part) || /^<br/.test(part)) return [part];
      return part.trim().split(/\s+/).filter(Boolean);
    });
    let i = 0, out = "";
    tokens.forEach((t, k) => {
      if (/^<br/.test(t)) { out += t; return; }
      const isPeriod = /^<span class="period"/.test(t);
      const prev = tokens[k - 1], needsSpace = out && !isPeriod && prev && !/^<br/.test(prev);
      out += (needsSpace ? " " : "") + `<span class="w" style="--i:${i++}" aria-hidden="true">${t}</span>`;
    });
    el.innerHTML = out;
  }
  doc.documentElement.classList.add("js");
  const kinetic = $$(".kinetic");
  kinetic.forEach(el => { split(el); if (motionOK.matches) el.classList.add("pending"); });
  const go = () => kinetic.forEach(el => { el.classList.remove("pending"); el.classList.add("go"); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => setTimeout(go, 60)); else setTimeout(go, 200);

  /* ---------- reveals: IntersectionObserver fallback when no scroll timelines ---------- */
  if (motionOK.matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$(".reveal").forEach(el => io.observe(el));
  } else if (!motionOK.matches) {
    $$(".reveal").forEach(el => el.classList.add("in"));
  }

  /* ---------- number tickers ---------- */
  const fmt = new Intl.NumberFormat("en-US");
  function tick(el) {
    const end = parseFloat(el.dataset.ticker), prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
    const decimals = (String(el.dataset.ticker).split(".")[1] || "").length;
    if (!motionOK.matches) { el.textContent = prefix + end.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix; return; }
    const start = performance.now(), dur = 1400;
    function frame(t) {
      const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      const v = end * e;
      el.textContent = prefix + (decimals ? v.toFixed(decimals) : fmt.format(Math.round(v))) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window) {
    const tio = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { tick(e.target); tio.unobserve(e.target); } }), { threshold: 0.5 });
    $$("[data-ticker]").forEach(el => tio.observe(el));
  } else $$("[data-ticker]").forEach(tick);

  /* ---------- magnetic buttons and spotlight tiles (fine pointers only) ---------- */
  if (finePointer.matches && motionOK.matches) {
    $$(".text-caleb, .btn").forEach(btn => {
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0, rect = null;
      const loop = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18; btn.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`; if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(loop); else raf = 0; };
      btn.addEventListener("pointerenter", () => { rect = btn.getBoundingClientRect(); });
      btn.addEventListener("pointermove", e => { if (!rect) rect = btn.getBoundingClientRect(); const dx = e.clientX - (rect.left + rect.width / 2), dy = e.clientY - (rect.top + rect.height / 2); tx = dx * 0.22; ty = dy * 0.22; if (!raf) raf = requestAnimationFrame(loop); });
      btn.addEventListener("pointerleave", () => { tx = ty = 0; rect = null; if (!raf) raf = requestAnimationFrame(loop); });
    });
    $$(".tile").forEach(tile => {
      tile.addEventListener("pointermove", e => { const r = tile.getBoundingClientRect(); tile.style.setProperty("--x", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%"); tile.style.setProperty("--y", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%"); });
    });
  }

  /* ---------- sky: sun altitude over Baton Rouge, no permission prompt ---------- */
  function sunAltitude(date, lat, lng) {
    const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
    const toJulian = d => d.valueOf() / dayMs - 0.5 + J1970;
    const d = toJulian(date) - J2000;
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const e = rad * 23.4397;
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    const lw = rad * -lng, phi = rad * lat;
    const theta = rad * (280.16 + 360.9856235 * d) - lw;
    const H = theta - ra;
    return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;
  }
  function sky() {
    const alt = sunAltitude(new Date(), 30.65, -91.16); // Zachary, LA
    const t = Math.max(0, Math.min(1, (alt + 10) / 28));
    doc.documentElement.style.setProperty("--sky-t", t.toFixed(3));
    const label = $("[data-sky-label]");
    if (label) label.textContent = alt > 6 ? "Daylight in Zachary" : alt > -6 ? "Golden hour in Zachary" : "Night over Zachary";
  }
  sky(); setInterval(sky, 5 * 60 * 1000);

  /* ---------- hero film: plays only when present, allowed and visible ---------- */
  const video = $(".hero-video");
  if (video && motionOK.matches && !saveData) {
    const src = video.dataset.src;
    const tryPlay = () => fetch(src, { method: "HEAD" }).then(r => { if (!r.ok) throw 0; video.src = src; video.muted = true; video.load(); return video.play(); }).then(() => video.classList.add("on")).catch(() => video.remove());
    video.addEventListener("error", () => video.remove(), { once: true });
    if (doc.readyState === "complete") setTimeout(tryPlay, 400); else addEventListener("load", () => setTimeout(tryPlay, 400), { once: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(en => { if (!video.src) return; en[0].isIntersecting ? video.play().catch(() => {}) : video.pause(); }).observe(video);
  }

  /* ---------- hero water: a pond at the bottom of the frame that answers the pointer ---------- */
  const heroWater = $("[data-hero-water]");
  if (heroWater && window.mountWater && hero) {
    const w = window.mountWater(heroWater, { level: 0.52, rippleTarget: hero, renderScale: 0.55, light: "#2B5E6B", deep: "#0B1F26", alpha: 0.82 });
    if (motionOK.matches) {
      let last = 0;
      addEventListener("scroll", () => { const y = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight)); w.setLevel(0.52 + y * 0.35); if (performance.now() - last > 900 && y < 0.6) { last = performance.now(); w.ripple(Math.random(), 0.3 + Math.random() * 0.2); } }, { passive: true });
    }
  }

  /* ---------- the period: press and hold ---------- */
  const egg = $(".egg");
  $$(".period").forEach(p => {
    let timer = 0;
    const show = () => { if (!egg) return; egg.classList.add("on"); };
    const hide = () => { clearTimeout(timer); egg?.classList.remove("on"); };
    p.addEventListener("pointerdown", e => { e.preventDefault(); timer = setTimeout(show, 450); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => p.addEventListener(ev, hide));
    p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
    p.addEventListener("keyup", hide);
  });
  egg?.addEventListener("click", () => egg.classList.remove("on"));

  /* ---------- hover-reveal gallery ---------- */
  const follower = $(".follower");
  if (follower && finePointer.matches) {
    const img = $("img", follower);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const loop = () => { x += (tx - x) * 0.16; y += (ty - y) * 0.16; follower.style.left = x + "px"; follower.style.top = y + "px"; raf = requestAnimationFrame(loop); };
    $$(".list-reveal a[data-img]").forEach(a => {
      a.addEventListener("pointerenter", () => { img.src = a.dataset.img; follower.classList.add("on"); if (!raf) raf = requestAnimationFrame(loop); });
      a.addEventListener("pointerleave", () => follower.classList.remove("on"));
    });
    addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  }

  /* ---------- countdowns ---------- */
  $$("[data-countdown]").forEach(el => {
    const target = new Date(el.dataset.countdown + "T00:00:00-05:00");
    const days = Math.max(0, Math.ceil((target - new Date()) / 86400000));
    el.dataset.ticker = String(days);
    el.textContent = String(days);
  });
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { tick(e.target); cio.unobserve(e.target); } }), { threshold: 0.5 });
    $$("[data-countdown]").forEach(el => cio.observe(el));
  }

  /* ---------- scroll cue ---------- */
  $$("[data-scroll-to]").forEach(a => a.addEventListener("click", e => { const t = $(a.getAttribute("href")); if (!t) return; e.preventDefault(); t.scrollIntoView({ behavior: motionOK.matches ? "smooth" : "auto", block: "start" }); }));

  /* ---------- today's date stamps ---------- */
  const today = new Date();
  $$("[data-today]").forEach(el => { el.textContent = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); el.setAttribute("datetime", today.toISOString().slice(0, 10)); });
})();
