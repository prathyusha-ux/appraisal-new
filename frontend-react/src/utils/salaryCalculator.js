export function calculateIncrement(currentCtc, revisedCtc) {
  const current = Number(currentCtc);
  const revised = Number(revisedCtc);
  if (!Number.isFinite(current) || !Number.isFinite(revised) || current <= 0 || revised < 0) return 0;
  return ((revised - current) / current) * 100;
}

// Annual CTC is the input; all salary values below are monthly unless noted.
export function calculateSalaryValues(annualCtc, annualVariablePay = 0) {
  const ctc = Number(annualCtc);
  const variablePay = Number(annualVariablePay) || 0;
  if (!Number.isFinite(ctc) || ctc < 0) throw new Error("Annual CTC must be a valid non-negative amount.");
  if (!Number.isFinite(variablePay) || variablePay < 0) throw new Error("Annual Variable Pay must be a valid non-negative amount.");

  const monthlyCtc = ctc / 12;
  const basic = monthlyCtc * 0.5;
  const hra = basic * 0.4;
  const pf = basic >= 25000 ? 3000 : basic * 0.12;
  const employeePf = pf;
  const employerPf = pf;
  const specialAllowance = monthlyCtc - basic - hra - employerPf;

  // Requested formula: Total CTC = Basic + HRA + Special Allowance.
  const totalCtc = basic + hra + specialAllowance;
  const grossPay = totalCtc;
  const professionalTax = 200;
  const tds = 0;

  // Requested formula: Total Deductions = Employee PF + Employer PF + Professional Tax.
  const deductions = employeePf + employerPf + professionalTax + tds;
  const netPay = grossPay - deductions;

  return {
    monthlyCtc,
    basic,
    hra,
    employeePf,
    employerPf,
    specialAllowance,
    totalCtc,
    grossPay,
    professionalTax,
    tds,
    deductions,
    netPay,
  };
}

export function calculateSalaryStructure(annualCtc, annualVariablePay = 0) {
  const values = calculateSalaryValues(annualCtc, annualVariablePay);
  return [
    { component: "Basic", yearly: values.basic * 12 },
    { component: "House Rent Allowance (HRA)", yearly: values.hra * 12 },
    { component: "Special Allowance", yearly: values.specialAllowance * 12 },
    { component: "Variable Pay", yearly: Number(annualVariablePay) || 0 },
  ].map((item) => ({
    ...item,
    // Variable pay is annual-only; do not display a monthly amount.
    monthly: item.component === "Variable Pay" ? null : item.yearly / 12,
  }));
}
