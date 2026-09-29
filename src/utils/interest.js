// Shared interest / payable-amount math.
// Single source of truth used by both the entry detail card and the list table,
// so the "final payable" shown in the table always matches the detail view.

export function effectiveMonths(entryDate, endDate) {
  const start = new Date(entryDate);
  const end = new Date(endDate);

  const totalDays = Math.round((end - start) / 86400000);

  // Minimum billing rules:
  //   < 15 days total  → charge for 15 days (0.5 month)
  //   15–29 days total → charge for 1 month
  if (totalDays < 15) return 0.5;

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const check = new Date(start);
  check.setMonth(check.getMonth() + months);
  if (check > end) months--;
  months = Math.max(0, months);

  const after = new Date(start);
  after.setMonth(after.getMonth() + months);
  const remDays = Math.round((end - after) / 86400000);

  const extra = remDays <= 0 ? 0 : remDays < 15 ? 0.5 : 1;
  return months + extra;
}

export function calcReleaseAmount(loanAmount, interestRate, entryDate, endDate) {
  const em = effectiveMonths(entryDate, endDate);
  const monthlyRate = parseFloat(interestRate) / 100;
  const annualRate = monthlyRate * 12;
  const fullYears = Math.floor(em / 12);
  const remMonths = em % 12;
  const afterYears = parseFloat(loanAmount) * Math.pow(1 + annualRate, fullYears);
  return afterYears * (1 + monthlyRate * remMonths);
}

// Final payable amount = principal + accrued interest + dhafa (with their own
// accrued interest) − prepayments − interest already paid. Mirrors the
// `finalDue` computation in EntryDetailCard exactly.
// endDateStr is optional; defaults to released_date (if released) else today.
export function computePayable(pawn, endDateStr) {
  const isBoth = pawn.collateral_type === "both";
  const isGold = pawn.collateral_type === "gold";
  const isCancelled = !!pawn.is_cancelled;

  const today = new Date().toISOString().split("T")[0];
  const endDate = endDateStr || (pawn.is_released ? pawn.released_date : today);

  const prepayments = pawn.prepayments || [];
  const totalPrepaid = prepayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const interestPayments = pawn.interest_payments || [];
  const totalInterestPaid = interestPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  let baseReleaseAmount = 0;
  if (isCancelled) {
    const principalTotal = isBoth
      ? parseFloat(pawn.loan_amount_gold || 0) + parseFloat(pawn.loan_amount_silver || 0)
      : parseFloat(pawn.loan_amount || 0);
    baseReleaseAmount = principalTotal - totalPrepaid;
  } else if (isBoth) {
    const goldFull =
      pawn.loan_amount_gold && pawn.interest_rate_gold
        ? calcReleaseAmount(parseFloat(pawn.loan_amount_gold), pawn.interest_rate_gold, pawn.entry_date, endDate)
        : 0;
    const silverFull =
      pawn.loan_amount_silver && pawn.interest_rate_silver
        ? calcReleaseAmount(parseFloat(pawn.loan_amount_silver), pawn.interest_rate_silver, pawn.entry_date, endDate)
        : 0;
    baseReleaseAmount = goldFull + silverFull - totalPrepaid;
  } else if (pawn.loan_amount && pawn.interest_rate && pawn.entry_date && endDate) {
    baseReleaseAmount =
      calcReleaseAmount(parseFloat(pawn.loan_amount), pawn.interest_rate, pawn.entry_date, endDate) - totalPrepaid;
  }

  const additionalAmounts = pawn.additional_amounts || [];
  const dhafaRate = (a) => {
    if (a.interest_rate) return a.interest_rate;
    if (isBoth) return pawn.interest_rate_silver;
    if (isGold) return pawn.interest_rate_gold;
    return pawn.interest_rate;
  };
  const additionalDue = additionalAmounts.reduce((sum, a) => {
    if (!a.amount) return sum;
    if (isCancelled) return sum + parseFloat(a.amount);
    const rate = dhafaRate(a);
    if (!rate || !a.date || !endDate) return sum;
    return sum + calcReleaseAmount(a.amount, rate, a.date, endDate);
  }, 0);

  const totalDue = (baseReleaseAmount || 0) + additionalDue;
  const residualPrincipal = Math.max(0, parseFloat(pawn.loan_amount || 0) - totalPrepaid);
  return Math.max(residualPrincipal, totalDue - totalInterestPaid);
}
