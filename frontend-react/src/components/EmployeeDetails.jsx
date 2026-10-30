// These fields are checked by our own rules, so they show our messages
// and not the browser's "Please fill out this field" bubble.
const OWN_RULE_FIELDS = ["employeeName", "employeeId", "employeeEmail", "designation", "department"];

export default function EmployeeDetails({ form, updateField, errors = {}, onBlurField }) {
  const fields = [
    ["employeeName", "Employee Name", "text"],
    ["employeeId", "Employee ID", "text"],
    ["employeeEmail", "Employee Email", "text"],
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
            onBlur={() => onBlurField && onBlurField(name)}
            readOnly={["employeePf", "employerPf", "professionalTax"].includes(name)}
            required={!OWN_RULE_FIELDS.includes(name)}
            className={errors[name] ? "input-error" : undefined}
            aria-invalid={errors[name] ? "true" : undefined}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            autoComplete={["employeeName", "employeeId"].includes(name) ? "off" : undefined}
            inputMode={name === "employeeEmail" ? "email" : undefined}
          />
          {errors[name] && (
            <p className="field-error" id={`${name}-error`} role="alert">
              {errors[name]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}