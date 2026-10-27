
import CompanyLogo from "./CompanyLogo";
import SalaryStructure from "./SalaryStructure";
import signatureStamp from "../assets/signature.png";

export default function AppraisalLetterPreview({
  form,
  incrementPercentage,
  salarySettings = {},
  editable = false,
}) {
  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const date = form.effectiveDate
    ? new Date(`${form.effectiveDate}T00:00:00`).toLocaleDateString("en-GB")
    : "DD/MM/YYYY";

    const footer = <p className="company-gst">GST-36AAIFU2638L1ZQ</p>;

  return (
       <section
      className={`letter-preview${editable ? " editing" : ""}`}
      id="appraisal-letter"
      aria-label="Appraisal letter preview"
      contentEditable={editable}
      suppressContentEditableWarning
    >
      {/* PAGE 1 */}
      <article
        className="letter-page letter-page-one"
        contentEditable={isEditing}
        suppressContentEditableWarning
      >
        <div className="letter-brand-row">
          <CompanyLogo />
        </div>

        <h3 className="letter-title">
          Employee Performance Appraisal and Salary Revision Letter
        </h3>

        <p>Dear {form.employeeName || "[Employee Name]"},</p>

        <p>
          Greetings from <strong>UXINTERFACELY IT SOLUTIONS LLP!</strong>
        </p>

        <p>
          We are pleased to inform you that, following a review of your
          performance, contributions, and overall progress during the appraisal
          period, the management has decided to provide you with a performance
          appraisal and salary revision. We appreciate your dedication,
          commitment, and efforts toward achieving the organization's goals.
          Your contributions to the team and the company are valued, and we
          encourage you to continue maintaining the same level of
          professionalism and responsibility in your role.
        </p>

        <p>Please find your appraisal details below:</p>

        <ul className="appraisal-details-list">
          <li>Employee Name: {form.employeeName || "[Employee Name]"}</li>
          <li>Designation: {form.designation || "[Current Designation]"}</li>
          <li>Department: {form.department || "[Department Name]"}</li>
          <li>Current Annual CTC: ₹{money(form.currentCtc)} per annum</li>
          <li>Revised Annual CTC: ₹{money(form.revisedCtc)} per annum</li>
          <li>
            Increment Percentage:{" "}
            {Number(incrementPercentage || 0).toFixed(2)}%
          </li>
          <li>Effective Date: {date}</li>
        </ul>

        <h4>
          Revised Annual CTC for {form.employeeName || "[Employee Name]"}:
        </h4>

        <SalaryStructure
          revisedCtc={form.revisedCtc}
          variablePay={salarySettings.variablePay}
          employeePf={salarySettings.employeePf}
          employerPf={salarySettings.employerPf}
          professionalTax={salarySettings.professionalTax}
        />

        <Footer />
      </article>

      {/* PAGE 2 */}
      <article
        className="letter-page letter-page-two"
        contentEditable={isEditing}
        suppressContentEditableWarning
      >
        <p>
          The revised salary will be applicable from the effective date
          mentioned above. The updated salary structure, including applicable
          allowances and deductions, will be shared separately or attached to
          this letter.
        </p>

        <p>
          We expect you to continue improving your skills, taking ownership
          of your responsibilities, collaborating effectively with your team,
          and contributing to the company's continued growth and success.
        </p>

        <p>
          Kindly acknowledge receipt of this letter and contact the HR
          department if you require any clarification regarding your appraisal
          or revised compensation.
        </p>

        <p>
          Congratulations on your appraisal! We look forward to your
          continued growth and valuable contributions to UXINTERFACELY IT
          SOLUTIONS LLP.
        </p>

        <div className="letter-signature-area">
          <p className="letter-signoff">
            Yours faithfully,
            <br />
            For UXINTERFACELY IT SOLUTIONS LLP,
          </p>

          <img
            className="signature-stamp-image"
            src={signatureStamp}
            alt="Authorized signature and company stamp"
          />
        </div>

        <Footer />
      </article>
    </section>
  );
}
