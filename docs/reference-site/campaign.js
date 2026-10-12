(() => {
  const home = document.querySelector("#visit-home"),
    items = [...document.querySelectorAll(".visit-planner input")],
    list = document.querySelector("#visit-questions");
  let text = "";
  function update() {
    const selected = items.filter((i) => i.checked).map((i) => i.value);
    document.querySelector("#visit-title").textContent = home.value;
    list.replaceChildren(
      ...(selected.length ? selected : ["Choose at least one priority to create your checklist."]).map(
        (t) => {
          const li = document.createElement("li");
          li.textContent = t;
          return li;
        },
      ),
    );
    text =
      home.value +
      " — MY SHOWING CHECKLIST\n\n" +
      selected.map((t) => "• " + t).join("\n") +
      "\n\nCaleb Jackson · (225) 747-0303";
    document.querySelector("#save-visit").disabled = !selected.length;
    document.querySelector("#text-visit").href =
      "sms:+12257470303?&body=" +
      encodeURIComponent(
        "Hi Caleb, I would like to discuss " + home.value + ". My questions: " + selected.join(" "),
      );
  }
  home.addEventListener("change", update);
  items.forEach((i) => i.addEventListener("change", update));
  document.querySelector("#save-visit").addEventListener("click", () => {
    const a = document.createElement("a"),
      u = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.href = u;
    a.download = "showing-checklist.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  });
  update();
})();
