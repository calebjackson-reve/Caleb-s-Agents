(() => {
  const menu = document.querySelector(".menu-toggle"),
    nav = document.querySelector("#site-nav");
  menu?.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", open);
    nav.classList.toggle("open", open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("open")) {
      nav.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
      menu.focus();
    }
  });
})();
(() => {
  // Tuck the sticky header while scrolling down; bring it back on scroll up.
  const header = document.querySelector(".site-header");
  if (!header) return;
  let last = scrollY,
    frame = 0;
  const update = () => {
    frame = 0;
    const y = scrollY,
      goingDown = y > last + 4,
      goingUp = y < last - 4;
    if (y < 200 || goingUp) header.classList.remove("tucked");
    else if (goingDown) header.classList.add("tucked");
    if (goingDown || goingUp) last = y;
  };
  addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
})();
(() => {
  // Motion with a job: reveal content in reading order and open answers smoothly.
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm || !("IntersectionObserver" in window)) return;

  // 1. Sections settle into place once, as they enter. Nothing is hidden without JS.
  const targets = document.querySelectorAll(
    ".door, .intro-line > *, .editorial-row > *, .secondary-property > *, .photo-pair picture, .film-section > div, .facts > div, .notes-grid > div, .questions details, .workflow-heading",
  );
  if (targets.length) {
    document.documentElement.classList.add("reveal-ready");
    const seen = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("revealed");
          seen.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el, i) => {
      // Siblings arrive in sequence so the eye reads them in order.
      const index = [...el.parentElement.children].indexOf(el);
      el.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 70}ms`);
      el.classList.add("reveal");
      seen.observe(el);
    });
  }

  // 2. Q&A: animate the answer's height instead of snapping open.
  document.querySelectorAll(".questions details").forEach((d) => {
    const summary = d.querySelector("summary");
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      const start = d.offsetHeight;
      if (d.open) {
        const end = summary.offsetHeight + parseFloat(getComputedStyle(d).paddingTop) * 2;
        d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 260, easing: "ease-out" }).onfinish = () =>
          d.removeAttribute("open");
      } else {
        d.setAttribute("open", "");
        const end = d.offsetHeight;
        d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    });
  });
})();
(() => {
  // Embed mode (?embed=1): for placing a tool inside a Luxury Presence page with an iframe.
  // Hides this site's own header and footer, opens links in the parent page, and reports height.
  if (new URLSearchParams(location.search).get("embed") !== "1") return;
  document.documentElement.classList.add("embed");
  document.querySelectorAll('a[href]:not([href^="#"])').forEach((a) => (a.target = "_top"));
  if (window.parent === window || !("ResizeObserver" in window)) return;
  let last = 0;
  new ResizeObserver(() => {
    const h = Math.ceil(document.documentElement.scrollHeight);
    if (h !== last) {
      last = h;
      window.parent.postMessage({ type: "cj-tool-height", height: h }, "*");
    }
  }).observe(document.body);
})();
