(() => {
  "use strict";
  const PM = window.PlanningMath;
  const $ = (s, r = document) => r.querySelector(s);
  const STORE = "cj-sell-v1";
  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const num = (v) => Number(String(v ?? "").replace(/[$,\s]/g, ""));

  const SHARED = [
    ["payoff", "Mortgage and lien payoff ($)", "220000", "Use a current payoff statement. It includes interest to the payoff date."],
    ["closing", "Other settlement costs ($)", "3000", "Title, recording and other charges. Do not repeat the fee percentage here."],
    ["repairs", "Preparation and repairs ($)", "2000", "Work you pay for outside closing."],
    ["moving", "Moving and transition ($)", "1500", "Your allowance for the move itself."],
  ];
  const TAX = [
    ["annualTax", "This year’s property tax ($)", "", "From your most recent bill. Leave blank to skip."],
    ["closingDate", "Expected closing date", "", "Used to estimate the days of tax you owe the buyer."],
  ];
  const SCEN = [
    ["name", "Name", "", ""],
    ["price", "Sale price to test ($)", "", "Hypothetical. Not an appraisal."],
    ["fees", "Selling fees (% of price)", "5", "Negotiable. Use what you have agreed or expect."],
    ["credits", "Buyer credits ($)", "0", "Concessions or closing-cost help you agree to."],
  ];
  const NEXT = [
    ["nextPrice", "Next home price ($)", "", "Optional."],
    ["nextDown", "Down payment you want (%)", "20", ""],
    ["reserve", "Cash to keep in reserve ($)", "", "Optional. Kept aside, not used for the down payment."],
  ];
  const defaults = () => ({
    shared: Object.fromEntries(SHARED.map((f) => [f[0], f[2]])),
    tax: { annualTax: "", closingDate: "" },
    scenarios: [
      { name: "List-price sale", price: "350000", fees: "5", credits: "0" },
      { name: "Lower price with a credit", price: "340000", fees: "5", credits: "5000" },
    ],
    next: { nextPrice: "", nextDown: "20", reserve: "" },
    target: "",
    edited: [],
    talk: { place: "", timing: "just exploring", priorities: [], include: false },
  });
  let state = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && saved.shared && Array.isArray(saved.scenarios)) state = { ...defaults(), ...saved };
  } catch {
    /* storage unavailable */
  }
  let saveTimer = 0;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(state));
      } catch {}
    }, 250);
  };

  // ---------- fields ----------
  function field(id, label, value, help, attrs, type = "text") {
    const edited = state.edited.includes(id);
    return `<div class="c-field"><label for="${id}">${label}${type === "text" && help ? `<small id="${id}-flag">${edited ? "Your entry" : value === "" ? "" : "Illustrative"}</small>` : ""}</label><input id="${id}" type="${type}" ${type === "text" ? 'inputmode="decimal" autocomplete="off"' : ""} value="${esc(value)}" aria-describedby="${id}-help ${id}-err" ${attrs}/>${help ? `<p class="field-help" id="${id}-help">${help}</p>` : ""}<p class="field-error" id="${id}-err"></p></div>`;
  }
  function renderFields() {
    $("#shared-fields").innerHTML = SHARED.map(([k, l, , h]) => field(`s-${k}`, l, state.shared[k], h, `data-group="shared" data-key="${k}"`)).join("");
    $("#tax-fields").innerHTML = TAX.map(([k, l, , h]) =>
      field(`t-${k}`, l, state.tax[k], h, `data-group="tax" data-key="${k}"`, k === "closingDate" ? "date" : "text"),
    ).join("");
    $("#scenario-fields").innerHTML = state.scenarios
      .map(
        (s, i) => `<div class="scenario-col"><p class="scenario-tag"><span>${"AB"[i]}</span>Scenario ${"AB"[i]}</p>${SCEN.map(([k, l, , h]) =>
          k === "name"
            ? `<div class="c-field"><label for="sc${i}-name">Name</label><input id="sc${i}-name" maxlength="40" value="${esc(s.name)}" data-group="scenario" data-index="${i}" data-key="name" /></div>`
            : field(`sc${i}-${k}`, l, s[k], h, `data-group="scenario" data-index="${i}" data-key="${k}"`),
        ).join("")}</div>`,
      )
      .join("");
    $("#next-fields").innerHTML = NEXT.map(([k, l, , h]) => field(`n-${k}`, l, state.next[k], h, `data-group="next" data-key="${k}"`)).join("");
  }
  // Errors wait until a field has been touched or holds a value, so a blank form is not a wall of red.
  function setError(id, msg, always = false) {
    const el = document.getElementById(id);
    if (msg && !always && el && el.value === "" && !state.edited.includes(id)) msg = "";
    const input = el,
      err = document.getElementById(`${id}-err`);
    if (!input || !err) return;
    err.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  // ---------- math ----------
  function proration() {
    const { annualTax, closingDate } = state.tax;
    setError("t-annualTax", "");
    setError("t-closingDate", "");
    if (annualTax === "" && closingDate === "") return { amount: 0, used: false };
    const tax = num(annualTax);
    if (annualTax === "" || !Number.isFinite(tax) || tax < 0) {
      setError("t-annualTax", "Enter the yearly tax in dollars, or clear both tax fields.", true);
      return { error: true };
    }
    if (!closingDate) {
      setError("t-closingDate", "Pick an expected closing date, or clear the tax amount.", true);
      return { error: true };
    }
    const d = new Date(closingDate + "T12:00:00");
    if (Number.isNaN(d.getTime())) return setError("t-closingDate", "Pick a valid date."), { error: true };
    const start = new Date(d.getFullYear(), 0, 1),
      end = new Date(d.getFullYear() + 1, 0, 1),
      daysInYear = Math.round((end - start) / 864e5),
      daysOwned = Math.floor((d - start) / 864e5);
    return { amount: (tax * daysOwned) / daysInYear, used: true, daysOwned, daysInYear };
  }
  function scenarioResult(i, pr) {
    const s = state.scenarios[i],
      r = PM.sellerNet({ ...state.shared, price: s.price, fees: s.fees, credits: s.credits });
    ["price", "fees", "credits"].forEach((k) => setError(`sc${i}-${k}`, r.errors?.[k]));
    if (i === 0) SHARED.forEach(([k]) => setError(`s-${k}`, r.errors?.[k]));
    if (r.errors) return r;
    if (pr.error) return { errors: { tax: true } };
    const lines = pr.used ? [...r.lines, { key: "tax", label: "Property tax proration (estimate)", amount: pr.amount }] : r.lines;
    return { ...r, lines, closingNet: r.closingNet - pr.amount, afterMove: r.afterMove - pr.amount };
  }

  // ---------- render ----------
  let last = [];
  function render() {
    const pr = proration(),
      res = [0, 1].map((i) => scenarioResult(i, pr));
    last = res;
    const maxPrice = Math.max(1, ...res.filter((r) => !r.errors).map((r) => r.v.price));
    $("#sell-cards").innerHTML = res
      .map((r, i) => {
        const s = state.scenarios[i],
          name = esc(s.name || `Scenario ${"AB"[i]}`);
        if (r.errors)
          return `<article class="result-card muted"><h3><span>${"AB"[i]}</span>${name}</h3><p>${s.price === "" ? "Enter a sale price and your costs." : "Check the highlighted fields."}</p></article>`;
        const scale = (n) => ((Math.max(0, n) / maxPrice) * 100).toFixed(2);
        const segs =
          r.lines.map((l) => `<span class="seg seg-cost" style="width:${scale(l.amount)}%" title="${esc(l.label)}"></span>`).join("") +
          `<span class="seg seg-net" style="width:${scale(r.closingNet)}%" title="Cash at closing"></span>`;
        return `<article class="result-card" data-sell="${i}"><h3><span>${"AB"[i]}</span>${name}</h3>
<p class="r-label">Estimated cash at closing</p><p class="r-big">${money(r.closingNet)}</p>
<div class="bar sell-bar" role="img" aria-label="${name}: sale price split into payoff, fees, costs and cash at closing">${segs}</div>
<ul class="r-lines"><li><span class="r-strong">Sale price</span><span>${money(r.v.price)}</span></li>${r.lines
          .map((l) => `<li><i class="key seg-cost"></i>${esc(l.label)}<span>−${money(l.amount)}</span></li>`)
          .join("")}<li class="net"><i class="key seg-net"></i>Cash at closing<span>${money(r.closingNet)}</span></li></ul>
<p class="r-label">After preparation and moving</p><p class="r-mid">${money(r.afterMove)}</p>
${r.closingNet < 0 ? `<p class="r-warn">This scenario needs ${money(-r.closingNet)} more from you at closing.</p>` : ""}</article>`;
      })
      .join("");
    // Explain the gap in terms of price, fees and credits (shared costs cancel out).
    const swing = $("#sell-swing");
    if (state.scenarios.every((s) => s.price === "")) swing.textContent = "Enter a sale price for each scenario to compare them.";
    else if (res.some((r) => r.errors)) swing.textContent = "Fix the highlighted numbers to compare the two scenarios.";
    else {
      const [a, b] = res,
        diff = a.closingNet - b.closingNet,
        names = state.scenarios.map((s, i) => esc(s.name || `Scenario ${"AB"[i]}`));
      if (Math.abs(diff) < 1) swing.textContent = "Both scenarios leave the same amount at closing.";
      else {
        const [hi, lo, hiR, loR] = diff > 0 ? [names[0], names[1], a, b] : [names[1], names[0], b, a];
        const parts = [],
          dPrice = hiR.v.price - loR.v.price,
          dFees = loR.feeAmount - hiR.feeAmount,
          dCredits = loR.v.credits - hiR.v.credits;
        if (Math.abs(dPrice) >= 1)
          parts.push(dPrice > 0 ? `${money(dPrice)} from the higher price` : `despite a price ${money(-dPrice)} lower`);
        if (Math.abs(dCredits) >= 1)
          parts.push(dCredits > 0 ? `${money(dCredits)} less in buyer credits` : `${money(-dCredits)} more in buyer credits`);
        if (Math.abs(dFees) >= 1) parts.push(dFees > 0 ? `${money(dFees)} less in fees` : `${money(-dFees)} more in fees`);
        swing.innerHTML = `<strong>${hi}</strong> leaves <strong>${money(Math.abs(diff))} more</strong> at closing than ${lo}${parts.length ? `: ${parts.join(", ")}` : ""}.`;
      }
    }
    renderNext(res);
    renderTarget(pr);
    renderTalk();
    $("#include-numbers").disabled = res.some((r) => r.errors);
    printSheet(res, pr);
  }
  function renderNext(res) {
    const out = $("#next-result"),
      price = num(state.next.nextPrice),
      pct = num(state.next.nextDown),
      reserve = state.next.reserve === "" ? 0 : num(state.next.reserve);
    setError("n-nextPrice", "");
    setError("n-nextDown", "");
    setError("n-reserve", "");
    if (state.next.nextPrice === "") return (out.textContent = "Enter a next home price to see this.");
    if (!(price > 0)) return setError("n-nextPrice", "Enter a price above zero."), (out.textContent = "");
    if (!(pct >= 0 && pct <= 100)) return setError("n-nextDown", "Use 0 to 100%."), (out.textContent = "");
    if (!(reserve >= 0)) return setError("n-reserve", "Use zero or more."), (out.textContent = "");
    if (res.some((r) => r.errors)) return (out.textContent = "Fix the scenarios above first.");
    const need = (price * pct) / 100;
    out.innerHTML = res
      .map((r, i) => {
        const avail = r.afterMove - reserve,
          name = esc(state.scenarios[i].name || `Scenario ${"AB"[i]}`),
          share = need > 0 ? Math.max(0, Math.min(100, (avail / need) * 100)) : 100;
        return `<span class="next-line"><strong>${name}:</strong> ${
          avail >= need
            ? `covers the ${money(need)} down payment with ${money(avail - need)} to spare`
            : `covers ${share.toFixed(0)}% of the ${money(need)} down payment, ${money(need - Math.max(0, avail))} short`
        }<i class="meter" aria-hidden="true"><b style="width:${share.toFixed(1)}%"></b></i></span>`;
      })
      .join("");
  }

  // Work backward from the amount the seller wants to walk away with, using the first scenario's
  // fee rate and credits plus the shared costs: target = P - payoff - P*fee - closing - credits - proration - repairs - moving.
  function renderTarget(pr) {
    const out = $("#target-result"), raw = state.target || "", x = num(raw);
    $("#target-net-err").textContent = "";
    if (raw === "") return (out.textContent = "");
    if (!(x >= 0)) return ($("#target-net-err").textContent = "Enter an amount in dollars, digits only."), (out.textContent = "");
    const sc = state.scenarios[0], sh = state.shared, f = num(sc.fees) / 100;
    const costs = ["payoff", "closing", "repairs", "moving"].map((k) => num(sh[k])), credits = num(sc.credits);
    if ([f, credits, ...costs].some((v) => !(v >= 0)) || f >= 1 || pr.error) return (out.textContent = "Fix the costs and the first scenario above first.");
    const price = (x + costs.reduce((a, b) => a + b, 0) + credits + (pr.amount || 0)) / (1 - f);
    const check = PM.sellerNet({ ...sh, price: String(Math.round(price)), fees: sc.fees, credits: sc.credits });
    const after = check.errors ? NaN : check.afterMove - (pr.amount || 0);
    const testPrice = num(sc.price), gap = price - testPrice;
    out.innerHTML = `You would need to sell for about <strong>${money(Math.round(price / 100) * 100)}</strong> at ${num(sc.fees)}% fees and ${money(credits)} in credits.` +
      (testPrice > 0 ? ` That is ${money(Math.abs(Math.round(gap / 100) * 100))} ${gap > 0 ? "above" : "below"} your ${esc(sc.name || "first")} scenario.` : "") +
      (Number.isFinite(after) ? `<span class="fine"> Check: selling at that price leaves ${money(after)} after preparation and moving.</span>` : "");
  }

  // ---------- message ----------
  function message() {
    const t = state.talk,
      bits = [`Hi Caleb, I'm thinking about selling${t.place ? ` ${t.place.trim()}` : " my home"}, ${t.timing}.`];
    if (t.priorities.length) bits.push(`What matters most: ${t.priorities.join(", ")}.`);
    if (t.include && last.length && !last.some((r) => r.errors))
      bits.push(
        `My rough numbers: ${last
          .map((r, i) => `${state.scenarios[i].name || "Scenario " + "AB"[i]} at ${money(r.v.price)} leaves about ${money(r.closingNet)} at closing`)
          .join("; ")}.`,
      );
    bits.push("Can we talk?");
    return bits.join(" ");
  }
  function renderTalk() {
    const m = message();
    $("#talk-message").textContent = m;
    $("#talk-send").href = "sms:+12257470303?&body=" + encodeURIComponent(m);
    $("#include-numbers").setAttribute("aria-checked", String(state.talk.include));
  }

  // ---------- print ----------
  function printSheet(res, pr) {
    let el = $("#sell-print-sheet");
    if (!el) {
      el = document.createElement("section");
      el.id = "sell-print-sheet";
      el.className = "print-only";
      $("#sell-results").prepend(el);
    }
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    el.innerHTML = `<h2>Seller net scenarios</h2><p>${date}</p><p>Your costs: ${SHARED.map(([k, l]) => `${l.replace(" ($)", "")} ${state.shared[k] === "" ? "not entered" : money(num(state.shared[k]))}`).join(" · ")}${pr.used ? ` · Property tax proration ${money(pr.amount)} (${pr.daysOwned} of ${pr.daysInYear} days)` : ""}</p><p>Planning estimate from your entries. Not a valuation, appraisal or tax advice. Made with the free planner at calebjackson.org.</p>`;
  }

  // ---------- events ----------
  document.addEventListener("input", (e) => {
    const el = e.target,
      g = el.dataset.group;
    if (!g) {
      if (el.id === "talk-place") {
        state.talk.place = el.value;
        renderTalk();
        persist();
      }
      if (el.id === "target-net") {
        state.target = el.value;
        renderTarget(proration());
        persist();
      }
      return;
    }
    const k = el.dataset.key;
    if (g === "scenario") state.scenarios[+el.dataset.index][k] = el.value;
    else state[g][k] = el.value;
    if (!state.edited.includes(el.id)) state.edited.push(el.id);
    const flag = document.getElementById(`${el.id}-flag`);
    if (flag) flag.textContent = "Your entry";
    persist();
    render();
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "timing") state.talk.timing = el.value;
    else if (el.closest(".chips") && el.type === "checkbox")
      state.talk.priorities = [...document.querySelectorAll(".chips input[type=checkbox]:checked")].map((c) => c.value);
    else if (el.dataset.group === "tax") {
      state.tax[el.dataset.key] = el.value;
      render();
    } else return;
    persist();
    renderTalk();
  });
  $("#include-numbers").addEventListener("click", () => {
    state.talk.include = !state.talk.include;
    persist();
    renderTalk();
  });
  $("#talk-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(message());
      $("#talk-status").textContent = "Message copied.";
    } catch {
      $("#talk-status").textContent = "Copy was blocked by the browser. Select the message and copy it.";
    }
  });
  $("#sell-to-talk").addEventListener("click", () => {
    if (!last.some((r) => r.errors)) {
      state.talk.include = true;
      persist();
      renderTalk();
    }
  });
  $("#sell-print").addEventListener("click", () => window.print());
  $("#sell-save").addEventListener("click", (e) => {
    if (last.some((r) => r.errors)) return ($("#sell-status").textContent = "Fix the scenarios above before saving.");
    if (window.Brief)
      window.Brief.add({ id: "sale", type: "Sale scenarios", title: "What my sale could leave me",
        lines: last.map((r, i) => `${state.scenarios[i].name || "Scenario " + "AB"[i]}: sell at ${money(r.v.price)}, about ${money(r.closingNet)} at closing, ${money(r.afterMove)} after moving`) });
    e.currentTarget.textContent = "Saved to my brief ✓";
  });
  if (state.target) $("#target-net").value = state.target;
  let armed = 0;
  $("#sell-clear").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (Date.now() - armed < 4000) {
      const t = state.talk;
      state = defaults();
      state.shared = Object.fromEntries(SHARED.map((f) => [f[0], ""]));
      state.scenarios = [
        { name: "Scenario A", price: "", fees: "", credits: "" },
        { name: "Scenario B", price: "", fees: "", credits: "" },
      ];
      state.talk = t;
      state.edited = [];
      try {
        localStorage.removeItem(STORE);
      } catch {}
      renderFields();
      render();
      $("#sell-status").textContent = "Cleared. Enter your own numbers.";
      b.textContent = "Start over with blank numbers";
      armed = 0;
    } else {
      armed = Date.now();
      b.textContent = "Press again to clear your numbers";
      setTimeout(() => (b.textContent = "Start over with blank numbers"), 4000);
    }
  });

  // restore talk form
  $("#talk-place").value = state.talk.place || "";
  document.querySelectorAll('input[name="timing"]').forEach((r) => (r.checked = r.value === state.talk.timing));
  document.querySelectorAll(".chips input[type=checkbox]").forEach((c) => (c.checked = state.talk.priorities.includes(c.value)));
  renderFields();
  render();
})();
