/* Flood answer in five seconds. Census geocoder (JSONP) then FEMA's National Flood Hazard Layer.
   Screening only, never a determination. Falls back honestly when the services do not answer. */
(function () {
  "use strict";
  const CENSUS = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
  const NFHL = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";
  const PANELS = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/3/query";
  const VIEWER = "https://msc.fema.gov/portal/search?AddressQuery=";
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
  const $ = (s, r = document) => r.querySelector(s);

  function jsonp(url, timeout = 9000) {
    return new Promise((resolve, reject) => {
      const cb = "hbcb" + Math.random().toString(36).slice(2);
      const s = document.createElement("script");
      const t = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, timeout);
      function cleanup() { clearTimeout(t); delete window[cb]; s.remove(); }
      window[cb] = data => { cleanup(); resolve(data); };
      s.onerror = () => { cleanup(); reject(new Error("blocked")); };
      s.src = url + "&format=jsonp&callback=" + cb; document.head.appendChild(s);
    });
  }
  async function getJSON(url, timeout = 9000) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); }
  }
  async function lookup(address) {
    let geo;
    try { geo = await jsonp(`${CENSUS}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current`); } catch (e) { return { state: "unavailable", detail: "The Census address service did not answer from this network." }; }
    const m = ((geo.result || {}).addressMatches || [])[0];
    if (!m) return { state: "no_match", detail: "That address did not match. Add the city and ZIP and try again." };
    const x = m.coordinates.x, y = m.coordinates.y;
    const point = `geometry=${x},${y}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;
    let zones;
    try { zones = await getJSON(`${NFHL}?${point}&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE`); } catch (e) { return { state: "unavailable", detail: "FEMA's map service did not answer from this network.", matched: m.matchedAddress }; }
    let panel = {};
    try { const p = await getJSON(`${PANELS}?${point}&outFields=FIRM_PAN,EFF_DATE`); panel = ((p.features || [])[0] || {}).attributes || {}; } catch (e) { /* optional */ }
    const feats = (zones.features || []).map(f => f.attributes);
    return { state: "ok", matched: m.matchedAddress, x, y, zones: feats.slice(0, 3), panel };
  }
  function explain(z) {
    const zone = String(z.FLD_ZONE || "").toUpperCase(), sub = String(z.ZONE_SUBTY || "").toUpperCase(), sfha = String(z.SFHA_TF || "").toUpperCase() === "T";
    if (sfha) return { level: zone.startsWith("V") ? 0.72 : 0.56, risk: true, zone, plain: `Zone ${zone} is a Special Flood Hazard Area. A federally backed mortgage will require flood insurance, and the premium depends on the home's elevation, so ask for the elevation certificate before you write an offer.` };
    if (zone === "X" && /0\.2|SHADED|LEVEE/.test(sub)) return { level: 0.34, risk: false, zone: "X (shaded)", plain: "Shaded Zone X is the moderate band outside the high-risk area. Lenders do not require flood insurance here, but in 2016 about half the East Baton Rouge homes that flooded were outside the high-risk zone. A policy here is usually inexpensive. Get the quote." };
    if (zone === "X" || zone === "C" || zone === "B") return { level: 0.2, risk: false, zone: "X", plain: "Zone X is outside the high-risk area. No lender will require flood insurance. Many Louisiana owners carry it anyway because the maps are old and the 2016 water did not read them. Ask what a policy costs; it is often a few hundred dollars a year." };
    if (zone === "D") return { level: 0.4, risk: false, zone: "D", plain: "Zone D means the flood risk has not been studied here. That is a reason to ask more questions, not fewer." };
    return { level: 0.4, risk: false, zone: zone || "unmapped", plain: "FEMA has no mapped zone at this point, which usually means the area is unmapped. Ask the seller about past water and get a quote anyway." };
  }
  function render(root, result, water) {
    const out = $("[data-flood-out]", root), zoneEl = $("[data-flood-zone]", root), label = $("[data-flood-label]", root), src = $("[data-flood-sources]", root);
    out.hidden = false;
    if (result.state !== "ok") {
      zoneEl.textContent = "?"; zoneEl.classList.remove("risk");
      label.textContent = result.state === "no_match" ? "No match" : "Service unavailable";
      $("[data-flood-plain]", root).textContent = result.detail + (result.state === "unavailable" ? " Use FEMA's official address search below; it opens in a new tab and takes about ten seconds." : "");
      src.innerHTML = `<a href="${VIEWER}${encodeURIComponent(result.matched || $("[name=address]", root).value)}" target="_blank" rel="noopener">Open this address on FEMA's map</a>`;
      water?.setLevel(0.3);
      return;
    }
    const z = result.zones[0] || {}; const e = explain(z);
    zoneEl.textContent = e.zone; zoneEl.classList.toggle("risk", e.risk);
    label.textContent = e.risk ? "High-risk zone" : "Outside the high-risk zone";
    let bfe = parseFloat(z.STATIC_BFE); const extra = Number.isFinite(bfe) && bfe > -9000 ? ` Base flood elevation is ${bfe} feet.` : "";
    const boundary = new Set(result.zones.map(q => q.FLD_ZONE)).size > 1 ? ` This point sits on a zone boundary (${[...new Set(result.zones.map(q => q.FLD_ZONE))].join(", ")}), so the parcel may straddle two zones.` : "";
    $("[data-flood-plain]", root).textContent = e.plain + extra + boundary;
    const eff = result.panel.EFF_DATE ? new Date(result.panel.EFF_DATE).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null;
    src.innerHTML = `<span>Source: FEMA National Flood Hazard Layer, point lookup at the Census-matched location of ${result.matched}.${result.panel.FIRM_PAN ? ` FIRM panel ${result.panel.FIRM_PAN}${eff ? ", effective " + eff : ""}.` : ""} Screening only, not a flood determination or an elevation certificate.</span><a href="${VIEWER}${encodeURIComponent(result.matched)}" target="_blank" rel="noopener">Open the official FEMA map for this address</a>`;
    water?.setLevel(e.level);
    const sms = $("[data-sms-result]", root); if (sms) sms.href = `sms:+12257470303?&body=${encodeURIComponent(`Hey Caleb, the flood tool on calebjackson.org shows ${result.matched} in Zone ${e.zone}. Can you help me think through insurance and what to ask the seller?`)}`;
  }
  document.querySelectorAll("[data-flood]").forEach(root => {
    const form = $("form", root), input = $("[name=address]", root), status = $("[data-flood-status]", root);
    const canvas = $("canvas", root);
    const water = canvas && window.mountWater ? window.mountWater(canvas, { level: 0.2, force: true, renderScale: 0.7, rippleTarget: root, light: "#3C7F8E", deep: "#102F38", alpha: 0.92 }) : null;
    if (water && !motionOK.matches) setTimeout(() => water.pause && water.pause(), 2500);
    root.querySelectorAll("[data-example]").forEach(b => b.addEventListener("click", () => { input.value = b.dataset.example; form.requestSubmit(); }));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const address = input.value.trim(); if (!address) { input.focus(); return; }
      status.textContent = "Checking the map…"; form.querySelector("button[type=submit]").disabled = true;
      const result = await lookup(/louisiana|, la\b/i.test(address) ? address : address + ", LA");
      status.textContent = ""; form.querySelector("button[type=submit]").disabled = false;
      render(root, result, water);
      root.dispatchEvent(new CustomEvent("hb:flood", { detail: result }));
    });
    // Scroll-linked demo: before any lookup, the water line gently shows the three bands as the stage enters view.
    if (water && motionOK.matches && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(en => { if (en[0].isIntersecting) { let i = 0; const seq = [0.2, 0.34, 0.56, 0.2]; const t = setInterval(() => { if ($("[data-flood-out]", root).hidden === false) { clearInterval(t); return; } water.setLevel(seq[i++ % seq.length]); if (i > 6) clearInterval(t); }, 1800); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(root);
    }
  });
  window.HBFlood = { lookup, explain };
})();
