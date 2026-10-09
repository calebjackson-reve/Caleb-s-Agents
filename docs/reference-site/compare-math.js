/* Home cost comparison: deterministic math only. Every number comes from the visitor's entries. */
(function (root) {
  "use strict";
  const COST_LINES = [
    ["principal", "Loan principal + interest"],
    ["tax", "Property tax"],
    ["insurance", "Homeowners insurance"],
    ["flood", "Flood insurance"],
    ["hoa", "HOA / association dues"],
    ["mi", "Mortgage insurance"],
    ["upkeep", "Upkeep reserve"],
  ];
  // Fields that can carry a basis (where the number came from).
  const SOURCED = ["tax", "insurance", "flood", "hoa", "closing"];
  const CONFIRMED = new Set(["quote", "bill", "documents"]);

  function payment(principal, ratePct, years) {
    const n = years * 12,
      r = ratePct / 1200;
    if (principal <= 0) return 0;
    return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  }

  function num(raw) {
    const text = String(raw ?? "").replace(/[$,\s]/g, "");
    if (text === "") return { empty: true };
    const n = Number(text);
    return Number.isFinite(n) ? { n } : { bad: true };
  }

  // Shared loan terms apply to every home so the comparison isolates the homes themselves.
  function checkLoan(loan) {
    const errors = {},
      v = {};
    const rules = {
      downPct: [0, 100, "Down payment must be from 0 to 100% of the price."],
      rate: [0, 25, "Use an interest rate from 0 to 25%."],
      years: [1, 40, "Use a whole-number term from 1 to 40 years."],
      upkeepPct: [0, 10, "Use an upkeep reserve from 0 to 10% of the price per year."],
      miPct: [0, 3, "Use a mortgage insurance rate from 0 to 3% per year."],
    };
    for (const [key, [min, max, msg]] of Object.entries(rules)) {
      const p = num(loan[key]);
      if (p.empty) errors[key] = "Enter a number. Use 0 if it does not apply.";
      else if (p.bad) errors[key] = "Use digits only.";
      else if (p.n < min || p.n > max || (key === "years" && !Number.isInteger(p.n))) errors[key] = msg;
      else v[key] = p.n;
    }
    return { errors, v };
  }

  // A home needs a price; every other cost may be left blank and is then reported as missing, not zero.
  function homeCost(home, loan) {
    const errors = {},
      v = {},
      missing = [];
    const price = num(home.price);
    if (price.empty) errors.price = "Enter the price you want to test.";
    else if (price.bad || price.n <= 0) errors.price = "Enter a price above zero, digits only.";
    else v.price = price.n;
    for (const key of ["tax", "insurance", "flood", "hoa", "closing", "credits"]) {
      const p = num(home[key]);
      if (p.empty) {
        v[key] = 0;
        if (key !== "credits") missing.push(key);
      } else if (p.bad || p.n < 0) errors[key] = "Use zero or more, digits only.";
      else v[key] = p.n;
    }
    if (Object.keys(errors).length) return { errors };
    const down = (v.price * loan.downPct) / 100,
      loanAmount = v.price - down,
      monthly = {
        principal: payment(loanAmount, loan.rate, loan.years),
        tax: v.tax / 12,
        insurance: v.insurance / 12,
        flood: v.flood / 12,
        hoa: v.hoa,
        mi: loan.downPct < 20 ? (loanAmount * loan.miPct) / 100 / 12 : 0,
        upkeep: (v.price * loan.upkeepPct) / 100 / 12,
      },
      monthlyTotal = Object.values(monthly).reduce((a, b) => a + b, 0),
      cashToClose = down + v.closing - v.credits;
    const basis = home.basis || {},
      confirmed = SOURCED.filter((k) => !missing.includes(k) && CONFIRMED.has(basis[k])),
      unconfirmed = SOURCED.filter((k) => !confirmed.includes(k));
    return { v, down, loanAmount, monthly, monthlyTotal, cashToClose, missing, confirmed, unconfirmed };
  }

  // Which cost line explains most of the gap between the cheapest and the most expensive home?
  function biggestSwing(results) {
    const ok = results.filter((r) => r && !r.errors);
    if (ok.length < 2) return null;
    const lo = ok.reduce((a, b) => (b.monthlyTotal < a.monthlyTotal ? b : a)),
      hi = ok.reduce((a, b) => (b.monthlyTotal > a.monthlyTotal ? b : a));
    const gap = hi.monthlyTotal - lo.monthlyTotal;
    if (gap < 1) return { gap: 0 };
    const [key, amount] = COST_LINES.map(([k]) => [k, hi.monthly[k] - lo.monthly[k]]).reduce((a, b) =>
      b[1] > a[1] ? b : a,
    );
    return { gap, key, amount, lo, hi };
  }

  // Louisiana homestead helper: assessed value is 10% of market value and the exemption
  // removes $7,500 of assessed value from millages it applies to. The visitor supplies millage.
  function laTaxEstimate(price, millage, homestead) {
    const assessed = price * 0.1,
      taxable = Math.max(0, assessed - (homestead ? 7500 : 0));
    return (taxable * millage) / 1000;
  }

  const api = { COST_LINES, SOURCED, payment, checkLoan, homeCost, biggestSwing, laTaxEstimate };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CompareMath = api;
})(typeof window === "undefined" ? this : window);
