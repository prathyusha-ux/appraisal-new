
export default function EmployeeDetails({ form, updateField }) {
  const fields = [
    ["employeeName", "Employee Name", "text"],
    ["employeeEmail", "Employee Email", "email"],
    ["designation", "Designation", "text"],
    ["department", "Department", "text"],
    ["currentCtc", "Current Annual CTC (₹)", "number"],
    ["revisedCtc", "Revised Annual CTC (₹)", "number"],
    ["effectiveDate", "Effective Date", "date"],
    ["variablePay", "Annual Variable Pay (₹)", "number"],
    ["employeePf", "Employee PF / month (₹)", "number"],
    ["employerPf", "Employer PF / month (₹)", "number"],
    ["professionalTax", "Professional Tax / month (₹)", "number"],
  ];

  return (
    <section className="employee-details">
      <h3>Employee Details</h3>

      <div className="form-grid">
        {fields.map(([name, label, type]) => (
          <label key={name}>
            <span>{label}</span>
            <input
              type={type}
              name={name}
              value={form[name]}
              min={type === "number" ? (name === "currentCtc" ? 1 : 0) : undefined}
              step={type === "number" ? "0.01" : undefined}
              onChange={(event) => updateField(name, event.target.value)}
              readOnly={["employeePf", "employerPf", "professionalTax"].includes(name)}
              required
            />
          </label>
        ))}
      </div>
    </section>
  );
}
