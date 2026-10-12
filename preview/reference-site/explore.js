// Explore map: golf courses, Caleb's area guides and featured homes on one South Louisiana map.
// Only source-backed points are pinned. Places without a verified location stay in the list and say so.
// Flood zones are not drawn: each place offers a link to FEMA's official map at its address instead.
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const SMS = "sms:+12257470303?&body=";

  // Same projection the state outline was drawn with (900 x 850 drawing units).
  const proj = ([lon, lat]) => [(lon + 94.1) * 155 + 100, (33.1 - lat) * 178 + 70];
  const miles = (a, b) => {
    const R = 3958.8, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const LAYERS = [
    { id: "golf", label: "Golf courses" },
    { id: "homes", label: "Featured homes" },
    { id: "communities", label: "Area guides" },
  ];
  const AREAS = [
    { id: "all", label: "All of South Louisiana", box: [-93.95, 29.25, -89.55, 31.05] },
    { id: "br", label: "Baton Rouge area", box: [-91.75, 30.1, -90.6, 30.95] },
    { id: "nola", label: "New Orleans & Northshore", box: [-90.6, 29.75, -89.75, 30.6] },
    { id: "acadiana", label: "Lafayette & Acadiana", box: [-92.6, 29.5, -91.1, 30.55] },
    { id: "houma", label: "Houma & Thibodaux", box: [-91.05, 29.4, -90.35, 29.95] },
    { id: "lc", label: "Lake Charles & Southwest", box: [-93.85, 29.95, -92.75, 30.45] },
  ];
  const ACCESS = ["Any", "Public", "Semi-private", "Private", "Resort"];
  // Approximate city centers, for orientation only.
  const CITIES = [
    ["Baton Rouge", -91.15, 30.45, 1], ["New Orleans", -90.07, 29.95, 1], ["Lafayette", -92.02, 30.22, 1],
    ["Lake Charles", -93.22, 30.23, 1], ["Houma", -90.72, 29.6, 2], ["Covington", -90.1, 30.48, 2],
    ["St. Francisville", -91.38, 30.78, 2], ["New Roads", -91.44, 30.7, 3], ["Zachary", -91.16, 30.65, 3],
    ["Thibodaux", -90.82, 29.8, 3], ["Hammond", -90.46, 30.5, 3],
  ];
  const areaOf = (p) => {
    if (p.kind !== "golf") return "br";
    if (p.region === "Baton Rouge region") return "br";
    return { "New Orleans metro": "nola", Northshore: "nola", "Lafayette/Acadiana": "acadiana", "Houma/Thibodaux": "houma", "Lake Charles / Southwest": "lc" }[p.area] || "all";
  };
  const areaLabel = (p) => (AREAS.find((a) => a.id === areaOf(p)) || AREAS[0]).label;

  const svg = $("#map-svg"), stage = $("#map-stage"), markers = $("#place-markers"), cities = $("#map-cities");
  const list = $("#places-list"), status = $("#layer-status"), search = $("#place-search"), sheet = $("#place-sheet");
  const state = { layers: new Set(["golf", "homes", "communities"]), area: "all", access: "Any", flood: false, selected: null };
  let places = [], vb = { x: 0, y: 0, w: 900, h: 850 };

  // ---------- Camera ----------
  const pxPerUnit = () => svg.clientWidth / vb.w;
  function setView(next) {
    const ratio = svg.clientHeight / Math.max(1, svg.clientWidth);
    next.w = Math.min(1400, Math.max(55, next.w));
    next.h = next.w * ratio;
    vb = next;
    svg.setAttribute("viewBox", `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
    draw();
  }
  function fitBox([w, s, e, n], pad = 0.08) {
    const [x1, y1] = proj([w, n]), [x2, y2] = proj([e, s]);
    const ratio = svg.clientHeight / Math.max(1, svg.clientWidth);
    let bw = (x2 - x1) * (1 + pad * 2), bh = (y2 - y1) * (1 + pad * 2);
    if (bh / bw > ratio) bw = bh / ratio;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    animateTo({ x: cx - bw / 2, y: cy - (bw * ratio) / 2, w: bw });
  }
  let anim = 0;
  function animateTo(target) {
    cancelAnimationFrame(anim);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setView({ ...target });
    const from = { ...vb }, t0 = performance.now(), dur = 650;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e });
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function zoomAt(factor, sx, sy) {
    const k = 1 / pxPerUnit(), ux = vb.x + sx * k, uy = vb.y + sy * k, w = Math.min(1400, Math.max(55, vb.w * factor));
    const s = w / vb.w;
    setView({ x: ux - (ux - vb.x) * s, y: uy - (uy - vb.y) * s, w });
  }

  // Drag, pinch and wheel. A tap that barely moves selects the pin under it.
  const pointers = new Map();
  let gesture = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".map-buttons")) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(anim);
    gesture = { start: { ...vb }, pts: new Map([...pointers].map(([k, v]) => [k, { ...v }])), moved: 0, target: e.target };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const k = 1 / pxPerUnit(), rect = svg.getBoundingClientRect();
    const ids = [...pointers.keys()];
    if (ids.length === 1) {
      const a = gesture.pts.get(ids[0]); if (!a) return;
      const dx = e.clientX - a.x, dy = e.clientY - a.y;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
      setView({ x: gesture.start.x - dx * (gesture.start.w / svg.clientWidth), y: gesture.start.y - dy * (gesture.start.w / svg.clientWidth), w: gesture.start.w });
    } else if (ids.length >= 2) {
      const [p, q] = ids.slice(0, 2).map((i) => pointers.get(i)), [p0, q0] = ids.slice(0, 2).map((i) => gesture.pts.get(i));
      if (!p0 || !q0) return;
      const d0 = Math.hypot(q0.x - p0.x, q0.y - p0.y), d1 = Math.hypot(q.x - p.x, q.y - p.y);
      const mx = (p0.x + q0.x) / 2 - rect.left, my = (p0.y + q0.y) / 2 - rect.top, sk = gesture.start.w / svg.clientWidth;
      const w = Math.min(1400, Math.max(55, gesture.start.w * (d0 / Math.max(10, d1))));
      const ux = gesture.start.x + mx * sk, uy = gesture.start.y + my * sk, s = w / gesture.start.w;
      const nx = (p.x + q.x) / 2 - rect.left - mx, ny = (p.y + q.y) / 2 - rect.top - my;
      gesture.moved = 99;
      setView({ x: ux - (ux - gesture.start.x) * s - nx * (w / svg.clientWidth), y: uy - (uy - gesture.start.y) * s - ny * (w / svg.clientWidth), w });
      void k;
    }
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (gesture && gesture.moved < 6 && pointers.size === 0) {
      const pin = gesture.target.closest && gesture.target.closest("[data-place]");
      if (pin) select(pin.dataset.place, { fly: false });
    }
    if (pointers.size === 0) gesture = null;
    else gesture = { start: { ...vb }, pts: new Map([...pointers].map(([k, v]) => [k, { ...v }])), moved: 99, target: stage };
  };
  ["pointerup", "pointercancel"].forEach((t) => stage.addEventListener(t, endPointer));
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.pow(1.0018, e.deltaY), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  stage.addEventListener("keydown", (e) => {
    const step = vb.w * 0.12;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) { e.preventDefault(); setView({ x: vb.x + moves[e.key][0], y: vb.y + moves[e.key][1], w: vb.w }); }
    if (e.key === "+" || e.key === "=") zoomAt(0.75, svg.clientWidth / 2, svg.clientHeight / 2);
    if (e.key === "-") zoomAt(1.33, svg.clientWidth / 2, svg.clientHeight / 2);
  });
  document.querySelectorAll("[data-map]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.map === "in") zoomAt(0.7, svg.clientWidth / 2, svg.clientHeight / 2);
    if (b.dataset.map === "out") zoomAt(1.4, svg.clientWidth / 2, svg.clientHeight / 2);
    if (b.dataset.map === "fit") fitShown();
  }));
  addEventListener("resize", () => setView({ ...vb }));

  // ---------- Filtering ----------
  const visible = () => {
    const q = search.value.trim().toLowerCase();
    return places.filter((p) =>
      state.layers.has(p.kind) &&
      (state.area === "all" || areaOf(p) === state.area) &&
      (p.kind !== "golf" || state.access === "Any" || p.access === state.access) &&
      (!q || [p.name, p.city, p.parish, p.area, p.address].some((v) => v && v.toLowerCase().includes(q))));
  };
  function fitShown() {
    const pts = visible().filter((p) => p.coordinates);
    if (pts.length < 2) return fitBox((AREAS.find((a) => a.id === state.area) || AREAS[0]).box);
    const lons = pts.map((p) => p.coordinates[0]), lats = pts.map((p) => p.coordinates[1]);
    fitBox([Math.min(...lons) - 0.15, Math.min(...lats) - 0.12, Math.max(...lons) + 0.15, Math.max(...lats) + 0.12]);
  }

  // ---------- Controls ----------
  function chip(attrs, on, inner) { return `<button type="button" class="chip${on ? " on" : ""}" aria-pressed="${on}" ${attrs}>${inner}</button>`; }
  function renderControls() {
    const by = (k) => places.filter((p) => p.kind === k);
    $("#layer-chips").innerHTML = LAYERS.map((l) => {
      const all = by(l.id), mapped = all.filter((p) => p.coordinates).length;
      return chip(`data-layer="${l.id}"`, state.layers.has(l.id), `<i class="sw sw-${l.id}" aria-hidden="true"></i>${l.label}<small>${all.length} · ${mapped ? mapped + " on map" : "list only"}</small>`);
    }).join("") + chip(`data-flood`, state.flood, `<i class="sw sw-flood" aria-hidden="true"></i>Flood zones<small>check by address</small>`);
    $("#flood-note").hidden = !state.flood;
    $("#area-chips").innerHTML = AREAS.map((a) => chip(`data-area="${a.id}"`, state.area === a.id, a.label)).join("");
    $("#access-chips").innerHTML = ACCESS.map((a) => chip(`data-access="${a}"`, state.access === a, a === "Any" ? "Any access" : a)).join("");
    $("#access-ctl").hidden = !state.layers.has("golf");
    $("#map-legend").innerHTML = LAYERS.filter((l) => state.layers.has(l.id) && l.id !== "communities")
      .map((l) => `<span><i class="sw sw-${l.id}"></i>${l.label}</span>`).join("") + (state.layers.has("communities") ? `<span class="muted">Area guides are listed, not pinned</span>` : "");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    if (b.dataset.layer) { state.layers.has(b.dataset.layer) ? state.layers.delete(b.dataset.layer) : state.layers.add(b.dataset.layer); }
    else if ("flood" in b.dataset) state.flood = !state.flood;
    else if (b.dataset.area) { state.area = b.dataset.area; fitBox(AREAS.find((a) => a.id === state.area).box); }
    else if (b.dataset.access) state.access = b.dataset.access;
    else return;
    renderControls(); renderList(); draw();
  });
  search.addEventListener("input", () => { renderList(); draw(); });

  // ---------- List ----------
  const subline = (p) => p.kind === "golf"
    ? `Golf · ${esc(p.access)}${p.holes ? " · " + p.holes + " holes" : ""} · ${esc(areaLabel(p))}`
    : p.kind === "homes" ? `${money(p.price)} · ${p.beds} bd · ${esc(p.city.split(",")[0])}` : `Area guide · ${esc(areaLabel(p))}`;
  function renderList() {
    const shown = visible(), onMap = shown.filter((p) => p.coordinates).length;
    status.textContent = shown.length
      ? `Showing ${shown.length} place${shown.length === 1 ? "" : "s"}: ${onMap} on the map, ${shown.length - onMap} in the list only.`
      : "Nothing matches. Turn a layer back on, choose another area or clear the search.";
    const order = { homes: 0, golf: 1, communities: 2 };
    list.innerHTML = shown.slice().sort((a, b) => order[a.kind] - order[b.kind] || (b.coordinates ? 1 : 0) - (a.coordinates ? 1 : 0) || a.name.localeCompare(b.name))
      .map((p) => `<button type="button" class="place-row${state.selected === p.id ? " on" : ""}" data-pick="${esc(p.id)}">
        <i class="sw sw-${p.kind}" aria-hidden="true"></i>
        <span class="pr-main"><b>${esc(p.name)}</b><span>${subline(p)}</span></span>
        <span class="pr-pin ${p.coordinates ? "yes" : "no"}">${p.coordinates ? "On map" : "List only"}</span></button>`).join("");
  }
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) select(b.dataset.pick, { fly: true }); });

  // ---------- Map drawing ----------
  function draw() {
    const k = 1 / pxPerUnit(), shown = visible(), zoomed = vb.w < 360;
    // Town names step aside wherever a pin would sit on top of them.
    const pinPts = shown.filter((p) => p.coordinates).map((p) => proj(p.coordinates));
    const clear = ([, lon, lat]) => { const [x, y] = proj([lon, lat]); return pinPts.every(([px, py]) => Math.hypot(px - x, py - y) / k > 26); };
    cities.innerHTML = CITIES.filter((c) => (c[3] === 1 || (c[3] === 2 && vb.w < 700) || (c[3] === 3 && vb.w < 360)) && clear(c))
      .map(([n, lon, lat]) => { const [x, y] = proj([lon, lat]); return `<g class="city"><circle cx="${x}" cy="${y}" r="${2.2 * k}"/><text x="${x - 6 * k}" y="${y + 4 * k}" font-size="${11.5 * k}" text-anchor="end">${n}</text></g>`; }).join("");
    markers.innerHTML = shown.filter((p) => p.coordinates).sort((a) => (a.id === state.selected ? 1 : 0)).map((p) => {
      const [x, y] = proj(p.coordinates), sel = p.id === state.selected, r = (p.kind === "homes" ? 9 : 7) * k;
      const shape = p.kind === "homes"
        ? `<rect x="${x - r * 0.8}" y="${y - r * 0.8}" width="${r * 1.6}" height="${r * 1.6}" transform="rotate(45 ${x} ${y})" class="pin-home"/>`
        : `<circle cx="${x}" cy="${y}" r="${r}" class="pin-golf"/>`;
      const label = sel || zoomed ? `<text class="pin-label" x="${x + r + 5 * k}" y="${y + 4 * k}" font-size="${12.5 * k}">${esc(p.name.replace(/ Golf (Course|Club)$/, ""))}</text>` : "";
      return `<g class="pin${sel ? " sel" : ""}" data-place="${esc(p.id)}" role="button" tabindex="-1" aria-label="${esc(p.name)}">${sel ? `<circle cx="${x}" cy="${y}" r="${r * 2.1}" class="pin-halo"/>` : ""}<circle cx="${x}" cy="${y}" r="${r * 2.2}" class="pin-hit"/>${shape}${label}</g>`;
    }).join("");
  }

  // ---------- Place details ----------
  const imgFor = (p) => p.image === "basil-front.png" ? "assets/web/basil-front-900.webp" : p.image === "turnberry-03.jpg" ? "assets/web/turnberry-03-800.webp"
    : p.image ? `assets/web/${p.image.replace(/\.(jpg|png)$/, "")}-480.webp` : null;
  const femaLink = (addr) => `https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(addr)}`;
  function nearby(p) {
    if (!p.coordinates) return "";
    const near = places.filter((o) => o.id !== p.id && o.coordinates).map((o) => ({ o, d: miles(p.coordinates, o.coordinates) }))
      .filter((x) => x.d <= 25).sort((a, b) => a.d - b.d).slice(0, 4);
    if (!near.length) return `<p class="fine">No other pinned places within 25 miles yet.</p>`;
    return `<ul class="near">${near.map(({ o, d }) => `<li><button type="button" data-pick="${esc(o.id)}"><i class="sw sw-${o.kind}"></i>${esc(o.name)}</button><span>${d.toFixed(1)} mi</span></li>`).join("")}</ul><p class="fine">Straight-line distance, not drive time.</p>`;
  }
  function detail(p) {
    const img = imgFor(p), addr = p.address ? (p.city ? `${p.address}, ${p.city}` : p.address) : "";
    let kicker, facts = "", body = "", actions = [];
    const ask = (t) => SMS + encodeURIComponent(t);
    if (p.kind === "golf") {
      kicker = `Golf course · ${esc(p.access)}${p.holes ? " · " + p.holes + " holes" : ""}`;
      facts = `<p class="addr">${esc(p.address)}${p.parish ? ` · ${esc(p.parish)} Parish` : ""}</p>`;
      body = `${p.context ? `<p>${esc(p.context)}${p.contextSourceUrl ? ` <a href="${esc(p.contextSourceUrl)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</p>` : ""}
        <p class="fine">${p.statusSourceDate ? `Open: confirmed ${esc(p.statusSourceDate)}. ` : ""}${p.coordinates ? "Pinned from a cited source." : "Not pinned yet: its location has not been verified."} Golf access does not come with buying a nearby home.</p>
        ${p.guides && p.guides.length ? `<p class="mini-h">Caleb’s area guides nearby</p><div class="guide-links">${p.guides.map((g) => { const a = places.find((x) => x.id === g); return a ? `<button type="button" class="chip" data-pick="${esc(g)}">${esc(a.name)}</button>` : ""; }).join("")}</div>` : ""}`;
      actions = [
        [`Ask Caleb about homes near here`, ask(`Hi Caleb, I'm interested in homes near ${p.name}. What's available nearby?`), "primary"],
        [`Check flood zone at this address ↗`, femaLink(p.address), "ext"],
        [`Course details from the operator ↗`, p.source, "ext"],
      ];
    } else if (p.kind === "homes") {
      kicker = `Featured home · ${esc(p.status)}`;
      facts = `<p class="addr">${esc(addr)}</p><div class="kv"><span><b>${money(p.price)}</b>Listed price</span><span><b>${p.beds}</b>Bedrooms</span><span><b>${p.area.toLocaleString()}</b>Sq ft</span></div>`;
      body = `${p.community ? `<p><b>${esc(p.subdivision || p.community)}${p.golfView ? ", with a course view" : ""}.</b> <span class="st st-own">Caleb’s listing</span>${p.community === "Copper Mill" ? ` <a href="golf.html">See the golf community →</a>` : ""}</p>` : ""}<p class="fine">Manual listing snapshot, October 8, 2026${p.mls ? `, MLS ${esc(p.mls)}` : ""}. Confirm price and availability.${p.coordinates ? "" : " Not pinned yet: its map location has not been verified."}</p>`;
      actions = [
        [`See what it would cost each month`, `compare.html?add=${esc(p.id)}`, "primary"],
        [`Explore the property`, p.id === "basil" ? "campaign.html" : "campaign.html#turnberry", ""],
        [`Ask Caleb about this home`, ask(`Hi Caleb, I'd like to know more about ${p.name} (${addr}).`), ""],
        [`Check flood zone at this address ↗`, femaLink(addr), "ext"],
      ];
    } else {
      kicker = `Caleb’s area guide · list only`;
      body = `<p>${esc(p.description)}</p><p class="fine">Flood risk changes street to street. Check each address you consider on FEMA’s map.</p>`;
      actions = [
        [`Open the ${esc(p.name)} guide and its listings ↗`, p.source, "primary ext"],
        [`Ask Caleb about ${esc(p.name)}`, ask(`Hi Caleb, I'm curious about living in ${p.name}. What should I know?`), ""],
      ];
    }
    return `${img ? `<img class="sheet-img" src="${img}" alt="${esc(p.imageAlt || p.name)}">` : ""}
      ${img && p.imageCredit ? `<p class="photo-credit">Photo: <a href="${esc(p.imageSource)}" target="_blank" rel="noopener">${esc(p.imageCredit)}</a></p>` : ""}
      <p class="kicker">${kicker}</p><h2 id="place-title">${esc(p.name)}</h2>${facts}${body}
      ${p.coordinates ? `<p class="mini-h">Nearby on this map</p>${nearby(p)}` : ""}
      <div class="sheet-actions">${actions.map(([t, href, cls]) => `<a class="act ${cls}" href="${href}"${cls.includes("ext") ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`).join("")}
      <button type="button" class="act save" data-save="${esc(p.id)}">Save to my brief</button></div>`;
  }
  function select(id, { fly } = {}) {
    const p = places.find((x) => x.id === id);
    if (!p) return;
    state.selected = id;
    $("#detail-content").innerHTML = detail(p);
    sheet.hidden = false;
    sheet.scrollTop = 0;
    document.body.classList.add("sheet-open");
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    if (fly && p.coordinates) {
      const [x, y] = proj(p.coordinates), w = Math.min(vb.w, 260), ratio = svg.clientHeight / svg.clientWidth;
      animateTo({ x: x - w / 2, y: y - (w * ratio) / 2, w });
    }
    // On phones, bring the map into view so the chosen pin shows above the sheet.
    if (matchMedia("(max-width: 900px)").matches) stage.scrollIntoView({ block: "start", behavior: "smooth" });
    renderList(); draw();
    sheet.querySelector("h2").setAttribute("tabindex", "-1");
    sheet.querySelector("h2").focus({ preventScroll: true });
  }
  function closeSheet() {
    sheet.hidden = true; state.selected = null; document.body.classList.remove("sheet-open");
    history.replaceState(null, "", location.pathname + location.search);
    renderList(); draw();
  }
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });
  sheet.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) return select(pick.dataset.pick, { fly: true });
    const save = e.target.closest("[data-save]");
    if (save && window.Brief) {
      const p = places.find((x) => x.id === save.dataset.save);
      window.Brief.add({
        id: "place-" + p.id, type: "Place", title: p.name,
        lines: [p.kind === "golf" ? `Golf course, ${p.access}${p.holes ? ", " + p.holes + " holes" : ""}, ${areaLabel(p)}` : p.kind === "homes" ? `${money(p.price)}, ${p.beds} bedrooms, ${p.area.toLocaleString()} sq ft, ${p.city}` : `Area guide: ${p.source}`,
          p.address ? `Address: ${p.address}${p.city ? ", " + p.city : ""}` : ""].filter(Boolean),
      });
      save.textContent = "Saved to my brief ✓";
    }
  });

  // ---------- Data ----------
  async function load() {
    $("#data-fallback").hidden = true;
    const get = async (url) => {
      try { const r = await fetch(url); if (!r.ok) throw Error(); return await r.json(); }
      catch (e) { if (window.MAP_DATA && window.MAP_DATA[url]) return window.MAP_DATA[url]; throw e; }
    };
    try {
      const [catalog, homes] = await Promise.all([get("data/map-places.json"), get("data/properties.json")]);
      places = [...catalog.courses, ...catalog.communities, ...homes.map((p) => ({ ...p, kind: "homes" }))];
      renderControls(); renderList();
      setView({ x: 0, y: 0, w: 900 }); fitBox(AREAS[0].box);
      const id = location.hash.slice(1);
      if (id && places.some((p) => p.id === id)) select(id, { fly: true });
    } catch {
      status.textContent = "Place data is unavailable right now.";
      $("#data-fallback").hidden = false;
    }
  }
  $("#retry-data").addEventListener("click", load);
  load();
})();
