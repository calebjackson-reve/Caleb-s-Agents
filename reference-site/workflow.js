(() => {
  const cards = [...document.querySelectorAll(".workflow-card")],
    grid = document.querySelector(".workflow-grid");
  if (!cards.length) return;
  let frame = 0;
  function set(card) {
    cards.forEach((c) => c.classList.toggle("active", c === card));
    // The pinned visual follows the step being read.
    if (grid) grid.dataset.active = card.id;
  }
  function update() {
    frame = 0;
    const center = innerHeight * 0.45;
    set(
      cards.reduce(
        (best, c) =>
          Math.abs(c.getBoundingClientRect().top + c.offsetHeight / 2 - center) <
          Math.abs(best.getBoundingClientRect().top + best.offsetHeight / 2 - center)
            ? c
            : best,
        cards[0],
      ),
    );
  }
  addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  cards.forEach((c) => c.addEventListener("focusin", () => set(c)));
  addEventListener("resize", update);
  update();
})();
