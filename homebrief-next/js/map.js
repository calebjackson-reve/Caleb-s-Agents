/* The map is the resume. Dots positioned by city from the MLS export; tap a dot for the deal. */
(function () {
  "use strict";
  const el = document.querySelector("[data-deal-map]");
  if (!el) return;
  const dataEl = document.getElementById("deals-data");
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
  const CITY = {
    "Zachary": [30.6485, -91.1565], "Baton Rouge": [30.4515, -91.1871], "St Francisville": [30.7799, -91.3757], "Denham Springs": [30.4874, -90.9573],
    "Greenwell Springs": [30.5566, -90.9929], "New Roads": [30.7016, -91.4362], "Port Allen": [30.4519, -91.2104], "Prairieville": [30.3030, -90.9718],
    "Slaughter": [30.7169, -91.1418], "Gonzales": [30.2386, -90.9201], "Jackson": [30.8374, -91.2129], "Addis": [30.3535, -91.2654], "St Gabriel": [30.2563, -91.0996],
    "Lafayette": [30.2241, -92.0198], "Livingston": [30.5019, -90.7479], "Brusly": [30.3941, -91.2554], "Clinton": [30.8663, -91.0157], "Fordoche": [30.5952, -91.6168],
    "Central": [30.5543, -91.0368], "Baker": [30.5882, -91.1682], "Ponchatoula": [30.4388, -90.4412], "Walker": [30.4877, -90.8615]
  };
  const W = 1000, H = 640;
  const lng0 = -91.75, lng1 = -90.40, lat0 = 30.18, lat1 = 30.92; // Lafayette sits off the west edge and is pinned at the margin, labeled.
  const px = lng => ((Math.max(lng0, Math.min(lng1, lng)) - lng0) / (lng1 - lng0)) * (W - 80) + 40;
  const py = lat => (1 - (lat - lat0) / (lat1 - lat0)) * (H - 80) + 40;
  const seeded = i => { const x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const deals = data.deals.map((d, i) => { const c = CITY[d.city] || CITY["Baton Rouge"]; const a = seeded(i) * Math.PI * 2, r = 6 + seeded(i + 100) * 22; return { ...d, i, x: px(c[1]) + Math.cos(a) * r, y: py(c[0]) + Math.sin(a) * r * 0.8 }; });
  const counts = {}; deals.forEach(d => counts[d.city] = (counts[d.city] || 0) + 1);
  const money = n => "$" + Math.round(n).toLocaleString("en-US");
  // A stylized Mississippi: north of St Francisville, past Port Allen and Baton Rouge, bending southeast.
  const river = [[30.95, -91.52], [30.86, -91.42], [30.78, -91.37], [30.70, -91.33], [30.62, -91.26], [30.52, -91.21], [30.44, -91.19], [30.38, -91.21], [30.30, -91.15], [30.22, -91.03], [30.15, -90.95]].map(([la, lo]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join(" ");
  const OFFSET = { "Port Allen": [-96, 30], "Baton Rouge": [22, 36], "Addis": [-60, 32], "Brusly": [-70, 10], "St Gabriel": [16, 30], "Central": [14, -16], "Baker": [-66, -14], "Zachary": [18, -16], "Slaughter": [14, -16] };
  const labels = Object.entries(counts).filter(([c, n]) => n >= 2 || c === "Lafayette").map(([c]) => { const k = CITY[c]; const [dx, dy] = OFFSET[c] || [14, -14]; return `<text class="map-label" x="${(px(k[1]) + dx).toFixed(1)}" y="${(py(k[0]) + dy).toFixed(1)}">${c}${c === "Lafayette" ? " (west)" : ""}</text>`; }).join("");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of ${deals.length} closed sales across the Baton Rouge area, by city">
    <polyline class="map-river" points="${river}"/>
    ${labels}
    <g data-dots>${deals.map(d => `<circle class="map-dot ${d.city === "Zachary" ? "zachary" : ""}" r="${d.price >= 1000000 ? 11 : d.price >= 400000 ? 8 : 6}" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" style="--i:${d.i}" tabindex="0" role="button" data-i="${d.i}" aria-label="${d.street}, ${d.city}, ${d.year}"><title>${d.street}, ${d.city} · ${d.year}</title></circle>`).join("")}</g>
  </svg><div class="map-card" hidden data-card></div>`;
  const svg = el.querySelector("svg"), card = el.querySelector("[data-card]"), riverEl = el.querySelector(".map-river");
  if (riverEl.getTotalLength) riverEl.style.setProperty("--len", riverEl.getTotalLength().toFixed(0));
  function show(d) {
    card.hidden = false;
    card.innerHTML = `<b>${d.street}</b>${d.neighborhood ? d.neighborhood + " · " : ""}${d.city}<br><span class="small">${d.year} · ${d.side === "both" ? "represented both sides" : d.side === "listing" ? "the listing side" : "the buyer side"} · ${money(d.price)}</span>`;
  }
  svg.addEventListener("click", e => { const dot = e.target.closest(".map-dot"); if (!dot) { card.hidden = true; return; } show(deals[+dot.dataset.i]); });
  svg.addEventListener("keydown", e => { const dot = e.target.closest(".map-dot"); if (dot && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(deals[+dot.dataset.i]); } });
  const reveal = () => { riverEl.classList.add("in"); el.querySelectorAll(".map-dot").forEach(d => d.classList.add("in")); };
  if (motionOK.matches && "IntersectionObserver" in window) { const io = new IntersectionObserver(en => { if (en[0].isIntersecting) { reveal(); io.disconnect(); } }, { threshold: 0.25 }); io.observe(el); } else reveal();
  const cityList = document.querySelector("[data-city-counts]");
  if (cityList) cityList.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `<span>${c} <b>${n}</b></span>`).join("");
})();
