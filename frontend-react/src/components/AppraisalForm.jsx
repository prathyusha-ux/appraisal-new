import { useEffect, useState } from "react";
import appraisalService from "../services/appraisalService";
import EmployeeDetails from "./EmployeeDetails";
import AppraisalLetterPreview from "./AppraisalLetterPreview";
import { buildLetterPdf } from "../utils/letterPdf";
import {
  DEPARTMENT_MAX,
  DEPARTMENT_MESSAGES,
  DESIGNATION_MAX,
  DESIGNATION_MESSAGES,
  EMAIL_MAX,
  EMAIL_MESSAGES,
  ID_MAX,
  ID_MESSAGES,
  NAME_MAX,
  NAME_MESSAGES,
  normalizeEmail,
  normalizeSpaces,
  validateDepartment,
  validateDesignation,
  validateEmail,
  validateEmployeeId,
  validateName,
} from "../utils/validation";

// Fields with their own rules.
//   max          longest value the field accepts (extra characters are dropped)
//   validate     returns an error message, or "" when the value is valid
//   liveMessages errors shown straight away while typing
//   normalize    cleaned value that is shown and saved (extra spaces removed, etc.)
const TEXT_RULES = {
  employeeName: {
    max: NAME_MAX,
    maxMessage: NAME_MESSAGES.max,
    validate: validateName,
    liveMessages: [NAME_MESSAGES.numbers, NAME_MESSAGES.special],
    normalize: normalizeSpaces,
  },
  employeeId: {
    max: ID_MAX,
    maxMessage: ID_MESSAGES.max,
    validate: validateEmployeeId,
    liveMessages: [ID_MESSAGES.invalid],
    normalize: (value) => (value || "").trim(),
  },
  employeeEmail: {
    max: EMAIL_MAX,
    maxMessage: EMAIL_MESSAGES.max,
    validate: validateEmail,
    liveMessages: [EMAIL_MESSAGES.spaces],
    normalize: normalizeEmail,
  },
  designation: {
    max: DESIGNATION_MAX,
    maxMessage: DESIGNATION_MESSAGES.max,
    validate: validateDesignation,
    liveMessages: [DESIGNATION_MESSAGES.numbers, DESIGNATION_MESSAGES.special],
    normalize: normalizeSpaces,
  },
  department: {
    max: DEPARTMENT_MAX,
    maxMessage: DEPARTMENT_MESSAGES.max,
    validate: validateDepartment,
    liveMessages: [DEPARTMENT_MESSAGES.numbers, DEPARTMENT_MESSAGES.special],
    normalize: normalizeSpaces,
  },
};

export default function AppraisalForm() {
  const [form, setForm] = useState({
    employeeName: "",
    employeeId: "",
    employeeEmail: "",
    designation: "",
    department: "",
    currentCtc: "",
    revisedCtc: "",
    effectiveDate: "",
    variablePay: "0",
    employeePf: "0",
    employerPf: "0",
    professionalTax: "200",
  });
  const [isGenerated, setIsGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [letterVersion, setLetterVersion] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "failed"
  const [statusLabel, setStatusLabel] = useState("Generated");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [savedAppraisalId, setSavedAppraisalId] = useState(null);

  // Render's free plan sleeps when idle; start waking the backend as soon as the page opens.
  useEffect(() => {
    appraisalService.wakeUp().catch(() => {});
  }, []);

  const updateField = (name, rawValue) => {
    let value = rawValue;

    const rule = TEXT_RULES[name];
    if (rule) {
      let message = "";
      if (value.length > rule.max) {
        value = value.slice(0, rule.max); // the system does not accept more than the maximum
        message = rule.maxMessage;
      } else {
        const found = rule.validate(value);
        // Wrong characters are reported straight away; "required" and "too short"
        // wait until the field is left or the form is submitted.
        message = found && (rule.liveMessages.includes(found) || touched[name]) ? found : "";
      }
      setFieldErrors((previous) => ({ ...previous, [name]: message }));
    }

    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === "revisedCtc") {
        const monthlyCtc = Math.max(0, Number(value) || 0) / 12;
        const basic = monthlyCtc * 0.5;
        const pf = basic >= 25000 ? 3000 : basic * 0.12;
        next.employeePf = String(pf);
        next.employerPf = String(pf);
        next.professionalTax = "200";
      }
      return next;
    });
    setIsGenerated(false);
    setIsEditing(false);
    setError("");
  };

  const handleBlurField = (name) => {
    const rule = TEXT_RULES[name];
    if (!rule) return;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setFieldErrors((previous) => ({ ...previous, [name]: rule.validate(form[name]) }));
    // Show the cleaned value, e.g. "  Vennela    Ravilla " becomes "Vennela Ravilla".
    // (A value with only spaces is left as typed so that "Name is required" stays visible.)
    setForm((previous) => ({
      ...previous,
      [name]: previous[name].trim() === "" ? previous[name] : rule.normalize(previous[name]),
    }));
  };

  const pdfFileName = `${(form.employeeName || "Employee").trim().replace(/\s+/g, "_")}_Appraisal_Letter.pdf`;

  const makeLetterPdf = () => {
    const root = document.getElementById("appraisal-letter");
    if (!root) throw new Error("Generate the letter first.");
    return buildLetterPdf(root);
  };

  // Builds the PDF from the letter on screen and stores it in the database.
  // Throws if anything fails; the caller shows the status line.
  const storePdf = async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 300)); // let the letter finish rendering
    const pdf = await makeLetterPdf();
    await appraisalService.uploadPdf(id, pdf.output("blob"), pdfFileName);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    Object.entries(TEXT_RULES).forEach(([field, rule]) => {
      const message = rule.validate(form[field]);
      if (message) errors[field] = message;
    });
    if (Object.keys(errors).length > 0) {
      setTouched((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(errors).map((f) => [f, true])) }));
      setFieldErrors((previous) => ({ ...previous, ...errors }));
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    // All text fields are valid: use the cleaned values from here on.
    const cleaned = Object.fromEntries(
      Object.entries(TEXT_RULES).map(([field, rule]) => [field, rule.normalize(form[field])])
    );
    setForm((previous) => ({ ...previous, ...cleaned }));

    const current = Number(form.currentCtc);
    const revised = Number(form.revisedCtc);

    if (!Number.isFinite(current) || current <= 0) {
      setError("Current Annual CTC must be greater than ₹0.");
      return;
    }
    if (!Number.isFinite(revised) || revised < 0) {
      setError("Revised Annual CTC must be a valid non-negative amount.");
      return;
    }

    // Show the letter straight away; saving to the database happens after.
    setError("");
    setEmailMessage("");
    setEmailError("");
    setSavedAppraisalId(null);
    setIsEditing(false);
    setLetterVersion((v) => v + 1);
    setIsGenerated(true);
    setStatusLabel("Generated");
    setSaveStatus("saving");

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        ...cleaned,
        currentCtc: current,
        revisedCtc: revised,
        variablePay: Number(form.variablePay),
        employeePf: Number(form.employeePf),
        employerPf: Number(form.employerPf),
        professionalTax: Number(form.professionalTax),
      };
      const saved = await appraisalService.createAppraisal(payload);
      setSavedAppraisalId(saved.id);
      await storePdf(saved.id);
      setSaveStatus("saved");
    } catch (requestError) {
      console.error("Saving the appraisal failed:", requestError.response?.data || requestError);
      setSaveStatus("failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    setIsEditing(false);
    if (savedAppraisalId) {
      setStatusLabel("Edited");
      setSaveStatus("saving");
      try {
        await storePdf(savedAppraisalId); // save the edited letter
        setSaveStatus("saved");
      } catch (pdfError) {
        console.error("Saving the edited letter failed:", pdfError.response?.data || pdfError);
        setSaveStatus("failed");
      }
    }
  };

  const handleDownload = async () => {
    setIsPreparingPdf(true);
    setEmailMessage("");
    setEmailError("");
    try {
      const pdf = await makeLetterPdf();
      pdf.save(pdfFileName);
    } catch (pdfError) {
      setEmailError(pdfError.message || "Could not create the PDF.");
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailMessage("");
    setEmailError("");
    try {
      const pdf = await makeLetterPdf();
      const result = await appraisalService.sendLetterEmail({
        to: form.employeeEmail,
        employeeName: form.employeeName,
        appraisalId: savedAppraisalId,
        blob: pdf.output("blob"),
        fileName: pdfFileName,
      });
      setEmailMessage(result.message || `Appraisal PDF sent to ${form.employeeEmail}.`);
    } catch (requestError) {
      setEmailError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "Email could not be sent. Check that the backend is running and the email settings are correct."
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const incrementPercentage =
    Number(form.currentCtc) > 0
      ? ((Number(form.revisedCtc) - Number(form.currentCtc)) /
          Number(form.currentCtc)) *
        100
      : 0;

  return (
    <main className="appraisal-container">
      <form className="form-card" onSubmit={handleSubmit}>
        <EmployeeDetails
          form={form}
          updateField={updateField}
          errors={fieldErrors}
          onBlurField={handleBlurField}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="button-row">
          <button type="submit" className="btn-primary btn-wide" disabled={isSaving}>
            {isSaving ? "Saving..." : "Generate Appraisal Letter"}
          </button>
        </div>
      </form>

      <div className="secondary-buttons">
        <button type="button" disabled={!isGenerated || isPreparingPdf} onClick={handleDownload}>
          {isPreparingPdf ? "Preparing PDF..." : "Download as PDF"}
        </button>
        <button
          type="button"
          className={isEditing ? "btn-red" : "btn-green"}
          disabled={!isGenerated}
          onClick={handleToggleEdit}
        >
          {isEditing ? "✓ Done Editing" : "✎ Edit Letter"}
        </button>
        <button type="button" disabled={!isGenerated || isSendingEmail} onClick={handleSendEmail}>
          {isSendingEmail ? "Sending..." : "✉ Email Appraisal Letter"}
        </button>
      </div>
      {isEditing && (
        <p className="edit-hint">
          Editing is on. Click anywhere in the letter and type, then click "Done Editing".
        </p>
      )}
      {saveStatus && (
        <p className="save-status" role="status">
          {statusLabel} ✓ —{" "}
          {saveStatus === "saving"
            ? "saving…"
            : saveStatus === "saved"
            ? "saved"
            : "save failed (see console)"}
        </p>
      )}
      {emailMessage && <p className="email-success" role="status">{emailMessage}</p>}
      {emailError && <p className="form-error center-error" role="alert">{emailError}</p>}

      {isGenerated ? (
        <AppraisalLetterPreview
          key={letterVersion}
          editable={isEditing}
          form={form}
          incrementPercentage={incrementPercentage}
          salarySettings={form}
        />
      ) : (
        <p className="letter-empty">
          No letter generated yet. Fill in the form and click "Generate Appraisal Letter".
        </p>
      )}
    </main>
  );
}