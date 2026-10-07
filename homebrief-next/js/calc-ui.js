/* Answer-first calculators. Every tool shows a labeled example result the moment it loads.
   Math comes from calc-core.js (CJHomeBriefTools). This file only reads inputs and renders. */
(function () {
  "use strict";
  const T = window.CJHomeBriefTools;
  if (!T) return;
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)");
  const money0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const money2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  const PHONE = "+12257470303";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function readHash() { const h = location.hash.replace(/^#/, ""); const out = {}; if (!h) return out; h.split("&").forEach(p => { const [k, v] = p.split("="); if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || ""); }); return out; }
  function writeHash(obj) { const s = Object.entries(obj).filter(([, v]) => v !== "" && v != null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"); history.replaceState(null, "", s ? "#" + s : location.pathname); }

  function animateNumber(el, to, format) {
    const from = parseFloat(el.dataset.v || "0") || 0; el.dataset.v = to;
    if (!motionOK.matches || Math.abs(to - from) < 1) { el.textContent = format(to); return; }
    const start = performance.now(), dur = 520;
    (function f(t) { const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = format(from + (to - from) * e); if (p < 1) requestAnimationFrame(f); })(start);
  }

  function bindRange(input) {
    const out = input.closest(".field")?.querySelector("output");
    const fmt = input.dataset.format === "pct" ? v => v + "%" : input.dataset.format === "years" ? v => v + " yr" : v => money0.format(v);
    const paint = () => { const min = +input.min, max = +input.max, v = +input.value; input.style.setProperty("--fill", ((v - min) / (max - min) * 100).toFixed(2) + "%"); if (out) out.textContent = fmt(v); };
    input.addEventListener("input", paint); paint();
    return paint;
  }

  function setupChips(group, onPick) {
    $$(".chip", group).forEach(ch => ch.addEventListener("click", () => { $$(".chip", group).forEach(c => c.setAttribute("aria-pressed", String(c === ch))); onPick(ch.dataset.value); }));
  }

  /* ---------- payment ---------- */
  function payment(form) {
    const price = $("[name=price]", form), down = $("[name=down]", form), rate = $("[name=rate]", form), term = $("[name=term]", form);
    const taxes = $("[name=taxes]", form), ins = $("[name=ins]", form), flood = $("[name=flood]", form), hoa = $("[name=hoa]", form), pmi = $("[name=pmi]", form);
    const paints = [price, down, rate, taxes, ins, flood, hoa, pmi].filter(Boolean).map(bindRange);
    const answer = $("[data-answer]", form), lines = $("[data-lines]", form), note = $("[data-note]", form);
    const h = readHash();
    if (h.p) price.value = h.p; if (h.d) down.value = h.d; if (h.r) rate.value = h.r; if (h.t && term) term.value = h.t;
    if (h.tx && taxes) taxes.value = h.tx; if (h.in && ins) ins.value = h.in; if (h.fl && flood) flood.value = h.fl; if (h.hoa && hoa) hoa.value = h.hoa; if (h.pmi && pmi) pmi.value = h.pmi;
    setupChips($("[data-chips=term]", form) || form, v => { if (term) { term.value = v; render(); } });
    function values() {
      const p = +price.value, d = Math.round(p * (+down.value) / 100);
      return { price: p, downPayment: d, rate: +rate.value, term: term ? +term.value : 30, annualTaxes: taxes ? +taxes.value : 0, annualHomeInsurance: ins ? +ins.value : 0, annualFloodInsurance: flood ? +flood.value : 0, monthlyHOA: hoa ? +hoa.value : 0, monthlyPMI: pmi ? +pmi.value : 0 };
    }
    function render() {
      paints.forEach(p => p());
      const v = values();
      let r; try { r = T.calculatePayment(v); } catch (e) { answer.textContent = "Check the inputs."; return; }
      const extras = v.annualTaxes || v.annualHomeInsurance || v.annualFloodInsurance || v.monthlyHOA || v.monthlyPMI;
      animateNumber($(".n", answer), r.estimatedMonthlyTotal, x => money0.format(x));
      $("small", answer).textContent = (extras ? "a month with the costs you added" : "a month, principal and interest only") + ` on ${money0.format(v.price)} with ${down.value}% down at ${rate.value}% for ${v.term} years`;
      if (lines) lines.innerHTML = [
        ["Loan amount", r.loanAmount], ["Principal and interest", r.monthlyPrincipalAndInterest],
        v.annualTaxes ? ["Property taxes", r.monthlyTaxes] : null, v.annualHomeInsurance ? ["Homeowners insurance", r.monthlyHomeInsurance] : null,
        v.annualFloodInsurance ? ["Flood insurance", r.monthlyFloodInsurance] : null, v.monthlyHOA ? ["HOA dues", r.monthlyHOA] : null, v.monthlyPMI ? ["Mortgage insurance", r.monthlyPMI] : null,
        ["Estimated monthly total", r.estimatedMonthlyTotal, true]
      ].filter(Boolean).map(([k, val, tot]) => `<div class="${tot ? "total" : ""}" style="display:contents"><dt>${k}</dt><dd>${money2.format(val)}</dd></div>`).join("");
      if (note) note.textContent = extras ? "Taxes and insurance here are your estimates, not quotes. Utilities, upkeep and cash to close are not included." : "This is the loan payment only. Louisiana taxes, homeowners insurance and flood insurance add to it. Open the costs below to add yours.";
      writeHash({ p: v.price, d: down.value, r: rate.value, t: v.term, tx: taxes?.value, in: ins?.value, fl: flood?.value, hoa: hoa?.value, pmi: pmi?.value });
      smsBody(form, `Hey Caleb, I ran the payment tool on calebjackson.org. ${money0.format(v.price)} with ${down.value}% down at ${rate.value}% came out to about ${money0.format(r.estimatedMonthlyTotal)} a month${extras ? " with my taxes and insurance" : ""}. Does that sound right?`);
      form.dispatchEvent(new CustomEvent("hb:result", { detail: { kind: "payment", total: r.estimatedMonthlyTotal, values: v } }));
    }
    form.addEventListener("input", render); render();
    return { render, set: (k, v) => { const map = { price, down, rate }; if (map[k]) { map[k].value = v; render(); } } };
  }

  /* ---------- seller net ---------- */
  function net(form) {
    const sale = $("[name=sale]", form), payoff = $("[name=payoff]", form), comm = $("[name=comm]", form), title = $("[name=title]", form), other = $("[name=other]", form), conc = $("[name=conc]", form), repairs = $("[name=repairs]", form);
    const paints = [sale, payoff, comm, title, other, conc, repairs].filter(Boolean).map(bindRange);
    const answer = $("[data-answer]", form), lines = $("[data-lines]", form), note = $("[data-note]", form);
    const h = readHash();
    if (h.s) sale.value = h.s; if (h.po) payoff.value = h.po; if (h.c && comm) comm.value = h.c; if (h.ti && title) title.value = h.ti; if (h.o && other) other.value = h.o; if (h.cc && conc) conc.value = h.cc; if (h.rp && repairs) repairs.value = h.rp;
    function render() {
      paints.forEach(p => p());
      const v = { salePrice: +sale.value, payoff: +payoff.value, commissionPercent: comm ? +comm.value : 0, titleFees: title ? +title.value : 0, otherClosingCosts: other ? +other.value : 0, concessions: conc ? +conc.value : 0, repairs: repairs ? +repairs.value : 0 };
      let r; try { r = T.calculateNet(v); } catch (e) { answer.textContent = "Check the inputs."; return; }
      animateNumber($(".n", answer), r.estimatedNet, x => money0.format(x));
      $("small", answer).textContent = `estimated to you at closing on a ${money0.format(v.salePrice)} sale, after a ${money0.format(v.payoff)} payoff${v.commissionPercent ? ` and ${comm.value}% commission` : ""}`;
      if (lines) lines.innerHTML = [["Sale price", r.salePrice], ["Mortgage payoff", -r.payoff], v.commissionPercent ? ["Commission", -r.commission] : null, v.titleFees ? ["Seller title fees", -r.titleFees] : null, v.otherClosingCosts ? ["Other closing costs", -r.otherClosingCosts] : null, v.concessions ? ["Concessions to buyer", -r.concessions] : null, v.repairs ? ["Repairs you pay for", -r.repairs] : null, ["Estimated net", r.estimatedNet, true]].filter(Boolean).map(([k, val, tot]) => `<div class="${tot ? "total" : ""}" style="display:contents"><dt>${k}</dt><dd>${money2.format(val)}</dd></div>`).join("");
      if (note) note.textContent = v.commissionPercent ? "Commission is whatever you and Caleb agree to. Title and closing figures are estimates until the title company issues yours." : "Commission is not assumed. Set it below to whatever you and Caleb agree on. Nothing here is a promised payout.";
      writeHash({ s: v.salePrice, po: v.payoff, c: comm?.value, ti: title?.value, o: other?.value, cc: conc?.value, rp: repairs?.value });
      smsBody(form, `Hey Caleb, I ran the net sheet on calebjackson.org. A ${money0.format(v.salePrice)} sale with a ${money0.format(v.payoff)} payoff came out to about ${money0.format(r.estimatedNet)} to me${v.commissionPercent ? ` after ${comm.value}% commission` : ""}. Does that sound right?`);
      form.dispatchEvent(new CustomEvent("hb:result", { detail: { kind: "net", total: r.estimatedNet, values: v } }));
    }
    form.addEventListener("input", render); render();
    return { render };
  }

  /* ---------- text me this result ---------- */
  function smsBody(form, text) {
    const scope = form.closest("[data-sms-scope]") || form;
    $$("a[data-sms-result]", scope).forEach(a => { a.href = `sms:${PHONE}?&body=${encodeURIComponent(text)}`; });
    const header = $(".site-header .text-caleb"); if (header) header.href = `sms:${PHONE}?&body=${encodeURIComponent(text)}`;
  }

  /* ---------- explain it like I'm new ---------- */
  $$("[data-explain-toggle]").forEach(toggle => {
    const scope = toggle.closest("[data-explain-scope]") || document;
    $$("button", toggle).forEach(b => b.addEventListener("click", () => {
      $$("button", toggle).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const mode = b.dataset.mode;
      $$("[data-explain]", scope).forEach(el => { el.hidden = el.dataset.explain !== mode; });
    }));
  });

  /* ---------- say it instead of typing ---------- */
  function words(s) {
    const map = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1000000, half: 0.5, quarter: 0.25 };
    return s.toLowerCase().replace(/[$,]/g, "").split(/\s+/).map(w => w in map ? map[w] : w);
  }
  function parseAmounts(text) {
    // Returns numbers found in speech: "three forty" -> 340000 when context is price, "six and a half percent" -> 6.5
    const toks = words(text); const nums = []; let cur = null, scale = 1;
    const push = () => { if (cur != null) { nums.push(cur * scale); cur = null; scale = 1; } };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (typeof t === "number") {
        if (t === 100) { cur = (cur || 1) * 100; }
        else if (t === 1000 || t === 1000000) { cur = (cur || 1) * t; push(); }
        else if (t === 0.5 || t === 0.25) { cur = (cur || 0) + t; }
        else if (cur != null && cur < 100 && t < 10 && cur % 10 === 0) cur += t;
        else if (cur != null && cur < 10 && t >= 10 && t < 100 && String(t).endsWith("0")) cur = cur * 100 + t; // "three forty"
        else { push(); cur = t; }
      } else if (/^\d+(\.\d+)?k$/.test(t)) { push(); cur = parseFloat(t) * 1000; push(); }
      else if (/^\d+(\.\d+)?$/.test(t)) { push(); cur = parseFloat(t); }
      else if (t === "percent" || t === "%") { push(); }
      else if (t === "and" || t === "a") { /* join */ }
      else push();
    }
    push();
    return nums;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  $$("[data-mic]").forEach(btn => {
    if (!SR) { btn.classList.add("unsupported"); return; }
    const form = btn.closest("form"); const status = $("[data-mic-status]", form);
    btn.addEventListener("click", () => {
      const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
      btn.setAttribute("aria-pressed", "true"); if (status) status.textContent = "Listening. Try: three forty, twenty percent down, six and a half.";
      rec.onresult = e => {
        const text = e.results[0][0].transcript; const nums = parseAmounts(text);
        const price = $("[name=price],[name=sale]", form), down = $("[name=down]", form), rate = $("[name=rate]", form), payoff = $("[name=payoff]", form);
        const big = nums.filter(n => n >= 50000), pct = nums.filter(n => n > 0 && n < 50);
        if (price && big[0]) price.value = Math.round(big[0] / 5000) * 5000;
        if (payoff && big[1]) payoff.value = Math.round(big[1] / 5000) * 5000;
        if (down && pct[0] != null) down.value = pct[0];
        if (rate && pct[1] != null) rate.value = pct[1]; else if (rate && pct[0] != null && !down) rate.value = pct[0];
        form.dispatchEvent(new Event("input"));
        if (status) status.textContent = `Heard: “${text}”. Adjust anything with the sliders.`;
      };
      rec.onerror = () => { if (status) status.textContent = "Didn't catch that. Try once more, or use the sliders."; };
      rec.onend = () => btn.setAttribute("aria-pressed", "false");
      rec.start();
    });
  });

  /* ---------- mount ---------- */
  const tools = {};
  $$("form[data-calc=payment]").forEach(f => { tools.payment = payment(f); });
  $$("form[data-calc=net]").forEach(f => { tools.net = net(f); });
  window.HBTools = tools;
})();
