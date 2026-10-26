import { calculateSalaryStructure, calculateSalaryValues } from "../utils/salaryCalculator";

const money = (value) => Math.round(Number(value) || 0).toLocaleString("en-IN");

export default function SalaryStructure({ revisedCtc, variablePay = 50000, employeePf = 1800, employerPf = 1800, professionalTax = 200 }) {
  const ctc = Math.max(0, Number(revisedCtc) || 0);
  const annualVariablePay = Math.max(0, Number(variablePay) || 0);
  const values = calculateSalaryValues(ctc, annualVariablePay);
  const components = calculateSalaryStructure(ctc, annualVariablePay);
  const totalMonthlyDeductions = values.deductions;
  const totalYearlyDeductions = totalMonthlyDeductions * 12;
  const monthlyTakeHome = values.netPay;
  const yearlyTakeHome = monthlyTakeHome * 12 + annualVariablePay;
  const rows = [
    ...components,
    { component: "Total CTC", monthly: values.totalCtc, yearly: values.totalCtc * 12 + annualVariablePay, total: true },
  ];
  const deductions = [
    { component: "PF-Employee", monthly: values.employeePf },
    { component: "PF-Employer", monthly: values.employerPf },
    { component: "Professional Tax", monthly: values.professionalTax },
  ];
  return <section className="salary-structure">
    <table aria-label="Revised annual CTC">
      <thead><tr><th>Component</th><th>Monthly</th><th>Yearly</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.component} className={row.total ? "total-row" : ""}>
          <td>{row.component}</td><td>{row.monthly == null ? "—" : money(row.monthly)}</td><td>{money(row.yearly)}</td>
        </tr>)}
        <tr className="section-row"><th colSpan="3">Deductions</th></tr>
        {deductions.map((row) => <tr key={row.component}><td>{row.component}</td><td>{money(row.monthly)}</td><td>{money(row.monthly * 12)}</td></tr>)}
        <tr className="total-row"><th>Total Deductions</th><th>{money(totalMonthlyDeductions)}</th><th>{money(totalYearlyDeductions)}</th></tr>
        <tr className="take-home-row"><th>Take Home</th><th>{money(monthlyTakeHome)}</th><th>{money(yearlyTakeHome)}</th></tr>
      </tbody>
    </table>
  </section>;
}
