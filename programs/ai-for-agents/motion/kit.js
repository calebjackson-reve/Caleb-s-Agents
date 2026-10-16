/* Caleb Jackson motion kit. Builds one paused GSAP timeline from a scene list so the
   renderer can seek any frame and get the same picture every time.

   window.KIT_DATA = { look: "ivory"|"ink"|"grid", chrome: "AI for Agents · Lesson 1",
                       flag: "Fictional data", scenes: [ { type, dur, face: "none"|"pip"|"full"|"talk", ...data } ] }
   Text fields take *word* for the one ember accent in a view.
   text: "blur"|"mask"|"sweep" picks how headings come in, at the top level or per scene. */
(function () {
  const E = "power3.out", SOFT = "power2.inOut";
  const ICONS = {
    chat: '<path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 4V8a2 2 0 0 1 2-2z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    heart: '<path d="M12 20s-7-4.5-8.5-9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 4C19 15.5 12 20 12 20z"/>',
    wrench: '<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3 6.7 20l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    check: '<path d="M5 12l4.5 4.5L19 7"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z"/>',
  };
  const icon = (n) => `<div class="icon"><svg viewBox="0 0 24 24">${ICONS[n] || ICONS.spark}</svg></div>`;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const accent = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
  // words wrapped for staggered rises; an *accent* run stays one unit
  const words = (s) => accent(s).replace(/<em>(.*?)<\/em>/g, (m) => m.replace(/ /g, "\u00a0"))
    .split(/\s+/).filter(Boolean).map((x) => `<span class="w">${x.replace(/\u00a0/g, " ")}</span>`).join(" ");
  const label = (s) => (s ? `<div class="label kicker">${esc(s)}</div>` : "");
  const initials = (n) => esc(n).split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  // How headings come in. Set per scene with "text", or for the whole video at the top level.
  //   blur  (default) words rise out of a blur
  //   mask  Motion Kit heading rise: each word slides up out of its own mask, no fade-through-blur
  //   sweep Motion Kit word sweep: each word fades in through ember, then settles on its own color
  let MODE = "blur";
  function headIn(tl, root, at = 0) {
    const ws = root.querySelectorAll(".h1 .w, .h2 .w");
    let st = 0.06;
    if (MODE === "mask") {
      ws.forEach((w) => { const m = document.createElement("span"); m.className = "wm"; w.replaceWith(m); m.appendChild(w); });
      st = 0.05;
      tl.from(ws, { yPercent: 105, duration: 0.8, ease: "power2.out", stagger: st }, at);
    } else if (MODE === "sweep") {
      const ember = getComputedStyle(document.body).getPropertyValue("--ember").trim() || "#E87757";
      st = 0.08;
      root.classList.add("sw");
      ws.forEach((w, i) => {
        const em = w.querySelector("em");
        const end = em ? ember : getComputedStyle(w).color;
        tl.fromTo(w, { color: "rgba(0,0,0,0)" }, { keyframes: { color: ["rgba(0,0,0,0)", ember, end], easeEach: "power2.in" },
          ease: "power1.out", duration: 1, immediateRender: true }, at + i * st);
      });
    } else {
      tl.from(ws, { yPercent: 60, opacity: 0, filter: "blur(10px)", duration: 0.7, ease: E, stagger: st }, at);
    }
    const k = root.querySelector(".kicker");
    if (k) tl.from(k, { opacity: 0, x: -16, duration: 0.5, ease: E }, at);
    return at + 0.25 + ws.length * st;
  }
  const rise = (tl, els, at, st = 0.12) =>
    tl.from(els, { y: 50, opacity: 0, scale: 0.98, duration: 0.7, ease: E, stagger: st }, at);
  const typeText = (tl, el, text, at, cps = 38) => {
    const o = { n: 0 }, full = String(text);
    el.textContent = "";
    tl.to(o, { n: full.length, duration: full.length / cps, ease: "none",
      onUpdate: () => { el.textContent = full.slice(0, Math.round(o.n)); } }, at);
    return at + full.length / cps;
  };
  const countUp = (tl, el, to, at, dur = 1.2, fmt = (v) => Math.round(v).toLocaleString("en-US")) => {
    const o = { v: 0 }, pre = el.dataset.pre || "", suf = el.dataset.suf || "";
    el.textContent = pre + fmt(0) + suf;
    tl.to(o, { v: to, duration: dur, ease: "power2.out", onUpdate: () => { el.textContent = pre + fmt(o.v) + suf; } }, at);
  };

  const S = {};

  S.title = (d) => ({
    html: `<div class="title">${label(d.kicker)}<div class="h1">${words(d.title)}</div>
      <div class="rule"></div>${d.sub ? `<div class="sub">${accent(d.sub)}</div>` : ""}
      ${d.tags ? `<div class="tags" style="margin-top:34px">${d.tags.map((t, i) => `<span class="pill ${i === 0 && d.tagAccent ? "ember" : ""}">${esc(t)}</span>`).join("")}</div>` : ""}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      tl.from(r.querySelector(".rule"), { scaleX: 0, duration: 0.8, ease: SOFT }, t);
      if (r.querySelector(".sub")) tl.from(r.querySelector(".sub"), { opacity: 0, y: 20, duration: 0.6, ease: E }, t + 0.2);
      if (r.querySelector(".tags")) rise(tl, r.querySelectorAll(".tags .pill"), t + 0.4, 0.1);
    },
  });

  S.cards = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="cards">${d.cards.map((c) =>
      `<div class="card">${icon(c.icon)}<div class="t">${accent(c.t)}</div><div class="d">${accent(c.d || "")}</div>${c.tag ? `<span class="pill tag ${c.hi ? "ember" : ""}">${esc(c.tag)}</span>` : ""}</div>`).join("")}</div>`,
    anim(tl, r) { const t = headIn(tl, r); rise(tl, r.querySelectorAll(".card"), t, d.stagger || 0.18);
      tl.from(r.querySelectorAll(".card .tag"), { scale: 0.6, opacity: 0, duration: 0.45, ease: "back.out(2)", stagger: 0.18 }, t + 0.6); },
  });

  // text threads: bubbles land one by one, then a who's-who tag drops on each thread
  S.thread = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="threads">${d.threads.map((th) =>
      `<div class="card thread"><div class="who"><div class="avatar">${initials(th.name)}</div><div><div class="n">${esc(th.name)}</div><div class="r">${esc(th.role || "")}</div></div></div>
       ${th.msgs.map((m) => `<div class="bubble ${m.me ? "me" : "them"}">${accent(m.t)}</div>`).join("")}
       ${th.tag ? `<span class="pill stamp ${th.hi ? "ember" : ""}">${esc(th.tag)}</span>` : ""}</div>`).join("")}</div>`,
    anim(tl, r) {
      let t = headIn(tl, r);
      const ths = r.querySelectorAll(".thread");
      rise(tl, ths, t, 0.15);
      t += 0.5;
      ths.forEach((th, i) => {
        th.querySelectorAll(".bubble").forEach((b, j) => {
          tl.from(b, { opacity: 0, y: 24, scale: 0.92, transformOrigin: b.classList.contains("me") ? "right bottom" : "left bottom", duration: 0.45, ease: "back.out(1.6)" }, t);
          t += d.gap || 0.55;
        });
      });
      const at = d.tagAt != null ? d.tagAt : t + 0.2;
      tl.from(r.querySelectorAll(".stamp"), { y: -60, opacity: 0, rotation: -8, duration: 0.55, ease: "back.out(2.2)", stagger: d.tagStagger || 0.35 }, at);
      if (d.dimNonHi) tl.to(r.querySelectorAll(".thread:not(:has(.stamp.ember))"), { opacity: 0.45, duration: 0.5 }, at + 1.2);
    },
  });

  S.prompt = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="card prompt">
      <div class="bar"><span class="label">${esc(d.boxLabel || "Draft reply")}</span>${d.pill ? `<span class="pill ghost">${esc(d.pill)}</span>` : ""}</div>
      <div class="txt"><span class="typed"></span><span class="caret"></span></div>
      ${d.approve ? `<div class="approve"><span class="btn">Edit</span><span class="btn go">Approve and send</span><span class="label" style="margin-left:18px">${esc(d.approve)}</span></div>` : ""}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      rise(tl, r.querySelector(".prompt"), t);
      const end = typeText(tl, r.querySelector(".typed"), d.text, t + 0.6, d.cps || 40);
      tl.to(r.querySelector(".caret"), { opacity: 0, duration: 0.01, repeat: Math.max(1, Math.round((d.dur - t) * 1.6)), yoyo: true, repeatDelay: 0.3 }, t + 0.4);
      if (d.approve) {
        rise(tl, r.querySelectorAll(".approve > *"), end + 0.3, 0.1);
        tl.to(r.querySelector(".btn.go"), { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1 }, end + 1.3);
      }
    },
  });

  // a record card: the fields fill in, the quote gets a highlighter pass
  S.record = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="card record">
      <div class="top"><span class="n">${esc(d.name)}</span><span class="pill ${d.badgeHi ? "ember" : ""}">${esc(d.badge || "Record")}</span></div>
      ${d.fields.map((f) => `<div class="field ${f.next ? "next" : ""}"><span class="k">${esc(f.k)}</span><span class="v ${f.quote ? "quote" : ""}">${f.quote ? `<span class="mark">“${esc(f.v)}”</span>` : accent(f.v)}</span></div>`).join("")}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      rise(tl, r.querySelector(".record"), t);
      const fs = r.querySelectorAll(".field");
      fs.forEach((f, i) => {
        const at = (d.fieldAt && d.fieldAt[i] != null) ? d.fieldAt[i] : t + 0.5 + i * (d.fieldGap || 0.5);
        tl.from(f.querySelector(".v"), { opacity: 0, x: 24, duration: 0.5, ease: E }, at);
        tl.from(f.querySelector(".k"), { opacity: 0, duration: 0.4 }, at);
        const m = f.querySelector(".mark");
        if (m) tl.to(m, { backgroundSize: "100% 100%", duration: 0.9, ease: SOFT }, at + 0.5);
      });
    },
  });

  S.chips = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="chips">${d.chips.map((c) =>
      `<div class="card chip"><div class="num" data-pre="${esc(c.pre || "")}" data-suf="${esc(c.suf || "")}" ${c.hi ? 'style="color:var(--ember)"' : ""}>0</div><div class="lab">${accent(c.lab)}</div></div>`).join("")}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      rise(tl, r.querySelectorAll(".chip"), t, 0.15);
      r.querySelectorAll(".num").forEach((n, i) => {
        const v = d.chips[i].v, dec = String(v).includes(".") ? 1 : 0;
        countUp(tl, n, v, t + 0.3 + i * 0.15, 1.3, (x) => x.toFixed(dec));
      });
    },
  });

  S.chart = (d) => {
    const max = Math.max(...d.bars.map((b) => b.v));
    return {
      html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="chart">${d.bars.map((b) =>
        `<div class="bar-col ${b.hi ? "hi" : ""}"><span class="v" data-suf="${esc(d.suf || "")}">0</span><div class="b" style="height:${(b.v / max) * 82}%"></div></div>`).join("")}</div>
        <div class="bar-x">${d.bars.map((b) => `<span>${esc(b.x)}</span>`).join("")}</div>${d.source ? `<div class="label" style="margin-top:26px">${esc(d.source)}</div>` : ""}`,
      anim(tl, r) {
        const t = headIn(tl, r);
        tl.from(r.querySelectorAll(".bar-col .b"), { scaleY: 0, duration: 0.9, ease: E, stagger: 0.12 }, t);
        r.querySelectorAll(".bar-col .v").forEach((v, i) => countUp(tl, v, d.bars[i].v, t + i * 0.12, 0.9));
      },
    };
  };

  S.flow = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="flow">${d.nodes.map((n, i) =>
      `${i ? '<div class="link"></div>' : ""}<div class="card node ${n.hi ? "hi" : ""}">${icon(n.icon)}<div class="t">${accent(n.t)}</div>${n.d ? `<div class="d">${accent(n.d)}</div>` : ""}</div>`).join("")}</div>`,
    anim(tl, r) {
      let t = headIn(tl, r);
      const nodes = r.querySelectorAll(".node"), links = r.querySelectorAll(".link");
      nodes.forEach((n, i) => {
        if (i) { tl.from(links[i - 1], { scaleX: 0, duration: 0.45, ease: SOFT }, t); t += 0.35; }
        tl.from(n, { opacity: 0, y: 30, scale: 0.94, duration: 0.6, ease: "back.out(1.4)" }, t);
        t += d.step || 0.6;
      });
    },
  });

  S.beforeafter = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="ba">
      <div class="card before"><span class="label">${esc(d.beforeLabel || "Without a plan")}</span>${d.before.map((x) => `<div class="li">${esc(x)}</div>`).join("")}</div>
      <div class="card after"><span class="label" style="color:var(--ember)">${esc(d.afterLabel || "With a plan")}</span>${d.after.map((x) => `<div class="li">${accent(x)}</div>`).join("")}</div></div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      rise(tl, r.querySelector(".before"), t);
      rise(tl, r.querySelectorAll(".before .li"), t + 0.3, 0.15);
      const a = d.afterAt != null ? d.afterAt : t + 1.6;
      rise(tl, r.querySelector(".after"), a);
      rise(tl, r.querySelectorAll(".after .li"), a + 0.3, 0.18);
    },
  });

  S.checklist = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="checks">${d.items.map((x) =>
      `<div class="card check"><div class="box"><div class="fill"></div><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><div class="t">${accent(x)}</div></div>`).join("")}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      const cs = r.querySelectorAll(".check");
      rise(tl, cs, t, 0.12);
      cs.forEach((c, i) => {
        const at = (d.checkAt && d.checkAt[i] != null) ? d.checkAt[i] : t + 0.8 + i * (d.step || 0.6);
        tl.from(c.querySelector(".fill"), { scale: 0, duration: 0.3, ease: "back.out(2)" }, at);
        tl.to(c.querySelector("svg"), { strokeDashoffset: 0, duration: 0.35, ease: SOFT }, at + 0.1);
      });
    },
  });

  S.phone = (d) => ({
    html: `<div class="phone-wrap"><div class="phone"><div class="screen"><div class="hd">${esc(d.app || "Messages")}</div>${d.rows.map((x) =>
      `<div class="row"><div class="avatar">${initials(x.n)}</div><div><div class="n">${esc(x.n)}</div><div class="p">${esc(x.p)}</div></div>${x.tag ? `<span class="tg ${x.hi ? "ember" : ""}">${esc(x.tag)}</span>` : ""}</div>`).join("")}</div></div>
      <div>${label(d.kicker)}<div class="h2">${words(d.title)}</div>${d.sub ? `<div class="sub" style="margin-top:30px">${accent(d.sub)}</div>` : ""}</div></div>`,
    anim(tl, r) {
      tl.from(r.querySelector(".phone"), { y: 120, opacity: 0, rotation: -3, duration: 0.9, ease: E }, 0);
      rise(tl, r.querySelectorAll(".row"), 0.5, 0.1);
      const t = headIn(tl, r, 0.3);
      tl.from(r.querySelectorAll(".tg"), { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2.4)", stagger: 0.22 }, d.tagAt != null ? d.tagAt : t + 0.8);
      if (r.querySelector(".sub")) tl.from(r.querySelector(".sub"), { opacity: 0, y: 20, duration: 0.6 }, t + 0.3);
    },
  });

  // who's who: names fly into five buckets
  S.sort = (d) => ({
    html: `${label(d.kicker)}<div class="h2">${words(d.title)}</div><div class="sort">${d.buckets.map((b) =>
      `<div class="card bucket ${b.hi ? "hi" : ""}"><div class="bh"><span>${esc(b.name)}</span>${icon(b.icon).replace('class="icon"', 'class="icon" style="width:48px;height:48px;border-radius:14px"')}</div>
       ${(b.items || []).map((x) => `<div class="mini"><div class="avatar">${initials(x)}</div>${esc(x)}</div>`).join("")}</div>`).join("")}</div>`,
    anim(tl, r) {
      const t = headIn(tl, r);
      rise(tl, r.querySelectorAll(".bucket"), t, 0.08);
      tl.from(r.querySelectorAll(".mini"), { y: -220, opacity: 0, rotation: () => gsap.utils.random(-10, 10, 1), duration: 0.6, ease: "back.out(1.3)", stagger: d.stagger || 0.22 }, t + 0.7);
    },
  });

  // full face: headline left, portrait video card right (the compositor fills .faceslot)
  S.face = (d) => ({
    html: `<div class="facewrap"><div>${label(d.kicker)}<div class="h1">${words(d.title)}</div>${d.sub ? `<div class="sub" style="margin-top:36px">${accent(d.sub)}</div>` : ""}</div><div class="faceslot"></div></div>`,
    anim(tl, r) {
      tl.from(r.querySelector(".faceslot"), { opacity: 0, scale: 0.96, duration: 0.5, ease: E }, 0);
      const t = headIn(tl, r, d.textAt || 0.2);
      if (r.querySelector(".sub")) tl.from(r.querySelector(".sub"), { opacity: 0, y: 20, duration: 0.6 }, t + 0.2);
    },
  });

  // talking head, full frame (Nate-style): the compositor keys out the green and puts his face under it.
  // Only keyword pills show, popping in at "at" seconds: pills: [ { t: "Your *CRM*", at: 1.2 } ]
  S.talk = (d) => ({
    html: `<div class="talk">${(d.pills || []).map((p) => `<span class="kw${p.hi ? " hi" : ""}">${accent(p.t)}</span>`).join("")}</div>`,
    anim(tl, r) {
      r.querySelectorAll(".kw").forEach((el, k) => {
        tl.from(el, { scale: 0.6, opacity: 0, y: 30, duration: 0.45, ease: "back.out(1.8)" }, (d.pills[k].at ?? 0.3 + k * 0.6));
      });
    },
  });

  // one big line that lights up word by word as he says it (Motion Kit's scroll-scrubbed text,
  // driven by his voice instead of the scroll). text is optional: without it the scene shows his own words.
  // { type: "statement", kicker: "The gap", text: "Most agents have *tried* AI. Almost none *use* it." }
  S.statement = (d) => ({
    html: `<div class="statement">${label(d.kicker)}<div class="said">${words(d.text || "")}</div></div>`,
    anim(tl, r, ctx) {
      const box = r.querySelector(".said");
      let said = (ctx.spoken || []);
      if (!d.text) { box.innerHTML = said.map((w) => `<span class="w">${esc(w.w)}</span>`).join(" "); }
      const ws = [...box.querySelectorAll(".w")];
      const k = r.querySelector(".kicker");
      if (k) tl.from(k, { opacity: 0, x: -16, duration: 0.5, ease: E }, 0);
      const muted = getComputedStyle(box).getPropertyValue("--said-muted").trim();
      const ember = getComputedStyle(document.body).getPropertyValue("--ember").trim() || "#E87757";
      ws.forEach((w, i) => {
        const end = w.querySelector("em") ? ember : getComputedStyle(w).color;
        let at = 0.2 + i * Math.max(0.12, (ctx.dur * 0.8) / Math.max(ws.length, 1));
        if (said.length) at = Math.max(0, said[Math.min(said.length - 1, Math.floor(i * said.length / ws.length))].s - ctx.start);
        tl.fromTo(w, { color: muted }, { color: end, duration: 0.3, ease: "none", immediateRender: true }, at);
      });
    },
  });

  // burned-in captions: his words in short lines, the word he's saying lights up
  function captions(stage, tl, ws) {
    const box = document.createElement("div");
    box.className = "caps";
    stage.appendChild(box);
    stage.classList.add("has-caps");
    const lines = [];
    let cur = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const next = ws[i + 1];
      if (!next || cur.length >= 5 || /[.?!,]$/.test(w.w) || next.s - w.e > 0.35) { lines.push(cur); cur = []; }
    });
    lines.forEach((ln, k) => {
      const el = document.createElement("div");
      el.className = "cap";
      el.innerHTML = ln.map((w) => `<span>${esc(w.w)}</span>`).join(" ");
      box.appendChild(el);
      const end = k + 1 < lines.length ? Math.min(lines[k + 1][0].s, ln[ln.length - 1].e + 0.6) : ln[ln.length - 1].e + 0.6;
      tl.set(el, { visibility: "visible" }, ln[0].s);
      tl.set(el, { visibility: "hidden" }, end);
      el.querySelectorAll("span").forEach((sp, j) => {
        tl.set(sp, { color: "#E87757" }, ln[j].s);
        tl.set(sp, { color: "#FBF8F3" }, ln[j].e);
      });
    });
  }

  function build(data) {
    document.body.className = "look-" + (data.look || "ivory");
    const stage = document.querySelector(".stage");
    stage.innerHTML = (data.chrome ? `<div class="chrome"><span class="dot"></span>${esc(data.chrome)}</div>` : "") +
      (data.flag ? `<div class="flag">${esc(data.flag)}</div>` : "") + `<div class="pipslot"></div>`;
    const tl = gsap.timeline({ paused: true });
    const pip = stage.querySelector(".pipslot");
    const marks = [];
    let t = 0;
    data.scenes.forEach((sc, i) => {
      const make = S[sc.type];
      if (!make) throw new Error("unknown scene type " + sc.type);
      const el = document.createElement("section");
      el.className = "scene s-" + sc.type;
      const built = make(sc);
      el.innerHTML = built.html;
      if (sc.face === "pip") el.style.paddingRight = "460px";
      stage.appendChild(el);
      const local = gsap.timeline();
      MODE = sc.text || data.text || "blur";
      const spoken = (data.captions || []).filter((w) => w.s >= t && w.s < t + sc.dur);
      built.anim(local, el, { start: t, dur: sc.dur, spoken });
      const start = t, end = t + sc.dur;
      tl.set(el, { visibility: "visible" }, start);
      tl.add(local, start + 0.05);
      if (i < data.scenes.length - 1) {
        tl.to(el, { opacity: 0, y: -24, duration: 0.3, ease: "power2.in" }, end - 0.3);
        tl.set(el, { visibility: "hidden" }, end);
      }
      if (sc.face === "talk") {
        const chrome = stage.querySelector(".chrome");
        tl.set(stage, { backgroundColor: "#00FF00", backgroundImage: "none" }, start);
        tl.set(stage, { backgroundColor: "", backgroundImage: "" }, end);
        if (chrome) { tl.set(chrome, { autoAlpha: 0 }, start); tl.set(chrome, { autoAlpha: 1 }, end); }
      }
      if (sc.face === "pip") {
        tl.set(pip, { visibility: "visible" }, start);
        tl.set(pip, { visibility: "hidden" }, end);
      }
      marks.push({ i, type: sc.type, face: sc.face || "none", start, end });
      t = end;
    });
    if (Array.isArray(data.captions) && data.captions.length && data.caption_box !== false) captions(stage, tl, data.captions);
    // Motion Kit's pulsing accent square, on the chrome dot
    const dot = stage.querySelector(".chrome .dot");
    if (dot && t > 2) tl.to(dot, { opacity: 0.2, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: Math.floor(t / 0.9) - 1 }, 0);
    tl.set({}, {}, t); // pad to full length
    window.KIT = { tl, duration: t, marks, seek: (s) => { tl.time(Math.min(s, t), false); },
      slot: () => { const f = document.querySelector(".scene[style*='visible'] .faceslot"); return f && f.getBoundingClientRect(); } };
    return window.KIT;
  }

  window.KITBUILD = build;
})();
