// "My brief": places, comparisons and sale scenarios a visitor saves while exploring.
// It lives only in this browser. One tap texts it to Caleb; another copies it as a plain summary
// the visitor can paste into any AI assistant they already use. Nothing is sent automatically.
(() => {
  "use strict";
  const KEY = "cj-brief-v1";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = (items) => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} };
  let items = read();

  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "brief-fab"; btn.setAttribute("aria-expanded", "false");
  const panel = document.createElement("section");
  panel.className = "brief-panel"; panel.hidden = true; panel.setAttribute("aria-label", "My brief");
  document.body.append(btn, panel);

  function plain() {
    const when = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return [`My move brief (${when})`, "", ...items.flatMap((i) => [`${i.type}: ${i.title}`, ...i.lines.map((l) => `- ${l}`), ""]),
      "Agent: Caleb Jackson, REALTOR, Keller Williams First Choice, (225) 747-0303"].join("\n");
  }
  function smsBody() {
    return `Hi Caleb, here's what I've been looking at:\n${items.map((i) => `• ${i.type}: ${i.title}${i.lines[0] ? " (" + i.lines[0] + ")" : ""}`).join("\n")}\nCan we talk?`;
  }
  function render() {
    btn.innerHTML = `My brief <b>${items.length}</b>`;
    btn.hidden = !items.length && panel.hidden;
    panel.innerHTML = `<div class="bp-head"><p class="bp-k">My brief</p><button type="button" class="bp-x" aria-label="Close my brief">×</button></div>
      ${items.length ? `<ul class="bp-items">${items.map((i, n) => `<li><span class="bp-t">${esc(i.type)}</span><b>${esc(i.title)}</b>${i.lines.map((l) => `<span>${esc(l)}</span>`).join("")}<button type="button" class="bp-rm" data-rm="${n}" aria-label="Remove ${esc(i.title)}">Remove</button></li>`).join("")}</ul>` : `<p class="bp-empty">Nothing saved yet. Save places from the map, a comparison or a sale scenario.</p>`}
      <div class="bp-actions">
        <a class="act primary" href="sms:+12257470303?&body=${encodeURIComponent(smsBody())}">Text this brief to Caleb</a>
        <button type="button" class="act" data-copy>Copy for an AI assistant</button>
        <button type="button" class="act quiet" data-clear>Clear</button>
      </div>
      <p class="bp-fine" role="status">Saved only in this browser. Texting opens your messaging app, and you decide whether to send. The copy is a plain summary you can paste into the assistant you already use.</p>`;
  }
  btn.addEventListener("click", () => { panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", String(!panel.hidden)); render(); });
  panel.addEventListener("click", async (e) => {
    if (e.target.closest(".bp-x")) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); render(); btn.focus(); return; }
    const rm = e.target.closest("[data-rm]");
    if (rm) { items.splice(+rm.dataset.rm, 1); write(items); render(); return; }
    if (e.target.closest("[data-clear]")) { items = []; write(items); render(); return; }
    if (e.target.closest("[data-copy]")) {
      const text = plain() + "\n\nPlease help me think through these: what should I verify, what questions should I ask, and what are the tradeoffs?";
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch {}
      panel.querySelector(".bp-fine").textContent = ok ? "Copied. Paste it into your assistant, then text Caleb when you’re ready." : text;
    }
  });
  window.Brief = {
    add(item) {
      items = items.filter((i) => i.id !== item.id).concat([{ ...item, lines: item.lines || [] }]).slice(-12);
      write(items); render();
      btn.hidden = false; btn.classList.remove("pulse"); void btn.offsetWidth; btn.classList.add("pulse");
    },
    count: () => items.length,
  };
  render();
})();
