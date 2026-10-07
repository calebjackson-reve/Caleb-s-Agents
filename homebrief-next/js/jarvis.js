/* Caleb, straight. A chat that answers only when a source backs it, and sends the rest to Caleb.
   Live mode posts to window.HB_JARVIS_ENDPOINT (AIRE's /jarvis contract). Without one it runs the honest local engine. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const fab = $("[data-jarvis-open]"), panel = $("[data-jarvis]");
  if (!fab || !panel) return;
  const log = $(".log", panel), form = $("form", panel), input = $("input", form);
  const PHONE = "+12257470303";
  const ENDPOINT = window.HB_JARVIS_ENDPOINT || null;
  const FACTS = [
    { q: /(who|what) (is|are) (you|caleb)|about caleb|tell me about/i, a: "Caleb Jackson is a REALTOR with Keller Williams First Choice, born in Baton Rouge, working Zachary, Baton Rouge, St. Francisville, New Roads and the Felicianas. 81 closed deals and $25.1M in sales since 2022, 27 in the last 12 months.", src: "About page, numbers user-confirmed from the MLS export of Oct 7, 2026" },
    { q: /zachary/i, a: "Zachary is Caleb's home base: 15 closings there across 13 neighborhoods, including Copper Mill, Ravenwood and Marita Terrace. Zachary Community Schools scored 94.3 on the 2025 state performance score, an A.", src: "MLS export Oct 7, 2026; Louisiana Department of Education 2025 scores" },
    { q: /office|address|where (are|is) (you|caleb|the office)/i, a: "Keller Williams First Choice, 17111 Commerce Centre Drive, Prairieville, LA 70769. Caleb works the whole north side of the river from there.", src: "Keller Williams First Choice" },
    { q: /phone|number|call|text/i, a: "Text or call (225) 747-0303. Caleb returns calls the same day.", src: "calebjackson.org" },
    { q: /net sheet|walk away|proceeds|what (would|could) i (keep|get)/i, a: "The seller net sheet is on this site and already shows a worked example. Change the price and payoff to yours.", src: "Seller net sheet", go: "net-sheet.html" },
    { q: /payment|mortgage|monthly|afford/i, a: "The payment tool shows a monthly number the moment it opens. Slide the price, down payment and rate to yours, then add taxes and insurance.", src: "Payment tool", go: "payment.html" },
    { q: /flood|zone|fema|water/i, a: "Type an address into the flood tool and it reads FEMA's flood layer for that point in about five seconds. It is a screening, not a determination.", src: "Flood tool", go: "flood.html" },
    { q: /insurance (cost|price|premium|quote)|how much (is|does) insurance/i, hold: "Insurance pricing is one Caleb answers himself, with a real quote, because the number depends on the roof, the elevation and the carrier. Text him the address." },
    { q: /negotiat|offer (price|strategy)|lowball|how much (should|to) offer/i, hold: "Negotiation strategy comes from Caleb, not from a model. Text him what you're looking at." },
    { q: /legal|lawyer|contract (question|advice)|tax advice|deduct/i, hold: "Legal and tax advice go to a professional. Caleb can point you to one he trusts." },
    { q: /who lives|neighbors|demographic|what kind of people/i, decline: "That is not a question this site answers. Fair housing applies to everyone, including software." },
    { q: /hurricane|storm/i, a: "Baton Rouge's hurricane problem is wind, trees and power, not surge. Gustav in 2008 left parts of the parish without power for weeks. Ask about roof age and the FORTIFIED discount, which every Louisiana insurer must offer by January 1, 2027.", src: "Louisiana Department of Insurance Regulation 136; NPR coverage of Gustav" },
    { q: /homestead|property tax/i, a: "The homestead exemption covers the first $75,000 of market value on parish taxes, not city taxes or fees. Open rolls run 15 days between August 15 and September 15 each year, and that is your appeal window.", src: "East Baton Rouge Parish Assessor" },
  ];
  function add(cls, html) { const m = document.createElement("div"); m.className = "msg " + cls; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function esc(s) { return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function handoff(q) { return `<a class="textlink" href="sms:${PHONE}?&body=${encodeURIComponent("Hey Caleb, I asked your site: " + q)}">Text it to Caleb</a>`; }
  async function localEngine(q) {
    const addr = (q.match(/\d{2,6}\s+[A-Za-z0-9.'\s]+(?:\b(?:rd|road|st|street|dr|drive|ave|avenue|ln|lane|ct|court|blvd|hwy|highway|trace|cir|pl|way)\b)[^,]*(?:,\s*[A-Za-z .]+)?(?:,?\s*LA)?(?:\s*\d{5})?/i) || [])[0];
    if (addr && /flood|zone|water|insurance/i.test(q) && window.HBFlood) {
      const r = await window.HBFlood.lookup(/\bLA\b/i.test(addr) ? addr : addr + ", LA");
      if (r.state === "ok") { const e = window.HBFlood.explain(r.zones[0] || {}); return { state: "answered", answer: `${r.matched}: FEMA Zone ${e.zone}. ${e.plain}`, src: "FEMA National Flood Hazard Layer, point lookup, screening only" }; }
      return { state: "escalated", reason: "The flood services did not answer from here, so no guess was made." };
    }
    for (const f of FACTS) {
      if (!f.q.test(q)) continue;
      if (f.decline) return { state: "declined", reason: f.decline };
      if (f.hold) return { state: "hold", reason: f.hold };
      return { state: "answered", answer: f.a, src: f.src, go: f.go };
    }
    return { state: "escalated", reason: "No source on file answers that, so nothing was guessed." };
  }
  async function liveEngine(q) {
    const r = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, asked_by: "site" }) });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    const src = (d.evidence || []).filter(e => (d.citations || []).includes(e.id)).map(e => e.label + (e.as_of ? " (" + e.as_of.slice(0, 10) + ")" : "")).join("; ");
    return d.state === "answered" ? { state: "answered", answer: d.answer, src } : { state: d.state === "declined" ? "declined" : "escalated", reason: d.reason };
  }
  async function ask(q) {
    add("me", esc(q)); input.value = "";
    const thinking = add("j", "<span class=small>Checking sources…</span>");
    let r; try { r = await (ENDPOINT ? liveEngine(q) : localEngine(q)); } catch (e) { r = { state: "escalated", reason: "The answer service did not respond, so nothing was guessed." }; }
    thinking.remove();
    if (r.state === "answered") add("j", `${esc(r.answer)}${r.go ? ` <a class="textlink" href="${r.go}">Open it</a>` : ""}<span class="src">Source: ${esc(r.src || "on file")}</span>`);
    else if (r.state === "declined") add("j hold", `${esc(r.reason)}`);
    else add("j hold", `${esc(r.reason)} It goes to Caleb, in his words, not a guess. ${handoff(q)}<span class="src">Nothing is sent until you tap it.</span>`);
  }
  fab.addEventListener("click", () => { panel.classList.add("open"); panel.removeAttribute("aria-hidden"); if (!log.children.length) add("j", `Ask about any property, about Caleb, or how to use this site. I answer only when a source on file backs it. Anything else goes to Caleb himself.<span class="src">${ENDPOINT ? "Connected to AIRE" : "Local answers only on this preview; the live site connects to Jarvis in AIRE"}</span>`); setTimeout(() => input.focus(), 400); });
  $("[data-jarvis-close]", panel).addEventListener("click", () => { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); fab.focus(); });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") $("[data-jarvis-close]", panel).click(); });
  form.addEventListener("submit", e => { e.preventDefault(); const q = input.value.trim(); if (q) ask(q); });
  panel.querySelectorAll(".starters button").forEach(b => b.addEventListener("click", () => ask(b.textContent)));
})();
