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
    <div className="form-grid">
      {fields.map(([name, label, type]) => (
        <div className="field-group" key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            type={type}
            name={name}
            value={form[name]}
            min={type === "number" ? (name === "currentCtc" ? 1 : 0) : undefined}
            step={type === "number" ? "0.01" : undefined}
            onChange={(event) => updateField(name, event.target.value)}
            readOnly={["employeePf", "employerPf", "professionalTax"].includes(name)}
            required
          />
        </div>
      ))}
    </div>
  );
}