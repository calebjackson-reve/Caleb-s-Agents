/* Louisiana Home Brief: local estimates from user-entered assumptions only. */
(function (host) {
  "use strict";

  const MAX_MONEY = Number.MAX_SAFE_INTEGER / 100;
  const boundForms = new WeakMap();
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const paymentFields = Object.freeze({
    price: "Home price", downPayment: "Down payment in dollars",
    rate: "Annual interest rate", term: "Loan term in years",
    annualTaxes: "Annual property taxes",
    annualHomeInsurance: "Annual homeowners insurance",
    annualFloodInsurance: "Annual flood insurance",
    monthlyHOA: "Monthly HOA dues", monthlyPMI: "Monthly PMI"
  });
  const netFields = Object.freeze({
    salePrice: "Sale price", payoff: "Mortgage and lien payoff",
    commissionPercent: "Total commission percent", titleFees: "Seller title fees",
    otherClosingCosts: "Other seller closing costs",
    concessions: "Seller concessions", repairs: "Seller-paid repairs"
  });

  class ValidationError extends TypeError {
    constructor(errors) {
      super(Object.values(errors).join(" "));
      this.name = "ValidationError";
      this.errors = Object.freeze({ ...errors });
    }
  }

  // Match the verified source's rounding, including its rounded-line-item totals.
  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function readNumber(value, label, kind) {
    if (typeof value === "string") {
      let text = value.trim();
      if (kind === "money") text = text.replace(/^\$\s*/, "");
      if (kind === "percent") text = text.replace(/\s*%$/, "");
      // Permit decimal and correctly grouped money input; reject blanks, hex,
      // booleans, malformed grouping and accidental internal whitespace.
      if (!/^-?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text)) {
        throw new TypeError(`${label} must be a finite number.`);
      }
      value = Number(text.replace(/,/g, ""));
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${label} must be a finite number.`);
    }
    if (value < 0) throw new RangeError(`${label} must be 0 or more.`);
    if (kind === "money" && value > MAX_MONEY) {
      throw new RangeError(`${label} is too large to calculate safely.`);
    }
    return value;
  }

  function parseValues(values, fields) {
    const parsed = {};
    const errors = {};
    for (const [key, label] of Object.entries(fields)) {
      try {
        const kind = key === "rate" || key === "commissionPercent" ? "percent"
          : key === "term" ? "term" : "money";
        parsed[key] = readNumber(values == null ? undefined : values[key], label, kind);
      } catch (error) {
        errors[key] = error.message;
      }
    }
    return { parsed, errors };
  }

  function safeResult(result) {
    if (Object.values(result).some(value => !Number.isFinite(value) || Math.abs(value) > MAX_MONEY)) {
      throw new ValidationError({ _calculation: "These amounts are too large to calculate safely. Enter smaller amounts." });
    }
    return result;
  }

  function calculatePayment(values) {
    const { parsed: v, errors } = parseValues(values, paymentFields);
    if (v.price === 0) errors.price = "Home price must be greater than 0.";
    if (v.downPayment > v.price) errors.downPayment = "Down payment cannot exceed the home price.";
    if (v.rate > 100) errors.rate = "Annual interest rate must be between 0 and 100 percent.";
    if (v.term !== undefined && (!Number.isSafeInteger(v.term) || v.term <= 0 || !Number.isSafeInteger(v.term * 12))) {
      errors.term = "Loan term must be a positive whole number of years within the safe calculation range.";
    }
    if (Object.keys(errors).length) throw new ValidationError(errors);

    const loanAmount = roundMoney(v.price - v.downPayment);
    const monthlyRate = v.rate / 100 / 12;
    const paymentCount = v.term * 12;
    // Algebraically identical to the verified amortization formula. log1p/expm1
    // avoid cancellation for tiny rates and exponent overflow for long terms.
    const principalAndInterest = loanAmount === 0 ? 0
      : monthlyRate === 0 ? loanAmount / paymentCount
      : loanAmount * monthlyRate / -Math.expm1(-paymentCount * Math.log1p(monthlyRate));
    const monthlyPrincipalAndInterest = roundMoney(principalAndInterest);
    const monthlyTaxes = roundMoney(v.annualTaxes / 12);
    const monthlyHomeInsurance = roundMoney(v.annualHomeInsurance / 12);
    const monthlyFloodInsurance = roundMoney(v.annualFloodInsurance / 12);
    const monthlyHOA = roundMoney(v.monthlyHOA);
    const monthlyPMI = roundMoney(v.monthlyPMI);
    const additionalMonthlyCosts = roundMoney(monthlyTaxes + monthlyHomeInsurance +
      monthlyFloodInsurance + monthlyHOA + monthlyPMI);
    return safeResult({
      loanAmount, monthlyPrincipalAndInterest, monthlyTaxes, monthlyHomeInsurance,
      monthlyFloodInsurance, monthlyHOA, monthlyPMI, additionalMonthlyCosts,
      estimatedMonthlyTotal: roundMoney(monthlyPrincipalAndInterest + additionalMonthlyCosts)
    });
  }

  function calculateNet(values) {
    const { parsed: v, errors } = parseValues(values, netFields);
    if (v.salePrice === 0) errors.salePrice = "Sale price must be greater than 0.";
    if (v.commissionPercent > 100) errors.commissionPercent = "Total commission percent must be between 0 and 100.";
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const salePrice = roundMoney(v.salePrice);
    const payoff = roundMoney(v.payoff);
    const commission = roundMoney(v.salePrice * (v.commissionPercent / 100));
    const titleFees = roundMoney(v.titleFees);
    const otherClosingCosts = roundMoney(v.otherClosingCosts);
    const concessions = roundMoney(v.concessions);
    const repairs = roundMoney(v.repairs);
    const totalDeductions = roundMoney(payoff + commission + titleFees + otherClosingCosts + concessions + repairs);
    return safeResult({
      salePrice, payoff, commission, titleFees, otherClosingCosts, concessions,
      repairs, totalDeductions, estimatedNet: roundMoney(salePrice - totalDeductions)
    });
  }

  function initialize(root = host.document) {
    if (!root || typeof root.querySelectorAll !== "function") {
      throw new TypeError("initialize(root) requires a document or an element.");
    }
    const selector = "form[data-hb-payment], form[data-hb-net]";
    const forms = Array.from(root.querySelectorAll(selector));
    if (typeof root.matches === "function" && root.matches(selector)) forms.unshift(root);
    // Validate the entire integration contract before binding any new form.
    const configurations = forms.map(form => {
      if (form.hasAttribute("data-hb-payment") && form.hasAttribute("data-hb-net")) {
        throw new TypeError("A calculator form must declare only one tool type.");
      }
      const type = form.hasAttribute("data-hb-payment") ? "payment" : "net";
      const fields = type === "payment" ? paymentFields : netFields;
      const controls = {};
      for (const key of Object.keys(fields)) {
        const matches = form.querySelectorAll(`input[name="${key}"]`);
        if (matches.length !== 1) throw new TypeError(`Home Brief ${type} form requires one input[name="${key}"].`);
        controls[key] = matches[0];
      }
      const result = form.querySelector(`[data-hb-${type}-result]`);
      const summary = result && result.querySelector("[data-hb-summary]");
      const lines = result && result.querySelector("dl[data-hb-line-items]");
      if (!result || !summary || !lines) {
        throw new TypeError(`Home Brief ${type} form requires its result region, [data-hb-summary], and dl[data-hb-line-items].`);
      }
      return { form, type, fields, controls, result, summary, lines };
    });

    const disposers = configurations.map(config => {
      const { form, type, fields, controls, result, summary, lines } = config;
      if (boundForms.has(form)) return boundForms.get(form);
      const previousNoValidate = form.noValidate;
      form.noValidate = true; // Local validation provides one accessible error summary.
      result.setAttribute("role", "status");
      result.setAttribute("aria-live", "polite");
      result.setAttribute("aria-atomic", "true");

      function clearErrors() {
        for (const [key, control] of Object.entries(controls)) {
          control.setCustomValidity("");
          control.removeAttribute("aria-invalid");
          const error = form.querySelector(`[data-hb-error-for="${key}"]`);
          if (error) error.textContent = "";
        }
      }

      function clearResult() {
        summary.textContent = "";
        lines.replaceChildren();
        result.setAttribute("data-hb-state", "blank");
        clearErrors();
      }

      function addLine(label, key, value) {
        const dt = form.ownerDocument.createElement("dt");
        const dd = form.ownerDocument.createElement("dd");
        dt.textContent = label;
        dd.textContent = currency.format(value);
        dd.setAttribute("data-hb-line", key);
        lines.append(dt, dd);
      }

      function render(errorsOnBlank, focusError) {
        const values = {};
        for (const [key, control] of Object.entries(controls)) values[key] = control.value;
        clearResult();
        // No partial estimate, silent zero assumptions, or stale valid result.
        if (!errorsOnBlank && Object.values(values).some(value => !String(value).trim())) return;
        try {
          const estimate = type === "payment" ? calculatePayment(values) : calculateNet(values);
          result.setAttribute("data-hb-state", "valid");
          if (type === "payment") {
            summary.textContent = `Estimated monthly total: ${currency.format(estimate.estimatedMonthlyTotal)}. Based on your assumptions.`;
            addLine("Loan amount (one-time balance)", "loanAmount", estimate.loanAmount);
            for (const [key, label] of [
              ["monthlyPrincipalAndInterest", "Monthly principal and interest"],
              ["monthlyTaxes", "Monthly property taxes"],
              ["monthlyHomeInsurance", "Monthly homeowners insurance"],
              ["monthlyFloodInsurance", "Monthly flood insurance"],
              ["monthlyHOA", "Monthly HOA dues"], ["monthlyPMI", "Monthly PMI"],
              ["estimatedMonthlyTotal", "Estimated monthly total"]
            ]) addLine(label, key, estimate[key]);
          } else {
            summary.textContent = estimate.estimatedNet < 0
              ? `Estimated seller net: ${currency.format(estimate.estimatedNet)}. Estimated amount needed to close: ${currency.format(-estimate.estimatedNet)}.`
              : `Estimated seller net: ${currency.format(estimate.estimatedNet)}. Based on your assumptions.`;
            addLine("Sale price", "salePrice", estimate.salePrice);
            for (const [key, label] of [
              ["payoff", "Mortgage and lien payoff"], ["commission", "Total commission"],
              ["titleFees", "Seller title fees"], ["otherClosingCosts", "Other seller closing costs"],
              ["concessions", "Seller concessions"], ["repairs", "Seller-paid repairs"]
            ]) addLine(label, key, -estimate[key]);
            addLine("Total deductions", "totalDeductions", -estimate.totalDeductions);
            addLine("Estimated seller net", "estimatedNet", estimate.estimatedNet);
          }
        } catch (error) {
          if (!(error instanceof ValidationError)) throw error;
          result.setAttribute("data-hb-state", "invalid");
          summary.textContent = `Check your assumptions. ${error.message}`;
          let firstInvalid;
          for (const [key, message] of Object.entries(error.errors)) {
            const control = controls[key];
            if (!control) continue;
            control.setAttribute("aria-invalid", "true");
            control.setCustomValidity(message);
            const fieldError = form.querySelector(`[data-hb-error-for="${key}"]`);
            if (fieldError) fieldError.textContent = message;
            if (!firstInvalid) firstInvalid = control;
          }
          if (focusError && firstInvalid) firstInvalid.focus();
        }
      }

      function onInput(event) {
        if (Object.values(controls).includes(event.target)) render(false, false);
      }
      function onSubmit(event) {
        event.preventDefault();
        render(true, true);
      }
      // Reset values settle after the native reset event. Clear results immediately;
      // do not recalculate from any HTML defaults afterward.
      function onReset() { clearResult(); }
      clearResult();
      form.addEventListener("input", onInput);
      form.addEventListener("change", onInput);
      form.addEventListener("submit", onSubmit);
      form.addEventListener("reset", onReset);
      function dispose() {
        if (boundForms.get(form) !== dispose) return;
        form.removeEventListener("input", onInput);
        form.removeEventListener("change", onInput);
        form.removeEventListener("submit", onSubmit);
        form.removeEventListener("reset", onReset);
        form.noValidate = previousNoValidate;
        clearResult();
        boundForms.delete(form);
      }
      boundForms.set(form, dispose);
      return dispose;
    });
    return function disposeTools() { disposers.forEach(dispose => dispose()); };
  }

  host.CJHomeBriefTools = Object.freeze({ initialize, calculatePayment, calculateNet });
})(typeof window !== "undefined" ? window : globalThis);
