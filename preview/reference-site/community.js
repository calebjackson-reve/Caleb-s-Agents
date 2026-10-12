// Golf community profile (community.html?c=id) and comparison (communities.html?c=id,id).
// Renders synchronously from the bundled data so the headline wind can pick up the page title.
// Every fact keeps its status label; membership prices marked as conflicting are never compared.
(() => {
  "use strict";
  const G = window.GOLF_DATA, HOMES = (window.MAP_DATA && window.MAP_DATA["data/properties.json"]) || [];
  const root = document.getElementById("cp-root");
  if (!G || !root) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const LABEL = G.statusLabels || {};
  const tag = (st) => `<span class="st st-${st}">${esc(LABEL[st] || st)}</span>`;
  const src = (u) => (u ? ` <a class="src-l" href="${esc(u)}" target="_blank" rel="noopener">Source ↗</a>` : "");
  const fact = (p) => `<li><span>${esc(p.text)}</span> ${tag(p.status)}${src(p.source)}${p.detail ? `<details class="why"><summary>What conflicts</summary><p>${esc(p.detail)}</p></details>` : ""}</li>`;
  const miles = (a, b) => {
    const R = 3958.8, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const proj = ([lon, lat]) => [(lon + 94.1) * 155 + 100, (33.1 - lat) * 178 + 70];
  const DOWNTOWN = [-91.187, 30.451];
  const PLACES = [["Downtown Baton Rouge", -91.187, 30.451], ["Zachary", -91.156, 30.649], ["Gonzales", -90.92, 30.238]];
  const byId = (id) => G.communities.find((c) => c.id === id);
  const homeOf = (f) => ({ ...(HOMES.find((h) => h.id === f.id) || {}), ...f });
  const ids = (new URLSearchParams(location.search).get("c") || "").split(",").filter(byId);
  const SMS = (t) => "sms:+12257470303?&body=" + encodeURIComponent(t);
  const accessWord = (c) => ({ withHome: "HOA golf membership", public: "Public course", club: "Club membership" })[c.accessKind] || "Ask the club";

  // ---------- Small map, drawn from the same outline as the explore map ----------
  function miniMap(cs, extra = []) {
    const pts = cs.map((c) => proj(c.course.coordinates)).concat(extra.map((p) => proj([p[1], p[2]])));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let w = Math.max(...xs) - Math.min(...xs) + 90, h = Math.max(...ys) - Math.min(...ys) + 70;
    if (h / w > 0.72) w = h / 0.72; h = w * 0.72;
    const x0 = (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y0 = (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, k = w / 600;
    const dt = proj(DOWNTOWN);
    const lines = cs.map((c) => { const [x, y] = proj(c.course.coordinates), d = miles(c.course.coordinates, DOWNTOWN);
      return `<line x1="${x}" y1="${y}" x2="${dt[0]}" y2="${dt[1]}" class="mm-line"/><text x="${(x + dt[0]) / 2 + 6 * k}" y="${(y + dt[1]) / 2}" font-size="${12 * k}" class="mm-d">${d.toFixed(0)} mi</text>`; }).join("");
    const places = PLACES.map(([n, lon, lat]) => { const [x, y] = proj([lon, lat]); return `<g class="city"><circle cx="${x}" cy="${y}" r="${2.5 * k}"/><text x="${x - 6 * k}" y="${y + 4 * k}" font-size="${11.5 * k}" text-anchor="end">${n}</text></g>`; }).join("");
    const pins = cs.map((c) => { const [x, y] = proj(c.course.coordinates); return `<circle cx="${x}" cy="${y}" r="${16 * k}" class="pin-halo"/><circle cx="${x}" cy="${y}" r="${8 * k}" class="pin-golf"/><text x="${x + 14 * k}" y="${y + 5 * k}" font-size="${15 * k}" class="pin-label">${esc(c.name)}</text>`; }).join("");
    return `<svg class="mini-map" viewBox="${x0} ${y0} ${w} ${h}" role="img" aria-label="Map showing ${cs.map((c) => c.name).join(" and ")} relative to downtown Baton Rouge"><rect x="${x0 - 50}" y="${y0 - 50}" width="${w + 100}" height="${h + 100}" class="map-water"/><path d="${window.LA_OUTLINE || ""}" class="map-land"/>${lines}${places}${pins}</svg>`;
  }
  // A photo, or an honest map tile when no licensed photography exists yet.
  function visual(c, cls) {
    const p = (c.photos || [])[0];
    return p ? `<figure class="${cls}"><img src="${esc(p.src)}" alt="${esc(p.alt)}"><figcaption>${esc(p.caption)}</figcaption></figure>`
      : `<figure class="${cls} no-photo">${miniMap([c])}<figcaption>${esc(c.photoCredit || "No licensed photography yet.")}</figcaption></figure>`;
  }

  // ---------- Answers to the three questions a golf buyer actually asks ----------
  function answers(c) {
    const view = (c.featuredHomes || []).find((f) => f.relationship === "view");
    const golf = c.accessKind === "withHome"
      ? { a: "Through the HOA", t: "The club offers residents a dedicated HOA membership. Confirm what your dues include before you count on it.", st: "official" }
      : c.accessKind === "public" ? { a: "No, and you don’t need it", t: "The course is public. Anyone can book a tee time, and living here doesn’t change your access.", st: "official" }
      : { a: "Ask the club", t: "Golf is run by the club, separately from the HOA. Membership terms for residents aren’t published.", st: c.clubAccess.points[0] ? c.clubAccess.points[0].status : "missing" };
    const live = c.golfFrontage.exists
      ? { a: "Yes, on some streets", t: c.golfFrontage.text + (view ? ` Turnberry has a course view, but frontage isn’t confirmed.` : ""), st: c.golfFrontage.status }
      : { a: "Not confirmed yet", t: "Which streets back onto the course hasn’t been confirmed from a source.", st: "missing" };
    const cost = c.hoa.dues ? { a: c.hoa.dues, t: "HOA dues from a listing. Confirm with the HOA.", st: c.hoa.duesStatus }
      : { a: "Ask before you compare", t: c.membershipPrices && c.membershipPrices.status === "conflict" ? "HOA dues aren’t published, and the club’s posted membership prices disagree." : "HOA dues aren’t published in the sources found.", st: c.membershipPrices && c.membershipPrices.status === "conflict" ? "conflict" : "missing" };
    return [["Do I get golf with the house?", golf], ["Can I live on the course?", live], ["What does it cost to belong?", cost]];
  }

  // ---------- Profile ----------
  function profile(c) {
    const photos = c.photos || [], d = miles(c.course.coordinates, DOWNTOWN);
    const homes = (c.featuredHomes || []).map(homeOf).filter((h) => h.name);
    const others = G.communities.filter((o) => o.id !== c.id);
    const resident = c.clubAccess.resident || [], pub = c.clubAccess.public || [];
    document.title = `${c.name} golf community | Caleb Jackson`;
    return `
    <section class="cp-hero${photos.length ? "" : " no-photo"}">
      ${photos.length ? `<img class="cp-hero-img" src="${esc(photos[0].src)}" alt="${esc(photos[0].alt)}">` : `<div class="cp-hero-map">${miniMap([c], PLACES)}</div>`}
      <div class="cp-hero-text">
        <p class="kicker">Golf community · ${esc(c.place)}, ${esc(c.parish)} Parish</p>
        <h1>${esc(c.name)}.</h1>
        <p class="cp-tag">${esc(c.tagline || c.summary)}</p>
        <ul class="cp-strip">
          <li><b>${c.course.holes}</b><span>holes</span></li>
          <li><b>${esc(c.course.access.split(" ")[0])}</b><span>course access</span></li>
          <li><b>${esc(accessWord(c))}</b><span>how residents play</span></li>
          <li><b>${d.toFixed(0)} mi</b><span>to downtown Baton Rouge, straight line</span></li>
        </ul>
      </div>
      ${photos.length ? `<p class="cp-credit">${esc(photos[0].caption)}</p>` : ""}
    </section>

    <section class="cp-answers" aria-labelledby="ans-h">
      <div class="cp-wrap">
        <p class="kicker">The short version</p>
        <h2 id="ans-h">${esc(c.summary)}</h2>
        <div class="ans-grid">${answers(c).map(([q, x]) => `<article class="ans"><p class="ans-q">${q}</p><p class="ans-a">${esc(x.a)}</p><p class="ans-t">${esc(x.t)}</p>${tag(x.st)}</article>`).join("")}</div>
      </div>
    </section>

    <section class="cp-priv" aria-labelledby="priv-h">
      <div class="cp-wrap">
        <p class="kicker">Playing privileges</p>
        <h2 id="priv-h">Owning a home here and holding golf privileges are <em>separate questions.</em></h2>
        <p class="cp-lead">${esc(c.clubAccess.summary)}</p>
        <div class="priv-cols">
          <article><h3>If you live here</h3>${resident.length ? `<ul class="facts-l">${resident.map(fact).join("")}</ul>` : `<p class="muted">${c.accessKind === "public" ? "Residents play the public course on the same terms as everyone else." : "Resident terms aren’t published. Ask the club."}</p>`}</article>
          <article><h3>${c.accessKind === "public" ? "How anyone plays" : "If you don’t"}</h3><ul class="facts-l">${pub.map(fact).join("")}</ul></article>
        </div>
      </div>
    </section>

    ${homes.length ? homes.map((h) => `
    <section class="cp-home" aria-labelledby="home-h">
      <div class="cp-wrap home-grid">
        <div class="home-photos">${photos.slice(1, 3).map((p) => `<figure><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><figcaption>${esc(p.caption)}</figcaption></figure>`).join("")}</div>
        <div class="home-copy">
          <p class="kicker">Inside a ${esc(c.name)} home · ${tag(h.status)}</p>
          <h2 id="home-h">${esc(h.name)}</h2>
          <p class="home-sub">${esc(h.address)} · ${esc(h.subdivision || c.name)}</p>
          <div class="kv"><span><b>${money(h.price)}</b>Listed price</span><span><b>${h.beds}</b>Bedrooms</span><span><b>${h.area.toLocaleString()}</b>Sq ft</span></div>
          ${h.quote ? `<blockquote class="home-q">“${esc(h.quote)}”<cite>From Caleb’s listing</cite></blockquote>` : ""}
          <p class="fine">${esc(h.note)} Price is a manual snapshot from October 8, 2026; confirm availability.</p>
          <div class="home-acts"><a class="act primary" href="compare.html?add=${esc(h.id)}">See what it would cost each month</a><a class="act" href="${SMS(`Hi Caleb, I'd like to see ${h.name} in ${c.name}.`)}">Ask Caleb about ${esc(h.name)}</a></div>
        </div>
      </div>
    </section>`).join("") : ""}

    <section class="cp-where" aria-labelledby="where-h">
      <div class="cp-wrap where-grid">
        <div>
          <p class="kicker">Where it sits</p>
          <h2 id="where-h">${esc(c.place)}, about ${d.toFixed(0)} miles from downtown Baton Rouge.</h2>
          <p class="cp-lead">Straight-line distance, measured from the course. Drive time isn’t measured yet.</p>
          <ul class="dist">${others.map((o) => `<li><span>${esc(o.name)}</span><b>${miles(c.course.coordinates, o.course.coordinates).toFixed(0)} mi</b></li>`).join("")}</ul>
          <div class="course-card"><p class="mini-h">The course</p><p><b>${esc(c.course.name)}</b><br>${esc(c.course.address)}<br>${esc(c.course.detail)}</p>
          <ul class="facts-l small">${c.course.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a> ${tag(s.status)}</li>`).join("")}</ul>
          <p class="fine">Map point: ${esc(c.course.coordinateNote)}</p></div>
        </div>
        <div class="where-map">${miniMap([c], PLACES)}</div>
      </div>
    </section>

    <section class="cp-living" aria-labelledby="live-h">
      <div class="cp-wrap live-grid">
        <div><p class="kicker">Living here</p><h2 id="live-h">What the neighborhood offers.</h2>
          <div class="chips">${c.amenities.map((a) => `<span class="chip static">${esc(a)}</span>`).join("")}</div>
          <p class="fine">Amenities ${tag(c.amenitiesStatus)}</p>
          <ul class="facts-l">${c.hoa.points.map(fact).join("")}${c.schools ? fact({ text: "Schools: " + c.schools.text, status: c.schools.status, source: c.schools.source }) : ""}${c.gated ? fact({ text: "Gated: " + c.gated.value + ". " + c.gated.text, status: c.gated.status, source: c.gated.source }) : ""}</ul>
        </div>
        <div class="verify"><p class="kicker">Before you decide</p><h3>Confirm these first</h3>
          <ol>${c.verifyNext.map((v) => `<li>${esc(v)}</li>`).join("")}</ol>
          <p class="fine">Labels: ${Object.entries(LABEL).map(([k]) => tag(k)).join(" ")}</p></div>
      </div>
    </section>

    <section class="cp-cta">
      <div class="cp-wrap">
        <h2>Want a home in ${esc(c.name)}?</h2>
        <p>Tell Caleb how close to the course you want to be. He’ll come back with what’s actually available.</p>
        <div class="cta-actions">
          <a class="act primary" href="${SMS(`Hi Caleb, help me find a home in ${c.name}. I'm interested in golf access and homes near the course.`)}">Help me find a home in ${esc(c.name)}</a>
          ${others.map((o) => `<a class="act" href="communities.html?c=${c.id},${o.id}">Compare with ${esc(o.name)}</a>`).join("")}
          <button type="button" class="act" data-save-c="${c.id}">Save to my brief</button>
        </div>
        <p class="fine"><a href="golf.html">← Back to the golf community finder</a></p>
      </div>
    </section>`;
  }

  // ---------- Comparison ----------
  const LADDER = [["public", "Public course", "Anyone can play. Living there doesn’t change access."], ["withHome", "Membership for residents", "The club offers residents an HOA membership."], ["club", "Club sets the terms", "Golf is separate from the HOA. Ask the club."]];
  function comparison(cs) {
    document.title = `${cs.map((c) => c.name).join(" or ")}? | Caleb Jackson`;
    const [a, b] = cs;
    const da = miles(a.course.coordinates, DOWNTOWN), db = miles(b.course.coordinates, DOWNTOWN), apart = miles(a.course.coordinates, b.course.coordinates);
    const sameAccess = a.accessKind === b.accessKind;
    const deciding = sameAccess ? `Both handle golf the same way, so the choice comes down to place, homes and what each HOA costs.`
      : `${a.name} and ${b.name} answer the golf question differently. ${cs.map((c) => c.accessKind === "withHome" ? `At ${c.name}, the club offers residents an HOA golf membership` : c.accessKind === "public" ? `${c.name} is a public course, so living there doesn’t change your access` : `At ${c.name}, the club sets its own terms`).join(". ")}.`;
    const distLine = Math.abs(da - db) < 3 ? `They sit about the same straight-line distance from downtown Baton Rouge (${da.toFixed(0)} and ${db.toFixed(0)} miles), ${apart.toFixed(0)} miles apart from each other.`
      : `${da < db ? a.name : b.name} is closer to downtown Baton Rouge in a straight line (${Math.min(da, db).toFixed(0)} versus ${Math.max(da, db).toFixed(0)} miles).`;
    const val = (c, k) => ({
      where: `${esc(c.place)}, ${esc(c.parish)} Parish`,
      course: `${c.course.holes} holes · ${esc(c.course.access)}`,
      design: esc(c.course.detail),
      access: `${esc(accessWord(c))}`,
      frontage: c.golfFrontage.exists ? `Yes, on some streets ${tag(c.golfFrontage.status)}` : tag("missing"),
      view: (c.featuredHomes || []).some((f) => f.relationship === "view") ? `Turnberry ${tag("own")}` : "None of Caleb’s listings yet",
      dues: c.hoa.dues ? `${esc(c.hoa.dues)} ${tag(c.hoa.duesStatus)}` : tag("missing"),
      membership: c.membershipPrices && c.membershipPrices.status === "conflict" ? `${tag("conflict")}<span class="fine"> Left out until the club confirms</span>` : c.accessKind === "public" ? "Not needed to play" : tag("missing"),
      gated: c.gated ? `${esc(c.gated.value)} ${tag(c.gated.status)}` : tag("missing"),
      amenities: `${c.amenities.map(esc).join(" · ")} ${tag(c.amenitiesStatus)}`,
      schools: c.schools ? `${esc(c.schools.text)} ${tag(c.schools.status)}` : tag("missing"),
      distance: `${miles(c.course.coordinates, DOWNTOWN).toFixed(0)} mi straight line<span class="fine"> · drive time not measured</span>`,
    })[k];
    const plain = (c, k) => val(c, k).replace(/<[^>]+>/g, "").trim();
    const GROUPS = [
      ["Golf", [["Course", "course", 1], ["Design", "design"], ["How residents play", "access", 1], ["Non-resident membership", "membership", 1]]],
      ["Living on the course", [["Homes with golf frontage", "frontage", 1], ["Caleb’s homes with a course view", "view", 1]]],
      ["Costs", [["HOA dues", "dues", 1]]],
      ["The neighborhood", [["Where", "where"], ["Gated", "gated", 1], ["Amenities", "amenities"], ["Schools", "schools", 1], ["To downtown Baton Rouge", "distance", 1]]],
    ];
    const fits = (c) => {
      const l = [];
      if (c.accessKind === "withHome") l.push("You want golf tied to your home through an HOA membership.");
      if (c.accessKind === "public") l.push("You’d rather play a public course and skip a club membership.");
      if (c.accessKind === "club") l.push("You’re happy to join a club on its own terms.");
      if (c.featuredHomes && c.featuredHomes.length) l.push(`You’d like to see a real example now: ${c.featuredHomes.map((f) => homeOf(f).name).join(", ")} is listed by Caleb.`);
      if (c.schools) l.push(`${c.schools.text} matters to you (confirm zoning for the address).`);
      if (c.gated && c.gated.value === "Yes") l.push("A gated entrance matters to you.");
      l.push(`${c.place} is the part of town you want to live in.`);
      return l;
    };
    return `
    <section class="cc-head">
      <div class="cp-wrap">
        <p class="kicker">Compare golf communities</p>
        <h1>${cs.map((c) => esc(c.name)).join(" or ")}<em>?</em></h1>
        <div class="cc-tiles">${cs.map((c) => `<a class="cc-tile" href="community.html?c=${c.id}">${visual(c, "cc-vis")}<div><b>${esc(c.name)}</b><span>${esc(c.tagline || c.summary)}</span></div></a>`).join("")}</div>
      </div>
    </section>

    <section class="cc-decide" aria-labelledby="dec-h">
      <div class="cp-wrap">
        <p class="kicker">The deciding difference</p>
        <h2 id="dec-h">${esc(deciding)}</h2>
        <p class="cp-lead">${esc(distLine)} ${cs.some((c) => !c.hoa.dues) ? `HOA dues aren’t confirmed for ${cs.filter((c) => !c.hoa.dues).map((c) => c.name).join(" or ")}, so ask before you compare monthly costs.` : ""}</p>
        <div class="ladder" role="img" aria-label="How golf access works at each community">
          ${LADDER.map(([k, t, d]) => { const here = cs.filter((c) => c.accessKind === k); return `<div class="rung${here.length ? " on" : ""}"><p class="rung-t">${t}</p><p class="rung-d">${d}</p><div class="rung-who">${here.map((c) => `<span>${esc(c.name)}</span>`).join("")}</div></div>`; }).join("")}
        </div>
      </div>
    </section>

    <section class="cc-ledger" aria-labelledby="led-h">
      <div class="cp-wrap">
        <div class="led-top"><h2 id="led-h">Side by side</h2><p class="fine"><span class="diff-key">Differs</span> marks where they genuinely differ. Unconfirmed facts stay visible.</p></div>
        ${GROUPS.map(([g, rows]) => `<div class="led-group"><h3>${g}</h3>
          <div class="led-row led-names"><span></span>${cs.map((c) => `<b>${esc(c.name)}</b>`).join("")}</div>
          ${rows.map(([label, k, comparable]) => { const vs = cs.map((c) => plain(c, k)), unknown = vs.some((v) => /Not found yet|Unconfirmed|Sources conflict/.test(v)), differs = comparable && !unknown && new Set(vs).size > 1;
            return `<div class="led-row${differs ? " differs" : ""}"><span class="led-l">${label}${differs ? `<i class="diff-key">Differs</i>` : ""}</span>${cs.map((c) => `<div><em class="led-n">${esc(c.name)}</em>${val(c, k)}</div>`).join("")}</div>`; }).join("")}
        </div>`).join("")}
      </div>
    </section>

    <section class="cc-place" aria-labelledby="place-h">
      <div class="cp-wrap where-grid">
        <div><p class="kicker">Where they sit</p><h2 id="place-h">${apart.toFixed(0)} miles apart.</h2><p class="cp-lead">${esc(distLine)} Straight-line distances only; drive times aren’t measured yet.</p></div>
        <div class="where-map">${miniMap(cs, PLACES)}</div>
      </div>
    </section>

    <section class="cc-fit" aria-labelledby="fit-h">
      <div class="cp-wrap">
        <p class="kicker">Which fits you</p><h2 id="fit-h">Which one sounds like you?</h2>
        <div class="fit-grid">${cs.map((c) => `<article><h3>${esc(c.name)} suits you if</h3><ul>${fits(c).map((l) => `<li>${esc(l)}</li>`).join("")}</ul><a class="act" href="community.html?c=${c.id}">Open the ${esc(c.name)} profile</a></article>`).join("")}</div>
      </div>
    </section>

    <section class="cp-cta">
      <div class="cp-wrap">
        <h2>Still weighing them?</h2>
        <p>Send Caleb this comparison and what matters most to you. He’ll answer the open questions and show you what’s available.</p>
        <div class="cta-actions">
          <a class="act primary" href="${SMS(`Hi Caleb, I'm comparing ${cs.map((c) => c.name).join(" and ")}. Help me find a home near these courses.`)}">Help me find a home near these courses</a>
          <button type="button" class="act" data-save-cmp="${cs.map((c) => c.id).join(",")}">Save this comparison to my brief</button>
        </div>
        <p class="fine"><a href="golf.html">← Back to the golf community finder</a></p>
      </div>
    </section>`;
  }

  // ---------- Render ----------
  const loading = document.querySelector(".cp-loading");
  if (document.body.classList.contains("community-page")) {
    const c = byId(ids[0]) || byId("copper-mill");
    root.innerHTML = profile(c);
  } else {
    const cs = (ids.length >= 2 ? ids : ["copper-mill", "santa-maria"]).slice(0, 3).map(byId);
    root.innerHTML = comparison(cs);
  }
  if (loading) loading.remove();

  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-save-c], [data-save-cmp]");
    if (!s || !window.Brief) return;
    if (s.dataset.saveC) {
      const c = byId(s.dataset.saveC);
      window.Brief.add({ id: "gc-" + c.id, type: "Golf community", title: c.name, lines: [`${c.place}, ${c.course.holes} holes, ${c.course.access.toLowerCase()}`, `Golf: ${accessWord(c)}`] });
    } else {
      const cs = s.dataset.saveCmp.split(",").map(byId);
      window.Brief.add({ id: "gc-shortlist", type: "Golf shortlist", title: cs.map((c) => c.name).join(" vs "), lines: cs.map((c) => `${c.name}: ${accessWord(c)}, ${c.course.holes} holes`) });
    }
    s.textContent = "Saved to my brief ✓";
  });
})();
