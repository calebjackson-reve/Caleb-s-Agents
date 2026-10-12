(() => {
  "use strict";
  const defs = {
    buyer: [
      ["price", "Purchase price ($)", 350000, "A price to explore, not a valuation."],
      ["down", "Down payment ($)", 70000, "Dollar amount. Fees and prepaids are separate."],
      ["rate", "Annual interest rate (%)", 6.5, "Fictional example. Replace with a lender quote."],
      ["years", "Loan term (whole years)", 30, "Fixed-rate amortizing loan, 1–50 whole years."],
      [
        "tax",
        "Annual property taxes ($)",
        2400,
        "Verify for this property and your ownership. Exemptions are not assumed.",
      ],
      [
        "insurance",
        "Annual home + flood insurance ($)",
        3600,
        "Combined example only. Ask for address-specific quotes.",
      ],
      ["hoa", "Monthly HOA dues ($)", 0, "Zero is illustrative. Confirm association documents."],
      [
        "mi",
        "Monthly mortgage insurance ($)",
        0,
        "Not automatically calculated. Obtain your lender’s figure.",
      ],
      [
        "maintenance",
        "Monthly maintenance reserve ($)",
        200,
        "An editable planning allowance, not a property estimate.",
      ],
      [
        "closing",
        "Loan + settlement fees ($)",
        7000,
        "Exclude down payment and prepaids. Enter actual quoted fees.",
      ],
      [
        "prepaids",
        "Prepaids + initial escrow ($)",
        3000,
        "Keep separate from fees. Confirm on the lender statement.",
      ],
      [
        "credits",
        "Approved seller/lender credits ($)",
        0,
        "Subject to loan and contract limits. No eligibility assumed.",
      ],
      [
        "deposit",
        "Earnest money already paid ($)",
        5000,
        "Reduces cash still due, not total acquisition cost.",
      ],
    ],
    seller: [
      ["price", "Sale price to test ($)", 350000, "Hypothetical, not an appraisal or valuation."],
      [
        "payoff",
        "Mortgage + lien payoff ($)",
        220000,
        "Use a current payoff statement, including applicable interest and fees.",
      ],
      [
        "fees",
        "Negotiated selling fees (%)",
        5,
        "Illustrative percentage only. Compensation is negotiable. This is not a standard or a quote.",
      ],
      [
        "closing",
        "Other settlement costs ($)",
        3000,
        "Include applicable title, prorations and other charges. Avoid duplicating percentage fees.",
      ],
      ["credits", "Buyer credits ($)", 5000, "Contractual credits or concessions."],
      [
        "repairs",
        "Preparation + repair budget ($)",
        2000,
        "Costs outside closing. Do not count the same repair in buyer credits.",
      ],
      ["moving", "Moving + transition budget ($)", 1500, "Your allowance for the next move."],
    ],
  };
  const states = {},
    money = (n) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
        n,
      );
  let mode = location.hash === "#seller" ? "seller" : "buyer",
    last;
  const $ = (id) => document.getElementById(id);
  function seed(which, price = 350000) {
    const v = Object.fromEntries(defs[which].map((d) => [d[0], d[2]]));
    v.price = price;
    if (which === "buyer") v.down = price * 0.2;
    states[which] = { v, edited: new Set(), example: true };
  }
  seed("buyer");
  seed("seller");
  function field(d) {
    const [id, label, , help] = d,
      s = states[mode];
    return `<div class="planning-field"><label for="f-${id}">${label}<small id="flag-${id}">${s.edited.has(id) ? "Your entry" : s.v[id] === "" ? "Required" : "Illustrative"}</small></label><input id="f-${id}" data-field="${id}" type="number" min="${id === "years" ? 1 : 0}" ${id === "years" ? 'max="50"' : ""} step="${id === "years" ? 1 : "any"}" value="${s.v[id]}" aria-describedby="help-${id}"><p class="field-help" id="help-${id}">${help}</p></div>`;
  }
  function render() {
    document
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === mode));
    $("inputs-title").textContent = mode === "buyer" ? "Your buying assumptions" : "Your selling assumptions";
    const split = mode === "buyer" ? 4 : 3;
    $("fields").innerHTML =
      defs[mode].slice(0, split).map(field).join("") +
      `<details class="cost-assumptions" open><summary>${mode === "buyer" ? "Ownership costs & cash to close" : "Settlement & next-move costs"}</summary>${defs[mode].slice(split).map(field).join("")}</details>`;
    document.querySelectorAll("[data-field]").forEach((el) =>
      el.addEventListener("input", () => {
        const s = states[mode];
        s.v[el.dataset.field] = el.value;
        s.edited.add(el.dataset.field);
        s.example = false;
        $("flag-" + el.dataset.field).textContent = el.value === "" ? "Required" : "Your entry";
        calc();
      }),
    );
    $("next-title").textContent =
      mode === "buyer" ? "Turn the estimate into a buying plan." : "Turn the estimate into a selling plan.";
    const steps =
      mode === "buyer"
        ? [
            "Replace the rate, mortgage insurance and closing costs with lender figures.",
            "Get address-specific insurance quotes and verified property taxes.",
            "Keep a reserve beyond cash to close. Compare your complete budget before choosing a home.",
          ]
        : [
            "Request a current mortgage and lien payoff statement.",
            "Confirm negotiated fees, credits and settlement costs with the people handling your sale.",
            "Decide what you need left for repairs, moving and your next home.",
          ];
    $("next-steps").replaceChildren(
      ...steps.map((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        return li;
      }),
    );
    calc();
  }
  function calc() {
    const s = states[mode],
      r = PlanningMath.calculate(mode, s.v);
    last = r;
    $("mobile-result").textContent = r.error
      ? "Complete assumptions · view result ↑"
      : (mode === "buyer" ? "Monthly " : "Closing proceeds ") + money(r.primary) + " · view result ↑";
    $("example-label").textContent = s.example
      ? "Illustrative example · replace before relying on it"
      : `Your scenario · ${defs[mode].filter((d) => !s.edited.has(d[0]) && s.v[d[0]] !== "").length} illustrative assumptions remain`;
    $("result-title").textContent = mode === "buyer" ? "Monthly ownership plan" : "Estimated cash at closing";
    $("save-scenario").disabled = !!r.error;
    if (r.error) {
      $("result").textContent = "—";
      $("breakdown").textContent = r.error;
      $("second-result").textContent = "";
      $("scenario-check").textContent = "";
      $("result-caution").textContent = "";
      return;
    }
    const v = r.v;
    $("result").textContent = money(r.primary);
    $("breakdown").textContent =
      mode === "buyer"
        ? `Loan ${money(r.payment)} + tax ${money(v.tax / 12)} + insurance ${money(v.insurance / 12)} + HOA ${money(v.hoa)} + mortgage insurance ${money(v.mi)} + maintenance ${money(v.maintenance)} per month.`
        : `Sale ${money(v.price)} − payoff ${money(v.payoff)} − selling fees ${money(r.percent)} − settlement costs ${money(v.closing)} − buyer credits ${money(v.credits)}.`;
    $("second-result").innerHTML =
      `<p>${mode === "buyer" ? "Estimated cash still due at closing" : "Left after repairs & moving"}</p><strong>${money(r.secondary)}</strong><p class="fine">${mode === "buyer" ? `Down payment + fees + prepaids − credits − earnest money. ${money(v.deposit)} already paid is separate.` : "Closing proceeds minus your preparation, repair and moving allowances."}</p>`;
    $("scenario-check").innerHTML =
      `<h3>${mode === "buyer" ? "What if the rate changes?" : "What if the sale price changes?"}</h3><table><caption>${mode === "buyer" ? "Monthly total, other assumptions unchanged" : "After repairs and moving, other assumptions unchanged"}</caption><tbody>${r.comparison.map((x) => `<tr><th scope="row">${mode === "buyer" ? x.label : money(x.label)}</th><td>${money(x.value)}</td></tr>`).join("")}</tbody></table>`;
    $("result-caution").textContent =
      mode === "buyer"
        ? (r.downPct < 20 && v.mi === 0
            ? "Mortgage insurance is set to $0 with less than 20% down. Get your lender’s actual requirement. "
            : "") +
          "Utilities and any unentered costs are excluded. This is not a maximum-affordability recommendation."
        : (r.secondary < 0 ? "This scenario needs additional cash. " : "") +
          "Income/capital-gains taxes and unentered adjustments are excluded. This is not a tax calculation.";
  }
  function blank() {
    states[mode] = {
      v: Object.fromEntries(defs[mode].map((d) => [d[0], ""])),
      edited: new Set(),
      example: false,
    };
    render();
    $("f-price").focus();
  }
  // Nav links point at #buyer / #seller; follow them without a reload.
  addEventListener("hashchange", () => {
    const next = location.hash === "#seller" ? "seller" : location.hash === "#buyer" ? "buyer" : null;
    if (next && next !== mode) {
      mode = next;
      render();
    }
  });
  document.querySelectorAll("[data-tool]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.tool;
      history.replaceState(null, "", "#" + mode);
      render();
    }),
  );
  document.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      seed(mode, +b.dataset.preset);
      render();
    }),
  );
  $("custom").addEventListener("click", blank);
  $("reset").addEventListener("click", blank);
  function download(text, name) {
    const a = document.createElement("a"),
      url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("save-scenario").addEventListener("click", () => {
    if (last.error) return;
    download(
      `${mode.toUpperCase()} PLANNING SCENARIO\n${$("example-label").textContent}\n\n${$("result-title").textContent}: ${$("result").textContent}\n${$("breakdown").textContent}\n${$("second-result").innerText}\n\nASSUMPTIONS\n` +
        defs[mode]
          .map(
            (d) =>
              d[1] +
              ": " +
              states[mode].v[d[0]] +
              (states[mode].edited.has(d[0]) ? " (your entry)" : " (illustrative)"),
          )
          .join("\n") +
        "\n\n" +
        $("result-caution").textContent +
        "\nPlanning only; verify actual figures. No data was sent.",
      mode + "-planning-scenario.txt",
    );
  });
  $("download-plan").addEventListener("click", () =>
    download(
      "YOUR SHOWING GAME PLAN\n\n" + document.querySelector(".showing-plan ol").innerText,
      "showing-game-plan.txt",
    ),
  );
  render();
})();
