(function (root) {
  "use strict";
  function payment(principal, rate, years) {
    const n = years * 12,
      r = rate / 1200;
    return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  }
  function calculate(mode, v) {
    const needed =
      mode === "buyer"
        ? [
            "price",
            "down",
            "rate",
            "years",
            "tax",
            "insurance",
            "hoa",
            "mi",
            "maintenance",
            "closing",
            "prepaids",
            "credits",
            "deposit",
          ]
        : ["price", "payoff", "fees", "closing", "credits", "repairs", "moving"];
    if (
      needed.some(
        (k) => v[k] === "" || v[k] === undefined || !Number.isFinite(Number(v[k])) || Number(v[k]) < 0,
      )
    )
      return {
        error: "Complete every field with a nonnegative number. Use zero only when a cost does not apply.",
      };
    v = Object.fromEntries(needed.map((k) => [k, Number(v[k])]));
    if (mode === "buyer") {
      if (v.down > v.price || !Number.isInteger(v.years) || v.years < 1 || v.years > 50 || v.rate > 100)
        return {
          error:
            "Use a down payment no larger than the price, a whole-number term from 1–50 years, and a rate from 0–100%.",
        };
      const loan = v.price - v.down,
        p = payment(loan, v.rate, v.years),
        extras = v.tax / 12 + v.insurance / 12 + v.hoa + v.mi + v.maintenance,
        cash = v.down + v.closing + v.prepaids - v.credits - v.deposit;
      if (cash < 0)
        return {
          error:
            "Credits and deposit exceed modeled cash needs. Check them against your lender’s actual cash-to-close statement.",
        };
      return {
        primary: p + extras,
        secondary: cash,
        payment: p,
        loan,
        extras,
        downPct: v.price ? (v.down / v.price) * 100 : 0,
        comparison: [Math.max(0, v.rate - 1), v.rate, Math.min(100, v.rate + 1)].map((rate) => ({
          label: rate.toFixed(2) + "% interest",
          value: payment(loan, rate, v.years) + extras,
        })),
        v,
      };
    }
    if (v.fees > 100) return { error: "Use a selling-fee percentage from 0–100%." };
    const percent = (v.price * v.fees) / 100,
      closingNet = v.price - v.payoff - percent - v.closing - v.credits;
    return {
      primary: closingNet,
      secondary: closingNet - v.repairs - v.moving,
      percent,
      comparison: [0.95, 1, 1.05].map((f) => ({
        label: Math.round(v.price * f),
        value:
          v.price * f -
          v.payoff -
          (v.price * f * v.fees) / 100 -
          v.closing -
          v.credits -
          v.repairs -
          v.moving,
      })),
      v,
    };
  }
  // Seller net with per-field explanations and itemized deductions, for side-by-side scenarios.
  const sellerFields = {
    price: "Sale price",
    fees: "Selling fees",
    credits: "Buyer credits",
    payoff: "Mortgage and lien payoff",
    closing: "Other settlement costs",
    repairs: "Preparation and repairs",
    moving: "Moving and transition",
  };
  function sellerNet(raw) {
    const errors = {},
      v = {};
    for (const key of Object.keys(sellerFields)) {
      const text = String(raw[key] ?? "").trim(),
        n = Number(text);
      if (text === "") errors[key] = "Enter a number. Use 0 if it does not apply.";
      else if (!Number.isFinite(n)) errors[key] = "Use digits only, without letters.";
      else if (n < 0) errors[key] = "Use zero or more. Enter costs as positive numbers.";
      else if (key === "fees" && n > 100) errors[key] = "Use a percentage from 0 to 100.";
      else if (key === "price" && n === 0) errors[key] = "Enter a sale price above zero.";
      v[key] = n;
    }
    if (Object.keys(errors).length) return { errors };
    const feeAmount = (v.price * v.fees) / 100,
      lines = [
        { key: "payoff", label: sellerFields.payoff, amount: v.payoff },
        { key: "fees", label: `Selling fees (${v.fees}%)`, amount: feeAmount },
        { key: "closing", label: sellerFields.closing, amount: v.closing },
        { key: "credits", label: sellerFields.credits, amount: v.credits },
      ],
      closingNet = v.price - lines.reduce((sum, l) => sum + l.amount, 0),
      afterMove = closingNet - v.repairs - v.moving;
    return { v, lines, feeAmount, closingNet, afterMove };
  }
  const api = { payment, calculate, sellerNet, sellerFields };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PlanningMath = api;
})(typeof window === "undefined" ? this : window);
