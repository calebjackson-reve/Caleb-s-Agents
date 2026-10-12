// Golf community finder (pilot).
// One choice drives everything: on the course, in a golf community, or near a course.
// Facts carry a status (official, reported, listing, missing) and are never upgraded by the page.
// Homes are Caleb's featured listings only. Distances are straight-line miles, never drive time.
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const num = (v) => Number(String(v ?? "").replace(/[$,\s]/g, ""));
  const proj = ([lon, lat]) => [(lon + 94.1) * 155 + 100, (33.1 - lat) * 178 + 70];
  const miles = (a, b) => {
    const R = 3958.8, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const STATUS = { own: "Caleb’s listing", official: "Official source", reported: "Reported", listing: "Listing claim", missing: "Not found yet", conflict: "Sources conflict" };
  const tag = (st) => `<span class="st st-${st}">${STATUS[st] || st}</span>`;
  const REL = {
    on: { label: "On the course", ask: "a home on the course or with a course view" },
    in: { label: "In a golf community", ask: "a home inside a golf community" },
    near: { label: "Near a course", ask: "a home near a golf course" },
  };
  const WHERE = [["all", "Anywhere in the pilot"], ["br", "Baton Rouge & Zachary"], ["ascension", "Ascension Parish"]];
  const ACCESS = [["any", "Any"], ["public", "Public course"], ["withHome", "Golf comes with the home"]];
  const DIST = [3, 5, 10, 20];
  const CITIES = [["Baton Rouge", -91.15, 30.45], ["Zachary", -91.16, 30.65], ["Gonzales", -90.92, 30.24], ["St. Francisville", -91.38, 30.78], ["Prairieville", -90.97, 30.3]];

  const state = { rel: "in", where: "all", access: "any", dist: 5, budget: "", picked: new Set(), open: null, view: "list" };
  let data = [], homes = [], vb = { x: 0, y: 0, w: 900 };

  // Golf access category from the sourced club notes, conservatively.
  const accessKind = (c) => c.accessKind || "club";
  const accessLine = (c) => accessKind(c) === "public" ? "Public course: anyone can play, no membership needed"
    : accessKind(c) === "withHome" ? "Residents have an HOA golf membership (confirm what dues cover)" : "Club access separate from the HOA: ask the club";

  // ---------- Results ----------
  function homeMatches(h) {
    const b = num(state.budget);
    return !(state.budget && b > 0 && h.price > b * 1.05);
  }
  function rows() {
    const out = [];
    data.forEach((c) => {
      if (state.where !== "all" && c.area !== state.where) return;
      if (state.access !== "any" && accessKind(c) !== state.access) return;
      let hs = [];
      if (state.rel === "near") {
        hs = homes.filter((h) => h.coordinates && homeMatches(h)).map((h) => ({ h, d: miles(h.coordinates, c.course.coordinates) })).filter((x) => x.d <= state.dist).map((x) => ({ ...x.h, dist: x.d, why: `${x.d.toFixed(1)} mi straight line from ${c.course.name}` }));
      } else {
        hs = c.featuredHomes.map((f) => ({ ...homes.find((h) => h.id === f.id), rel: f.relationship, why: f.note, confirm: f.status })).filter((h) => h.id && homeMatches(h));
        if (state.rel === "on") hs = hs.filter((h) => h.rel === "course" || h.rel === "view");
      }
      out.push({ c, homes: hs });
    });
    return out;
  }
  function render() {
    const rs = rows(), allHomes = [...new Map(rs.flatMap((r) => r.homes.map((h) => [h.id, { h, c: r.c }]))).values()];
    const n = rs.length;
    $("#gf-status").innerHTML = `<b>${REL[state.rel].label}</b> · ${n} communit${n === 1 ? "y" : "ies"}, ${allHomes.length} featured home${allHomes.length === 1 ? "" : "s"}${state.rel === "near" ? ` within ${state.dist} mi` : ""}.`;
    // Homes first: they are what the buyer is ultimately after.
    let homesHtml = "";
    if (allHomes.length) {
      homesHtml = `<p class="mini-h">Caleb’s featured homes</p>` + allHomes.map(({ h, c }) => `
        <article class="gf-home">
          <img src="${h.id === "turnberry" ? "assets/web/turnberry-03-800.webp" : "assets/web/basil-front-900.webp"}" alt="" loading="lazy">
          <div><b>${esc(h.name)}</b><span>${money(h.price)} · ${h.beds} bd · ${h.area.toLocaleString()} sq ft · ${esc(h.city.split(",")[0])}</span>
          <small>${esc(h.why || "")} ${h.confirm ? tag(h.confirm) : ""}</small>
          <div class="gf-home-acts"><a class="chip" href="compare.html?add=${esc(h.id)}">See the monthly cost</a><button type="button" class="chip" data-save-home="${esc(h.id)}" data-c="${esc(c.id)}">Save</button></div></div>
        </article>`).join("");
    } else {
      const msg = state.rel === "on"
        ? "None of Caleb’s featured homes has confirmed course frontage right now. Copper Mill and Santa Maria both have homes along the fairways; Caleb can watch for one in your budget."
        : state.rel === "near" ? `No featured home within ${state.dist} miles of these courses. Try a wider distance, or ask Caleb what’s coming up.`
        : "No featured home inside these communities matches right now. Caleb can watch for one.";
      homesHtml = `<div class="gf-empty"><p>${msg}</p><a class="act primary" href="${ask(rs.map((r) => r.c))}">Ask Caleb to watch for one</a></div>`;
    }
    $("#gf-homes").innerHTML = homesHtml;
    $("#gf-communities").innerHTML = `<p class="mini-h">Golf communities</p>` + (rs.length ? rs.map(({ c, homes: hs }) => card(c, hs)).join("") : `<p class="gf-empty">No community matches these filters. Try “Anywhere” or “Any” access.</p>`);
    renderBar(); draw();
  }
  function card(c, hs) {
    const picked = state.picked.has(c.id);
    const viewHome = c.featuredHomes.find((f) => f.relationship === "view"), viewName = viewHome && (homes.find((h) => h.id === viewHome.id) || {}).name;
    const frontage = (c.golfFrontage.exists ? `Homes on the course: yes ${tag(c.golfFrontage.status)}` : `Homes on the course: ${tag("missing")}`) + (viewName ? `</li><li><i class="sw sw-homes"></i>Course view: ${esc(viewName)} ${tag(viewHome.status)}` : "");
    const relFact = state.rel === "on" ? frontage
      : state.rel === "in" ? `${hs.length} featured home${hs.length === 1 ? "" : "s"} inside`
      : `${hs.length} featured home${hs.length === 1 ? "" : "s"} within ${state.dist} mi`;
    return `<article class="gf-card${state.open === c.id ? " on" : ""}" data-open="${c.id}">
      <div class="gf-card-top"><p class="kicker">${esc(c.place)} · ${esc(c.parish)} Parish</p>
        <label class="pick"><input type="checkbox" data-pick="${c.id}"${picked ? " checked" : ""}> Compare</label></div>
      <h3>${esc(c.name)}</h3>
      <p class="gf-sum">${esc(c.summary)}</p>
      <ul class="gf-facts">
        <li><i class="sw sw-golf"></i>${c.course.holes} holes · ${esc(c.course.access)}</li>
        <li><i class="sw sw-homes"></i>${relFact}</li>
        <li><i class="sw sw-communities"></i>${accessLine(c)}</li>
      </ul>
      <a class="act" href="community.html?c=${c.id}">Open community profile</a>
    </article>`;
  }

  // ---------- Community profile ----------
  const point = (p) => `<li>${esc(p.text)} ${tag(p.status)}${p.source ? ` <a href="${esc(p.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</li>`;
  function profile(c) {
    const hs = c.featuredHomes.map((f) => ({ ...homes.find((h) => h.id === f.id), note: f.note, confirm: f.status })).filter((h) => h.id);
    const near = homes.filter((h) => h.coordinates).map((h) => ({ h, d: miles(h.coordinates, c.course.coordinates) })).filter((x) => x.d <= 20).sort((a, b) => a.d - b.d);
    return `<p class="kicker">Golf community · ${esc(c.place)}</p><h2 id="gf-title">${esc(c.name)}</h2>
      <p>${esc(c.summary)}</p>
      <div class="kv"><span><b>${c.course.holes}</b>Holes</span><span><b>${esc(c.course.access.split(" ")[0])}</b>Course access</span><span><b>${c.gated ? esc(c.gated.value) : "?"}</b>Gated</span></div>

      <p class="mini-h">The course</p>
      <p><b>${esc(c.course.name)}</b><br>${esc(c.course.address)}<br>${esc(c.course.detail)}</p>
      <ul class="src">${c.course.sources.map((s) => `<li>${tag(s.status)} <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join("")}</ul>
      <p class="fine">Map point: ${esc(c.course.coordinateNote)}</p>

      <p class="mini-h">Playing privileges</p>
      <div class="note-box"><p><b>Owning a home here and having golf privileges are separate questions.</b> ${esc(c.clubAccess.summary)}</p></div>
      <ul class="pts">${c.clubAccess.points.map(point).join("")}</ul>

      <p class="mini-h">HOA</p>
      <p>${c.hoa.dues ? `${esc(c.hoa.dues)} ${tag(c.hoa.duesStatus)} <a href="${esc(c.hoa.duesSource)}" target="_blank" rel="noopener">Source ↗</a>` : `Dues: ${tag("missing")} ${esc(c.hoa.duesNote)}`}</p>
      <ul class="pts">${c.hoa.points.map(point).join("")}</ul>

      <p class="mini-h">Living here</p>
      <div class="guide-links">${c.amenities.map((a) => `<span class="chip static">${esc(a)}</span>`).join("")}</div>
      <p class="fine">Amenities ${tag(c.amenitiesStatus)}</p>
      <p><b>On the course:</b> ${c.golfFrontage.exists ? esc(c.golfFrontage.text) + " " + tag(c.golfFrontage.status) : tag("missing")}</p>
      ${(c.golfFrontage.examples || []).map((x) => `<p>${esc(x.text)} ${tag(x.status)}</p>`).join("")}
      ${c.schools ? `<p><b>Schools:</b> ${esc(c.schools.text)} ${tag(c.schools.status)}</p>` : ""}

      <p class="mini-h">Caleb’s homes here and nearby</p>
      ${hs.length ? hs.map((h) => `<p><b>${esc(h.name)}</b>, ${money(h.price)} ${h.confirm ? tag(h.confirm) : ""}<br><span class="fine">${esc(h.note)}</span></p>`).join("") : `<p class="fine">No featured home inside ${esc(c.name)} right now.</p>`}
      ${near.filter((x) => !hs.some((h) => h.id === x.h.id)).map((x) => `<p><b>${esc(x.h.name)}</b>, ${money(x.h.price)}, ${x.d.toFixed(1)} mi straight line</p>`).join("")}

      <p class="mini-h">Verify before you decide</p>
      <ul class="pts">${c.verifyNext.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>

      <div class="sheet-actions">
        <a class="act primary" href="${ask([c])}">Help me find a home in ${esc(c.name)}</a>
        <button type="button" class="act" data-pick-btn="${c.id}">${state.picked.has(c.id) ? "Added to compare ✓" : "Add to compare"}</button>
        <button type="button" class="act save" data-save-c="${c.id}">Save to my brief</button>
      </div>`;
  }
  function openProfile(id) {
    const c = data.find((x) => x.id === id); if (!c) return;
    state.open = id; $("#gf-detail").innerHTML = profile(c);
    const sh = $("#gf-sheet"); sh.hidden = false; sh.scrollTop = 0;
    document.body.classList.add("sheet-open");
    flyTo(c.course.coordinates, 120);
    render();
    $("#gf-title").setAttribute("tabindex", "-1"); $("#gf-title").focus({ preventScroll: true });
  }
  function closeProfile() { $("#gf-sheet").hidden = true; state.open = null; document.body.classList.remove("sheet-open"); render(); }

  // ---------- Compare ----------
  function renderBar() {
    const n = state.picked.size, bar = $("#cmp-bar");
    bar.hidden = n === 0;
    $("#cmp-count").textContent = n === 1 ? "1 community picked. Add one more to compare." : `${n} communities picked`;
    $("#cmp-open").disabled = n < 2;
  }
  function compare() {
    const cs = data.filter((c) => state.picked.has(c.id));
    const rowsDef = [
      ["Where", (c) => `${esc(c.place)}, ${esc(c.parish)} Parish`],
      ["Course", (c) => `${c.course.holes} holes · ${esc(c.course.access)}`],
      ["Golf privileges", (c) => esc(c.clubAccess.summary)],
      ["HOA dues", (c) => (c.hoa.dues ? `${esc(c.hoa.dues)} ${tag(c.hoa.duesStatus)}` : tag("missing"))],
      ["Gated", (c) => (c.gated ? `${esc(c.gated.value)} ${tag(c.gated.status)}` : tag("missing"))],
      ["Homes on the course", (c) => (c.golfFrontage.exists ? `Yes ${tag(c.golfFrontage.status)}` : tag("missing"))],
      ["Amenities", (c) => `${c.amenities.map(esc).join(", ")} ${tag(c.amenitiesStatus)}`],
      ["Caleb’s featured homes inside", (c) => (c.featuredHomes.length ? c.featuredHomes.map((f) => esc((homes.find((h) => h.id === f.id) || {}).name)).join(", ") : "None right now")],
      ["To downtown Baton Rouge", (c) => `${miles(c.course.coordinates, [-91.187, 30.451]).toFixed(0)} mi straight line<br><span class="fine">Drive time not measured yet</span>`],
    ];
    $("#cmp-table").style.setProperty("--n", cs.length);
    $("#cmp-table").innerHTML = `<thead><tr><th></th>${cs.map((c) => `<th scope="col">${esc(c.name)}<span>${esc(c.place)}</span></th>`).join("")}</tr></thead><tbody>${rowsDef.map(([l, f]) => `<tr><th scope="row">${l}</th>${cs.map((c) => `<td>${f(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    // The differences that matter most, in plain words.
    const lines = [];
    const kinds = cs.map((c) => [c, accessKind(c)]);
    const pub = kinds.filter(([, k]) => k === "public").map(([c]) => c.name), withHome = kinds.filter(([, k]) => k === "withHome").map(([c]) => c.name), clubSet = kinds.filter(([, k]) => k === "club").map(([c]) => c.name);
    if (new Set(kinds.map(([, k]) => k)).size > 1)
      lines.push(`The biggest difference is golf access: ${[withHome.length && `at ${withHome.join(" and ")}, listings say golf comes with HOA dues`, pub.length && `${pub.join(" and ")} ${pub.length > 1 ? "are" : "is"} a public course anyone can play`, clubSet.length && `at ${clubSet.join(" and ")}, the club sets its own terms`].filter(Boolean).join("; ")}.`);
    const dists = cs.map((c) => [c.name, miles(c.course.coordinates, [-91.187, 30.451])]).sort((a, b) => a[1] - b[1]);
    if (dists.length > 1 && dists.at(-1)[1] - dists[0][1] > 4) lines.push(`${dists[0][0]} is closest to downtown Baton Rouge, about ${dists[0][1].toFixed(0)} miles in a straight line, versus ${dists.at(-1)[1].toFixed(0)} for ${dists.at(-1)[0]}.`);
    const missingDues = cs.filter((c) => !c.hoa.dues).map((c) => c.name);
    if (missingDues.length) lines.push(`HOA dues are still unconfirmed for ${missingDues.join(" and ")}, so ask before comparing monthly costs.`);
    $("#cmp-diff").innerHTML = lines.map(esc).join(" ");
    $("#cmp-ask").href = ask(cs);
    const el = $("#cmp"); el.hidden = false; el.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // ---------- Contact ----------
  function ask(cs) {
    const b = num(state.budget);
    const body = `Hi Caleb, help me find ${REL[state.rel].ask}${cs.length ? ` in or near ${cs.map((c) => c.name).join(", ")}` : ""}.` +
      (b > 0 ? ` My budget is about ${money(b)}.` : "") + (state.rel === "near" ? ` Within about ${state.dist} miles of the course.` : "") + " What's available?";
    return "sms:+12257470303?&body=" + encodeURIComponent(body);
  }

  // ---------- Map ----------
  const svg = $("#gf-svg");
  function setView(v) {
    if (!svg.clientWidth) return;
    const ratio = svg.clientHeight / Math.max(1, svg.clientWidth);
    vb = { x: v.x, y: v.y, w: Math.max(30, Math.min(1200, v.w)) };
    svg.setAttribute("viewBox", `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${(vb.w * ratio).toFixed(2)}`);
    draw();
  }
  let anim = 0;
  function animateTo(t) {
    cancelAnimationFrame(anim);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setView(t);
    const f = { ...vb }, t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 650), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setView({ x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e, w: f.w + (t.w - f.w) * e }); if (k < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  function flyTo(coord, w) {
    if (!svg.clientWidth) return;
    const [x, y] = proj(coord), r = svg.clientHeight / Math.max(1, svg.clientWidth);
    // On desktop the profile panel covers the right side of the map, so center the course in the visible part.
    const rect = svg.getBoundingClientRect(), panel = matchMedia("(min-width: 901px)").matches ? Math.min(460, innerWidth) : 0;
    const covered = Math.max(0, rect.right - (innerWidth - panel)), shift = (covered / 2) * (w / rect.width);
    animateTo({ x: x - w / 2 + shift, y: y - (w * r) / 2, w });
  }
  function fit() {
    if (!svg.clientWidth) return;
    const shown = rows().map((r) => r.c);
    const pts = (shown.length ? shown : data).map((c) => proj(c.course.coordinates));
    const pad = state.rel === "near" ? state.dist * 2.6 + 12 : 22;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), r = svg.clientHeight / Math.max(1, svg.clientWidth);
    let w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    if (h / w > r) w = h / r;
    // Leave room on the right for the course names drawn beside each pin.
    w = Math.max(w, 60) * 1.28;
    animateTo({ x: (Math.min(...xs) + Math.max(...xs)) / 2 - w * 0.42, y: (Math.min(...ys) + Math.max(...ys)) / 2 - (w * r) / 2, w });
  }
  function draw() {
    if (!data.length) return;
    const k = vb.w / Math.max(1, svg.clientWidth), shown = rows(), ids = new Set(shown.map((r) => r.c.id));
    const ux = 155 / 59.5, uy = 178 / 69; // drawing units per mile at this latitude
    $("#gf-rings").innerHTML = state.rel === "near" ? shown.map(({ c }) => { const [x, y] = proj(c.course.coordinates);
      return `<ellipse cx="${x}" cy="${y}" rx="${state.dist * ux}" ry="${state.dist * uy}" class="ring"/><text x="${x}" y="${y - state.dist * uy - 5 * k}" class="ring-l" font-size="${11 * k}" text-anchor="middle">${state.dist} mi</text>`; }).join("") : "";
    $("#gf-cities").innerHTML = CITIES.map(([n, lon, lat]) => { const [x, y] = proj([lon, lat]);
      return `<g class="city"><circle cx="${x}" cy="${y}" r="${2 * k}"/><text x="${x - 6 * k}" y="${y + 4 * k}" font-size="${11 * k}" text-anchor="end">${n}</text></g>`; }).join("");
    const homePins = [...new Map(shown.flatMap((r) => r.homes).filter((h) => h.coordinates).map((h) => [h.id, h])).values()];
    $("#gf-pins").innerHTML = data.map((c) => { const [x, y] = proj(c.course.coordinates), on = ids.has(c.id), sel = state.open === c.id, r = 9 * k;
      return `<g class="gpin${on ? "" : " off"}${sel ? " sel" : ""}" data-open="${c.id}" role="button" aria-label="${esc(c.name)}">${sel ? `<circle cx="${x}" cy="${y}" r="${r * 2.2}" class="pin-halo"/>` : ""}<circle cx="${x}" cy="${y}" r="${r * 2.4}" class="pin-hit"/><circle cx="${x}" cy="${y}" r="${r}" class="pin-golf"/><text x="${x + r + 6 * k}" y="${y + 5 * k}" font-size="${14 * k}" class="pin-label">${esc(c.name)}</text></g>`; }).join("") +
      homePins.map((h) => { const [x, y] = proj(h.coordinates), r = 7 * k;
        return `<g class="hpin"><rect x="${x - r * .8}" y="${y - r * .8}" width="${r * 1.6}" height="${r * 1.6}" transform="rotate(45 ${x} ${y})" class="pin-home"/><text x="${x - r - 5 * k}" y="${y + 15 * k}" font-size="${12 * k}" class="pin-label" text-anchor="end">${esc(h.name)}</text></g>`; }).join("");
    $("#gf-legend").innerHTML = `<span><i class="sw sw-golf"></i>Golf community course</span><span><i class="sw sw-homes"></i>Caleb’s featured home</span>${state.rel === "near" ? `<span class="muted">Ring: ${state.dist} mi straight line, not drive time</span>` : ""}`;
  }
  // Drag to pan, wheel and buttons to zoom.
  const stage = $("#gf-stage"); let drag = null;
  stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".map-buttons")) return; drag = { x: e.clientX, y: e.clientY, v: { ...vb }, moved: 0, t: e.target }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", (e) => { if (!drag) return; const s = drag.v.w / svg.clientWidth, dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); setView({ x: drag.v.x - dx * s, y: drag.v.y - dy * s, w: drag.v.w }); });
  stage.addEventListener("pointerup", () => { if (drag && drag.moved < 6) { const p = drag.t.closest && drag.t.closest("[data-open]"); if (p) location.href = "community.html?c=" + p.dataset.open; } drag = null; });
  stage.addEventListener("wheel", (e) => { e.preventDefault(); const f = Math.pow(1.0018, e.deltaY), rc = svg.getBoundingClientRect(), s = vb.w / svg.clientWidth, ux = vb.x + (e.clientX - rc.left) * s, uy = vb.y + (e.clientY - rc.top) * s, w = vb.w * f; setView({ x: ux - (ux - vb.x) * (w / vb.w), y: uy - (uy - vb.y) * (w / vb.w), w }); }, { passive: false });
  document.querySelectorAll("[data-z]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.z === "fit") return fit(); const f = b.dataset.z === "in" ? 0.7 : 1.4, cx = vb.x + vb.w / 2, cy = vb.y + (vb.w * svg.clientHeight / svg.clientWidth) / 2, w = vb.w * f; animateTo({ x: cx - w / 2, y: cy - (w * svg.clientHeight / svg.clientWidth) / 2, w }); }));
  addEventListener("resize", () => setView({ ...vb }));

  // ---------- Controls ----------
  function chips() {
    document.querySelectorAll("[data-rel]").forEach((b) => { const on = b.dataset.rel === state.rel; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    $("#where-chips").innerHTML = WHERE.map(([v, l]) => `<button type="button" class="chip${state.where === v ? " on" : ""}" aria-pressed="${state.where === v}" data-where="${v}">${l}</button>`).join("");
    $("#access-chips").innerHTML = ACCESS.map(([v, l]) => `<button type="button" class="chip${state.access === v ? " on" : ""}" aria-pressed="${state.access === v}" data-access="${v}">${l}</button>`).join("");
    $("#dist-chips").innerHTML = DIST.map((d) => `<button type="button" class="chip${state.dist === d ? " on" : ""}" aria-pressed="${state.dist === d}" data-dist="${d}">${d} mi</button>`).join("");
    $("#dist-ctl").hidden = state.rel !== "near";
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, label, article"); if (!t) return;
    if (t.dataset.rel) { state.rel = t.dataset.rel; chips(); render(); fit(); }
    else if (t.dataset.where) { state.where = t.dataset.where; chips(); render(); fit(); }
    else if (t.dataset.access) { state.access = t.dataset.access; chips(); render(); fit(); }
    else if (t.dataset.dist) { state.dist = +t.dataset.dist; chips(); render(); fit(); }
    else if (t.dataset.profile) location.href = "community.html?c=" + t.dataset.profile;
    else if (t.dataset.view) { state.view = t.dataset.view; $(".gf-body").dataset.view = state.view; document.querySelectorAll("[data-view]").forEach((b) => b.tagName === "BUTTON" && b.setAttribute("aria-selected", String(b.dataset.view === state.view))); requestAnimationFrame(() => { setView({ ...vb }); fit(); }); }
    else if (t.dataset.pickBtn) { const id = t.dataset.pickBtn; state.picked.has(id) ? state.picked.delete(id) : state.picked.add(id); t.textContent = state.picked.has(id) ? "Added to compare ✓" : "Add to compare"; render(); }
    else if (t.dataset.saveC && window.Brief) {
      const c = data.find((x) => x.id === t.dataset.saveC);
      window.Brief.add({ id: "gc-" + c.id, type: "Golf community", title: c.name, lines: [`${c.place}, ${c.course.holes}-hole ${c.course.access.toLowerCase()} course`, accessLine(c), `Looking for: ${REL[state.rel].label.toLowerCase()}`] });
      t.textContent = "Saved to my brief ✓";
    } else if (t.dataset.saveHome && window.Brief) {
      const h = homes.find((x) => x.id === t.dataset.saveHome), c = data.find((x) => x.id === t.dataset.c);
      window.Brief.add({ id: "place-" + h.id, type: "Home", title: h.name, lines: [`${money(h.price)}, ${h.beds} bedrooms, ${h.city}`, `Golf: ${REL[state.rel].label.toLowerCase()}, ${c.name}`] });
      t.textContent = "Saved ✓";
    } else if (t.id === "cmp-open") location.href = "communities.html?c=" + [...state.picked].join(",");
    else if (t.id === "cmp-clear") { state.picked.clear(); $("#cmp").hidden = true; render(); }
    else if (t.id === "cmp-close") $("#cmp").hidden = true;
    else if (t.id === "cmp-save" && window.Brief) {
      const cs = data.filter((c) => state.picked.has(c.id));
      window.Brief.add({ id: "gc-shortlist", type: "Golf shortlist", title: cs.map((c) => c.name).join(" vs "), lines: [`Looking for: ${REL[state.rel].label.toLowerCase()}`, ...cs.map((c) => `${c.name}: ${accessLine(c)}`)] });
      t.textContent = "Saved to my brief ✓";
    } else if (t.classList.contains("sheet-close") && t.closest("#gf-sheet")) closeProfile();
    else if (t.tagName === "ARTICLE" && t.dataset.open && !e.target.closest("label, input, a, button")) location.href = "community.html?c=" + t.dataset.open;
  });
  document.addEventListener("change", (e) => {
    const id = e.target.dataset.pick; if (!id) return;
    e.target.checked ? state.picked.add(id) : state.picked.delete(id); renderBar();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#gf-sheet").hidden) closeProfile(); });
  $("#budget").addEventListener("input", (e) => { state.budget = e.target.value; render(); });

  // ---------- Data ----------
  async function get(url, fallback) {
    try { const r = await fetch(url); if (!r.ok) throw Error(); return await r.json(); }
    catch (e) { if (fallback) return fallback; throw e; }
  }
  (async () => {
    const g = await get("data/golf-communities.json", window.GOLF_DATA);
    homes = await get("data/properties.json", window.MAP_DATA && window.MAP_DATA["data/properties.json"]);
    data = g.communities;
    chips(); setView({ x: 0, y: 0, w: 900 }); render(); fit();
  })();
})();
