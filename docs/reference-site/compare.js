(() => {
  "use strict";
  const M = window.CompareMath;
  const $ = (s, r = document) => r.querySelector(s);
  const STORE = "cj-compare-v1",
    MAX_HOMES = 4;
  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const LOAN_FIELDS = [
    ["downPct", "Down payment (% of price)", "20", "Illustrative. Your lender confirms what applies."],
    ["rate", "Interest rate (%)", "6.5", "Illustrative. Replace with a lender quote."],
    ["years", "Loan term (years)", "30", "Fixed rate, whole years."],
    ["miPct", "Mortgage insurance (% per year)", "0.5", "Used only under 20% down. Illustrative."],
    ["upkeepPct", "Upkeep reserve (% of price per year)", "1", "Your own planning allowance."],
  ];
  const BASIS = [
    ["", "Where is this from?"],
    ["estimate", "My estimate"],
    ["listing", "Listing information"],
    ["quote", "Written quote"],
    ["bill", "Actual bill or statement"],
    ["documents", "Loan or association documents"],
  ];
  const COST_FIELDS = [
    ["tax", "Property tax per year ($)"],
    ["insurance", "Homeowners insurance per year ($)"],
    ["flood", "Flood insurance per year ($)"],
    ["hoa", "HOA dues per month ($)"],
    ["closing", "Closing costs ($)"],
  ];
  const VERIFY = {
    tax: "Ask the parish assessor what the tax would be after the sale with your homestead filed. The seller’s bill may not carry over.",
    insurance: "Get a written homeowners quote for this address. Ask whether a FORTIFIED roof or other features change it.",
    flood: "Look up the flood zone on FEMA’s map and get a flood quote for this address, even outside a high-risk zone.",
    hoa: "Request the association’s dues, rules and any pending special assessments in writing.",
    closing: "Ask your lender for a Loan Estimate for this price. It lists closing costs and cash to close.",
  };
  const LINE_LABEL = Object.fromEntries(M.COST_LINES);

  let uid = 0;
  const blankHome = (n) => ({
    id: ++uid,
    label: `Home ${n}`,
    price: "",
    tax: "",
    insurance: "",
    flood: "",
    floodZone: "",
    hoa: "",
    closing: "",
    credits: "",
    note: "",
    fortified: false,
    ec: false,
    basis: {},
  });
  const defaults = () => ({
    mode: "buyer",
    loan: Object.fromEntries(LOAN_FIELDS.map((f) => [f[0], f[2]])),
    loanEdited: [],
    homes: [blankHome(1), blankHome(2)],
    agent: { agentName: "", brokerage: "", brokeragePhone: "", client: "" },
  });

  // ---------- state: share link > saved on this device > defaults ----------
  let state = defaults(),
    openedFromLink = false;
  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(text) {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  }
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== "object") return d;
    const str = (v) => (typeof v === "string" ? v.slice(0, 200) : typeof v === "number" ? String(v) : "");
    const homes = (Array.isArray(raw.homes) ? raw.homes : []).slice(0, MAX_HOMES).map((h, i) => {
      const home = blankHome(i + 1);
      for (const k of Object.keys(home))
        if (!["id", "basis", "fortified", "ec"].includes(k) && h && k in h) home[k] = str(h[k]);
      home.fortified = h?.fortified === true;
      home.ec = h?.ec === true;
      for (const [k] of COST_FIELDS)
        if (h?.basis && BASIS.some(([v]) => v === h.basis[k])) home.basis[k] = h.basis[k];
      return home;
    });
    return {
      mode: raw.mode === "agent" ? "agent" : "buyer",
      loan: Object.fromEntries(LOAN_FIELDS.map(([k, , dv]) => [k, raw.loan && k in raw.loan ? str(raw.loan[k]) : dv])),
      loanEdited: Array.isArray(raw.loanEdited) ? raw.loanEdited.filter((k) => typeof k === "string") : [],
      homes: homes.length ? homes : d.homes,
      agent: Object.fromEntries(Object.keys(d.agent).map((k) => [k, str(raw.agent?.[k])])),
    };
  }
  function load() {
    const hash = location.hash.match(/^#s=([\w-]+)$/);
    if (hash) {
      try {
        state = sanitize(decode(hash[1]));
        openedFromLink = true;
        return;
      } catch {
        status("That share link could not be read, so a fresh comparison was started.");
      }
    }
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) state = sanitize(JSON.parse(saved));
    } catch {
      /* storage unavailable: work without it */
    }
    const mode = new URLSearchParams(location.search).get("mode");
    if (mode === "agent" || mode === "buyer") state.mode = mode;
  }
  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(state));
      } catch {
        /* private mode or blocked storage */
      }
    }, 250);
  }
  function status(text) {
    $("#action-status").textContent = text;
  }

  // ---------- rendering ----------
  function field(id, label, value, help, extra = "") {
    return `<div class="c-field" data-wrap="${id}"><label for="${id}">${label}</label><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(value)}" aria-describedby="${id}-help ${id}-err" ${extra}/><p class="field-help" id="${id}-help">${help}</p><p class="field-error" id="${id}-err"></p></div>`;
  }
  function renderLoan() {
    $("#loan-fields").innerHTML = LOAN_FIELDS.map(([k, label, , help]) =>
      field(`loan-${k}`, label, state.loan[k], state.loanEdited.includes(k) ? "Your entry." : help, `data-loan="${k}"`),
    ).join("");
  }
  function basisSelect(home, key) {
    const id = `h${home.id}-${key}-basis`;
    return `<label class="sr-only" for="${id}">Where the ${LINE_LABEL[key] || key} figure came from</label><select id="${id}" class="basis" data-home="${home.id}" data-basis="${key}">${BASIS.map(
      ([v, t]) => `<option value="${v}"${home.basis[key] === v ? " selected" : ""}>${t}</option>`,
    ).join("")}</select>`;
  }
  function renderHomes() {
    const wrap = $("#homes");
    wrap.innerHTML = state.homes
      .map((h, i) => {
        const p = `h${h.id}`;
        return `<article class="home-card" data-card="${h.id}" aria-labelledby="${p}-label-out">
  <div class="home-card-top"><span class="home-index">${String.fromCharCode(65 + i)}</span>
    <h3 class="sr-only" id="${p}-label-out">${esc(h.label || `Home ${i + 1}`)}</h3>
    <label class="home-label"><span class="sr-only">Name for this home</span><input data-home="${h.id}" data-key="label" value="${esc(h.label)}" maxlength="60" /></label>
    ${state.homes.length > 1 ? `<button type="button" class="remove-home" data-remove="${h.id}" aria-label="Remove ${esc(h.label || "this home")}">Remove</button>` : ""}
  </div>
  ${field(`${p}-price`, "Price to test ($)", h.price, "List price or the price you would offer.", `data-home="${h.id}" data-key="price"`)}
  ${COST_FIELDS.map(([k, label]) => {
    let extra = "";
    if (k === "tax")
      extra = `<details class="tax-helper"><summary>Estimate from parish millage</summary><div><label for="${p}-mill">Total millage for this address</label><input id="${p}-mill" inputmode="decimal" data-mill="${h.id}" placeholder="From the parish assessor" /><label class="check"><input type="checkbox" data-homestead="${h.id}" checked /> I will file for homestead</label><button type="button" class="plain-button" data-apply-tax="${h.id}">Use this estimate</button><p class="fine" id="${p}-mill-msg" role="status"></p></div></details>`;
    if (k === "insurance")
      extra = `<label class="check small-check"><input type="checkbox" data-flag="fortified" data-home="${h.id}"${h.fortified ? " checked" : ""} /> Has a FORTIFIED roof certificate</label>`;
    if (k === "flood")
      extra = `<label class="check small-check"><input type="checkbox" data-flag="ec" data-home="${h.id}"${h.ec ? " checked" : ""} /> Elevation certificate available</label><div class="c-field small"><label for="${p}-zone">Flood zone (optional)</label><input id="${p}-zone" data-home="${h.id}" data-key="floodZone" value="${esc(h.floodZone)}" maxlength="12" placeholder="e.g. X or AE" /><p class="field-help"><a href="https://msc.fema.gov/portal/search" target="_blank" rel="noopener">Look it up on FEMA’s map ↗</a></p></div>`;
    return `<div class="cost-row">${field(`${p}-${k}`, label, h[k], "", `data-home="${h.id}" data-key="${k}"`)}${basisSelect(h, k)}${extra}</div>`;
  }).join("")}
  ${field(`${p}-credits`, "Seller or lender credits ($)", h.credits, "Only credits that are agreed in writing.", `data-home="${h.id}" data-key="credits"`)}
  <div class="c-field"><label for="${p}-note"><span class="for-buyer">My note</span><span class="for-agent">Note for your client</span></label><textarea id="${p}-note" rows="2" maxlength="200" data-home="${h.id}" data-key="note">${esc(h.note)}</textarea></div>
</article>`;
      })
      .join("");
    $("#add-home").disabled = state.homes.length >= MAX_HOMES;
    $("#add-home").textContent = state.homes.length >= MAX_HOMES ? "Four homes is the limit" : "+ Add a home";
  }
  function renderAgent() {
    document.querySelectorAll("[data-agent]").forEach((el) => (el.value = state.agent[el.dataset.agent] || ""));
  }
  function renderMode() {
    document.body.dataset.mode = state.mode;
    document.querySelectorAll("[data-path]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.path === state.mode));
    $("#agent-panel").hidden = state.mode !== "agent";
    $("#path-note").textContent =
      state.mode === "agent"
        ? "Agent view: same math, plus a prepared-by block, client notes and a print-ready sheet. Nothing is sent to Caleb or anyone else."
        : "Compare the homes on your shortlist. Save a PDF, keep a link, or send it to someone you trust.";
    $("#text-caleb").hidden = state.mode === "agent";
  }

  // ---------- validation + results ----------
  function setError(id, msg) {
    const input = document.getElementById(id),
      err = document.getElementById(`${id}-err`);
    if (!input || !err) return;
    err.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
  function compute() {
    const loan = M.checkLoan(state.loan);
    LOAN_FIELDS.forEach(([k]) => setError(`loan-${k}`, loan.errors[k]));
    const loanOk = !Object.keys(loan.errors).length;
    const results = state.homes.map((h) => {
      if (!loanOk) return { blocked: true };
      const touched = h.price !== "" || COST_FIELDS.some(([k]) => h[k] !== "");
      const r = M.homeCost(h, loan.v);
      ["price", ...COST_FIELDS.map((f) => f[0]), "credits"].forEach((k) =>
        setError(`h${h.id}-${k}`, r.errors && (touched || k !== "price") ? r.errors[k] : ""),
      );
      return touched ? r : { empty: true };
    });
    return { loanOk, results };
  }
  function renderResults() {
    const { loanOk, results } = compute();
    const ok = results.filter((r) => r && !r.errors && !r.empty && !r.blocked);
    const maxMonthly = Math.max(1, ...ok.map((r) => r.monthlyTotal));
    const minMonthly = ok.length > 1 ? Math.min(...ok.map((r) => r.monthlyTotal)) : null;
    const minCash = ok.length > 1 ? Math.min(...ok.map((r) => r.cashToClose)) : null;
    const before = snapshotResults();
    $("#results").innerHTML = state.homes
      .map((h, i) => {
        const r = results[i],
          name = esc(h.label || `Home ${i + 1}`),
          letter = String.fromCharCode(65 + i);
        if (r.blocked)
          return `<article class="result-card muted"><h3><span>${letter}</span>${name}</h3><p>Fix the loan terms above to see results.</p></article>`;
        if (r.empty)
          return `<article class="result-card muted"><h3><span>${letter}</span>${name}</h3><p>Enter a price to start.</p></article>`;
        if (r.errors)
          return `<article class="result-card muted"><h3><span>${letter}</span>${name}</h3><p>Check: ${Object.keys(r.errors)
            .map((k) => (k === "price" ? "price" : LINE_LABEL[k] || k).toLowerCase())
            .join(", ")}.</p></article>`;
        const segs = M.COST_LINES.filter(([k]) => r.monthly[k] > 0.5)
          .map(([k]) => `<span class="seg seg-${k}" data-k="${k}" style="width:${((r.monthly[k] / maxMonthly) * 100).toFixed(2)}%" title="${LINE_LABEL[k]}"></span>`)
          .join("");
        const lines = M.COST_LINES.filter(([k]) => r.monthly[k] > 0.5 || r.missing.includes(k))
          .map(([k, label]) =>
            r.missing.includes(k)
              ? `<li class="missing"><i class="key seg-${k}"></i>${label}<span>missing</span></li>`
              : `<li><i class="key seg-${k}"></i>${label}<span>${money(r.monthly[k])}</span></li>`,
          )
          .join("");
        const total = M.SOURCED.length,
          dots = M.SOURCED.map((k) => `<i class="${r.confirmed.includes(k) ? "on" : ""}"></i>`).join("");
        const tags = [
          minMonthly !== null && Math.abs(r.monthlyTotal - minMonthly) < 0.5
            ? r.missing.length
              ? "Lowest monthly, but costs are missing"
              : "Lowest monthly"
            : "",
          minCash !== null && Math.abs(r.cashToClose - minCash) < 0.5
            ? r.missing.includes("closing")
              ? "Lowest cash to close, closing costs missing"
              : "Lowest cash to close"
            : "",
        ]
          .filter(Boolean)
          .map((t) => `<span class="tag">${t}</span>`)
          .join("");
        return `<article class="result-card" data-result="${h.id}"><h3><span>${letter}</span>${name}</h3>${tags ? `<p class="tags">${tags}</p>` : ""}
  <p class="r-label">Estimated monthly cost</p><p class="r-big" data-tween="${r.monthlyTotal}">${money(r.monthlyTotal)}</p>
  <div class="bar" role="img" aria-label="Monthly cost breakdown for ${name}">${segs}</div>
  <ul class="r-lines">${lines}</ul>
  <p class="r-label">Cash to close</p><p class="r-mid">${money(r.cashToClose)}</p>
  <p class="r-fine">${money(r.down)} down + ${money(r.v.closing)} closing − ${money(r.v.credits)} credits</p>
  <div class="confidence"><span class="dots" aria-hidden="true">${dots}</span><span>${r.confirmed.length} of ${total} costs backed by a quote, bill or documents</span></div>
  ${(() => {
    const tips = [];
    if (h.fortified) tips.push("Give insurers the FORTIFIED certificate and ask what discount it earns. This tool does not assume one.");
    if (h.ec) tips.push("Give the elevation certificate to the flood insurer. It can change the quote.");
    return tips.length ? `<ul class="r-tips">${tips.map((t) => `<li>${t}</li>`).join("")}</ul>` : "";
  })()}
  ${r.unconfirmed.length ? `<details class="verify"${r.unconfirmed.length > 2 ? "" : " open"}><summary>Verify next (${r.unconfirmed.length})</summary><ul>${r.unconfirmed.map((k) => `<li>${VERIFY[k]}</li>`).join("")}</ul></details>` : `<p class="r-fine">Every cost has a source. Recheck quotes before you commit.</p>`}
  ${h.floodZone ? `<p class="r-fine">Flood zone entered: ${esc(h.floodZone)}</p>` : ""}
  ${h.note ? `<p class="r-note">${esc(h.note)}</p>` : ""}
</article>`;
      })
      .join("");
    const swing = M.biggestSwing(results.filter((r) => r && !r.empty && !r.blocked));
    const swingEl = $("#swing");
    if (!loanOk) swingEl.textContent = "Fix the loan terms to compare.";
    else if (!swing) swingEl.textContent = ok.length ? "Add a second home to compare." : "";
    else if (swing.gap === 0) swingEl.textContent = "These homes cost the same per month with the numbers entered.";
    else {
      const name = (r) => esc(state.homes[results.indexOf(r)].label || "this home");
      // "closing" is not a monthly line, so it has no LINE_LABEL; name it explicitly.
      const gaps = swing.lo.missing.filter((k) => !swing.hi.missing.includes(k)).map((k) => (LINE_LABEL[k] || (k === "closing" ? "closing costs" : k)).toLowerCase());
      swingEl.innerHTML =
        `<strong>${money(swing.gap)} a month</strong> separates ${name(swing.hi)} from ${name(swing.lo)}. The largest single difference is <strong>${LINE_LABEL[swing.key].toLowerCase()}</strong>, ${money(swing.amount)} a month higher for ${name(swing.hi)}.` +
        (gaps.length ? ` <span class="swing-warn">${name(swing.lo)} is missing ${gaps.join(" and ")}, so its total may be understated.</span>` : "");
    }
    animateResults(before);
    const dock = $("#dock");
    dock.hidden = !ok.length;
    dock.innerHTML = state.homes
      .map((h, i) => (results[i] && results[i].monthly ? `<span>${String.fromCharCode(65 + i)} ${money(results[i].monthlyTotal)}/mo</span>` : ""))
      .join("") + `<span aria-hidden="true">See side by side ↓</span>`;
    window.dispatchEvent(new CustomEvent("compare:rendered"));
    updateSms(results);
    return { results, ok };
  }

  // ---------- feedback motion: changed totals count, bars slide from their old widths ----------
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  function snapshotResults() {
    const snap = {};
    document.querySelectorAll("[data-result]").forEach((card) => {
      snap[card.dataset.result] = {
        total: Number(card.querySelector("[data-tween]")?.dataset.tween),
        segs: Object.fromEntries([...card.querySelectorAll(".seg")].map((s) => [s.dataset.k, s.style.width])),
      };
    });
    return snap;
  }
  const tweens = new Map();
  function animateResults(before) {
    if (calm.matches) return;
    document.querySelectorAll("[data-result]").forEach((card) => {
      const prev = before[card.dataset.result];
      if (!prev) return;
      card.querySelectorAll(".seg").forEach((s) => {
        const to = s.style.width;
        s.style.transition = "none";
        s.style.width = prev.segs[s.dataset.k] || "0%";
        s.offsetWidth;
        s.style.transition = "";
        s.style.width = to;
      });
      const el = card.querySelector("[data-tween]"),
        to = Number(el.dataset.tween),
        from = prev.total;
      if (!Number.isFinite(from) || Math.abs(to - from) < 1) return;
      cancelAnimationFrame(tweens.get(card.dataset.result));
      const t0 = performance.now(),
        dur = 420;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur),
          eased = 1 - Math.pow(1 - k, 3);
        el.textContent = money(from + (to - from) * eased);
        if (k < 1) tweens.set(card.dataset.result, requestAnimationFrame(step));
      };
      tweens.set(card.dataset.result, requestAnimationFrame(step));
    });
  }

  // ---------- outputs: link, csv, sms, print ----------
  function summaryLines(results) {
    return state.homes
      .map((h, i) => {
        const r = results[i];
        return r && !r.errors && !r.empty && !r.blocked
          ? `${h.label || "Home " + (i + 1)}: ${money(r.monthlyTotal)}/mo, ${money(r.cashToClose)} to close (${r.confirmed.length}/${M.SOURCED.length} costs confirmed)`
          : null;
      })
      .filter(Boolean);
  }
  function updateSms(results) {
    const lines = summaryLines(results);
    $("#text-caleb").href =
      "sms:+12257470303?&body=" +
      encodeURIComponent(
        lines.length
          ? `Hi Caleb, I'm comparing homes:\n${lines.join("\n")}\nCan we talk through the costs that still need checking?`
          : "Hi Caleb, I'm comparing a few homes and have questions about the costs.",
      );
  }
  function shareUrl() {
    return `${location.origin}${location.pathname}#s=${encode(state)}`;
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.append(t);
      t.select();
      const done = document.execCommand("copy");
      t.remove();
      return done;
    }
  }
  function csv() {
    const { results } = compute();
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Item", ...state.homes.map((h, i) => h.label || `Home ${i + 1}`)]];
    rows.push(["Price", ...state.homes.map((h) => h.price)]);
    for (const [k, label] of COST_FIELDS) {
      rows.push([label, ...state.homes.map((h) => h[k])]);
      rows.push([`${label} source`, ...state.homes.map((h) => BASIS.find(([v]) => v === h.basis[k])?.[1].replace("Where is this from?", "") || "")]);
    }
    rows.push(["Credits ($)", ...state.homes.map((h) => h.credits)]);
    rows.push(["Flood zone", ...state.homes.map((h) => h.floodZone)]);
    rows.push(["FORTIFIED roof certificate", ...state.homes.map((h) => (h.fortified ? "yes" : ""))]);
    rows.push(["Elevation certificate", ...state.homes.map((h) => (h.ec ? "yes" : ""))]);
    for (const [k, label] of M.COST_LINES)
      rows.push([`Monthly: ${label}`, ...results.map((r) => (r && r.monthly ? r.monthly[k].toFixed(2) : ""))]);
    rows.push(["Monthly total", ...results.map((r) => (r && r.monthly ? r.monthlyTotal.toFixed(2) : ""))]);
    rows.push(["Cash to close", ...results.map((r) => (r && r.monthly ? r.cashToClose.toFixed(2) : ""))]);
    rows.push([]);
    rows.push(["Loan terms applied to every home"]);
    LOAN_FIELDS.forEach(([k, label]) => rows.push([label, state.loan[k]]));
    rows.push(["Planning estimates from your entries. Not a valuation, loan offer or insurance quote."]);
    const blob = new Blob([rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv" }),
      a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "home-cost-comparison.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function printSheet() {
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const a = state.agent,
      by =
        state.mode === "agent" && (a.agentName || a.brokerage)
          ? `<p>Prepared${a.client ? ` for ${esc(a.client)}` : ""} by ${esc(a.agentName)}${a.brokerage ? `, ${esc(a.brokerage)}` : ""}${a.brokeragePhone ? ` · ${esc(a.brokeragePhone)}` : ""}</p>`
          : "";
    const rows = [["Price", (h) => h.price && money(+h.price.replace(/[$,]/g, ""))]]
      .concat(COST_FIELDS.map(([k, label]) => [label, (h) => (h[k] === "" ? "missing" : `${h[k]} · ${BASIS.find(([v]) => v === h.basis[k])?.[1] || "source not marked"}`).replace("Where is this from?", "source not marked")]))
      .concat([
        ["Credits ($)", (h) => h.credits || "0"],
        ["Flood zone entered", (h) => h.floodZone || "not entered"],
        ["FORTIFIED roof certificate", (h) => (h.fortified ? "yes" : "not indicated")],
        ["Elevation certificate", (h) => (h.ec ? "available" : "not indicated")],
        ["Note", (h) => h.note],
      ]);
    $("#print-sheet").innerHTML = `<h2>Home cost comparison</h2><p>${date}</p>${by}<table><thead><tr><th>Numbers used</th>${state.homes.map((h) => `<th>${esc(h.label)}</th>`).join("")}</tr></thead><tbody>${rows
      .map(([label, fn]) => `<tr><th>${label}</th>${state.homes.map((h) => `<td>${esc(fn(h) || "")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table><p>Loan terms for every home: ${LOAN_FIELDS.map(([k, label]) => `${label} ${esc(state.loan[k])}`).join(" · ")}</p><p>Planning estimates from the entries above. Not a valuation, loan offer or insurance quote. Made with the free comparison at calebjackson.org.</p>`;
    window.print();
  }

  // ---------- events ----------
  function onInput(e) {
    const el = e.target;
    if (el.dataset.loan) {
      state.loan[el.dataset.loan] = el.value;
      if (!state.loanEdited.includes(el.dataset.loan)) state.loanEdited.push(el.dataset.loan);
      document.getElementById(`${el.id}-help`).textContent = "Your entry.";
    } else if (el.dataset.home && el.dataset.key) {
      const h = state.homes.find((x) => x.id === +el.dataset.home);
      h[el.dataset.key] = el.value;
      if (el.dataset.key === "label") $(`#h${h.id}-label-out`).textContent = el.value || "Home";
    } else if (el.dataset.agent) state.agent[el.dataset.agent] = el.value;
    else return;
    persist();
    renderResults();
  }
  function onChange(e) {
    const el = e.target;
    if (el.dataset.flag) {
      state.homes.find((x) => x.id === +el.dataset.home)[el.dataset.flag] = el.checked;
      persist();
      renderResults();
      return;
    }
    if (el.dataset.basis) {
      state.homes.find((x) => x.id === +el.dataset.home).basis[el.dataset.basis] = el.value;
      persist();
      renderResults();
    }
  }
  let clearArmed = 0;
  function onClick(e) {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.path) {
      state.mode = t.dataset.path;
      const url = new URL(location.href);
      url.searchParams.set("mode", state.mode);
      history.replaceState(null, "", url.pathname + url.search);
      renderMode();
      persist();
    } else if (t.dataset.remove) {
      state.homes = state.homes.filter((h) => h.id !== +t.dataset.remove);
      renderHomes();
      renderResults();
      persist();
      $("#add-home").focus();
      status("Home removed.");
    } else if (t.dataset.applyTax) {
      const id = +t.dataset.applyTax,
        h = state.homes.find((x) => x.id === id),
        mill = Number(String($(`[data-mill="${id}"]`).value).replace(/[,\s]/g, "")),
        price = Number(String(h.price).replace(/[$,\s]/g, "")),
        msg = $(`#h${id}-mill-msg`);
      if (!(price > 0)) msg.textContent = "Enter the price first.";
      else if (!(mill > 0 && mill < 400)) msg.textContent = "Enter the total millage, usually between 50 and 200.";
      else {
        const est = Math.round(M.laTaxEstimate(price, mill, $(`[data-homestead="${id}"]`).checked));
        h.tax = String(est);
        h.basis.tax = "estimate";
        $(`#h${id}-tax`).value = h.tax;
        $(`#h${id}-tax-basis`).value = "estimate";
        msg.textContent = `Estimated ${money(est)} a year. Marked as your estimate.`;
        persist();
        renderResults();
      }
    } else if (t.id === "add-home" && state.homes.length < MAX_HOMES) {
      state.homes.push(blankHome(state.homes.length + 1));
      renderHomes();
      renderResults();
      persist();
      $(`#h${state.homes.at(-1).id}-price`).focus();
    } else if (t.id === "load-example") {
      state.homes = [
        { ...blankHome(1), label: "Example A", price: "325000", tax: "2400", insurance: "3900", flood: "", hoa: "0", closing: "9000", basis: { tax: "estimate", insurance: "quote" } },
        { ...blankHome(2), label: "Example B", price: "310000", tax: "1850", insurance: "5200", flood: "1400", floodZone: "AE", hoa: "45", closing: "8800", credits: "3000", basis: { tax: "estimate", insurance: "quote", flood: "quote", hoa: "documents" } },
      ];
      renderHomes();
      renderResults();
      persist();
      status("Loaded an illustrative example. These are made-up numbers, not real homes or quotes.");
    } else if (t.dataset.listing) {
      addListing(t.dataset.listing);
    } else if (t.id === "compare-save") {
      const lines = summaryLines(compute().results);
      if (!lines.length) return status("Enter at least one home’s price first.");
      if (window.Brief)
        window.Brief.add({ id: "compare", type: "Comparison", title: `${lines.length} home${lines.length > 1 ? "s" : ""} compared`, lines: [...lines, `Loan: ${state.loan.downPct}% down, ${state.loan.rate}% for ${state.loan.years} years`] });
      t.textContent = "Saved to my brief ✓";
      setTimeout(() => (t.textContent = "Save this comparison to my brief"), 2500);
    } else if (t.id === "print") printSheet();
    else if (t.id === "share")
      copy(shareUrl()).then((ok) => status(ok ? "Share link copied. It contains the numbers on this page." : "Copy failed. Your browser blocked the clipboard."));
    else if (t.id === "csv") {
      csv();
      status("Downloaded home-cost-comparison.csv.");
    } else if (t.id === "clear") {
      if (Date.now() - clearArmed < 4000) {
        state = { ...defaults(), mode: state.mode };
        try {
          localStorage.removeItem(STORE);
        } catch {}
        history.replaceState(null, "", location.pathname + location.search);
        renderAll();
        status("Cleared. Nothing from the previous comparison is saved on this device.");
        t.textContent = "Start over";
        clearArmed = 0;
      } else {
        clearArmed = Date.now();
        t.textContent = "Press again to clear everything";
        setTimeout(() => (t.textContent = "Start over"), 4000);
      }
    }
  }

  // Prefill a featured home from the explore map or a campaign page (?add=basil).
  async function featuredHomes() {
    try {
      const r = await fetch("data/properties.json");
      if (!r.ok) throw Error();
      return await r.json();
    } catch (e) {
      // Opened as a local file, where fetch is blocked: use the bundled copy.
      if (window.MAP_DATA && window.MAP_DATA["data/properties.json"]) return window.MAP_DATA["data/properties.json"];
      throw e;
    }
  }
  async function addFromListing() {
    const id = new URLSearchParams(location.search).get("add");
    if (!id || openedFromLink) return;
    return addListing(id);
  }
  async function addListing(id) {
    try {
      const homes = await featuredHomes(),
        p = homes.find((x) => x.id === id);
      if (!p) return;
      if (state.homes.some((h) => h.label === p.name)) return status(`${p.name} is already in this comparison.`);
      const empty = state.homes.find((h) => h.price === "" && COST_FIELDS.every(([k]) => h[k] === ""));
      const target = empty || (state.homes.length < MAX_HOMES ? (state.homes.push(blankHome(state.homes.length + 1)), state.homes.at(-1)) : null);
      if (!target) return status("Four homes is the limit. Remove one to add another.");
      target.label = p.name;
      target.price = String(p.price);
      target.note = `Listing snapshot ${p.mls ? "MLS " + p.mls : ""}, Oct 8, 2026. Confirm price and availability.`;
      renderHomes();
      renderResults();
      persist();
      status(`Added ${p.name} with its snapshot price. Its costs are blank until you enter them.`);
    } catch {
      status("Could not load the featured home. Enter it by hand.");
    }
  }

  // The totals dock is for while you are editing; it steps aside once the results are on screen.
  const resultsSection = $(".compare-results");
  if ("IntersectionObserver" in window && resultsSection)
    new IntersectionObserver(([entry]) => $("#dock").classList.toggle("away", entry.isIntersecting), {
      threshold: 0.05,
    }).observe(resultsSection);

  function renderAll() {
    renderMode();
    renderAgent();
    renderLoan();
    renderHomes();
    renderResults();
  }
  load();
  renderAll();
  if (openedFromLink) status("You opened a shared comparison. Changes you make stay on this device.");
  addFromListing();
  // A share link pasted into an open tab only changes the hash; load it properly.
  addEventListener("hashchange", () => {
    if (/^#s=/.test(location.hash)) location.reload();
  });
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("click", onClick);
})();
