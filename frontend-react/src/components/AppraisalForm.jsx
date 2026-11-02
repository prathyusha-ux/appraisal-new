import { useEffect, useRef, useState } from "react";
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
  blockedDepartmentChar,
  blockedDesignationChar,
  blockedEmailChar,
  blockedIdChar,
  blockedNameChar,
  filterTyping,
  normalizeEmail,
  normalizeSpaces,
  tidyWords,
  validateDepartment,
  validateDesignation,
  validateEmail,
  validateEmployeeId,
  validateName,
} from "../utils/validation";

// Fields with their own rules.
//   max          longest value the field accepts (extra characters are dropped)
//   validate     returns an error message, or "" when the value is valid
//   blocked      says why a typed character is refused ("" = allowed); refused characters never enter the field
//   tidy         optional extra clean-up after typing (returns the text and a reason)
//   normalize    cleaned value that is shown and saved (extra spaces removed, etc.)
const TEXT_RULES = {
  employeeName: {
    max: NAME_MAX,
    maxMessage: NAME_MESSAGES.max,
    validate: validateName,
    blocked: blockedNameChar,
    normalize: normalizeSpaces,
  },
  employeeId: {
    max: ID_MAX,
    maxMessage: ID_MESSAGES.max,
    validate: validateEmployeeId,
    blocked: blockedIdChar,
    normalize: (value) => (value || "").trim(),
  },
  employeeEmail: {
    max: EMAIL_MAX,
    maxMessage: EMAIL_MESSAGES.max,
    validate: validateEmail,
    blocked: blockedEmailChar,
    normalize: normalizeEmail,
  },
  designation: {
    max: DESIGNATION_MAX,
    maxMessage: DESIGNATION_MESSAGES.max,
    validate: validateDesignation,
    blocked: blockedDesignationChar,
    tidy: tidyWords, // a separator (& - / . ,) cannot start the text
    normalize: normalizeSpaces,
  },
  department: {
    max: DEPARTMENT_MAX,
    maxMessage: DEPARTMENT_MESSAGES.max,
    validate: validateDepartment,
    blocked: blockedDepartmentChar,
    tidy: tidyWords,
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
  const [lookupHint, setLookupHint] = useState("");
  const [touched, setTouched] = useState({});
  const lookupTimer = useRef(null); // waits a moment after typing before looking the employee up
  const lastLookup = useRef("");    // the ID that was looked up last (avoids repeated requests)
  const blockTimers = useRef({}); // keeps a "not allowed" message visible for a moment
  const [savedAppraisalId, setSavedAppraisalId] = useState(null);

  // Render's free plan sleeps when idle; start waking the backend as soon as the page opens.
  useEffect(() => {
    appraisalService.wakeUp().catch(() => {});
  }, []);

  const updateField = (name, rawValue) => {
    let value = rawValue;

    if (name === "employeeId") {
      setLookupHint("");
      lastLookup.current = "";
      clearTimeout(lookupTimer.current);
    }

    const rule = TEXT_RULES[name];
    if (rule) {
      // 1. characters the field does not allow never get in (typed or pasted)
      const filtered = filterTyping(value, rule.blocked);
      value = filtered.value;
      let message = filtered.reason;
      if (rule.tidy) {
        const tidied = rule.tidy(value);
        value = tidied.value;
        if (tidied.reason) message = tidied.reason;
      }

      // 2. the field does not take more than its maximum length
      if (value.length > rule.max) {
        value = value.slice(0, rule.max);
        message = rule.maxMessage;
      }

      if (message) {
        // show why the key was refused, then fade the message after a moment
        clearTimeout(blockTimers.current[name]);
        blockTimers.current[name] = setTimeout(() => {
          blockTimers.current[name] = null;
          setFieldErrors((previous) => (previous[name] === message ? { ...previous, [name]: "" } : previous));
        }, 2500);
        setFieldErrors((previous) => ({ ...previous, [name]: message }));
      } else if (!blockTimers.current[name]) {
        // normal case: after the field was visited, keep the error up to date
        const found = rule.validate(value);
        setFieldErrors((previous) => ({ ...previous, [name]: found && touched[name] ? found : "" }));
      }

      // A valid Employee ID: fetch the employee's details once typing pauses.
      if (name === "employeeId" && !message && !rule.validate(value)) {
        lookupTimer.current = setTimeout(() => lookupEmployee(value.trim()), 700);
      }
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

  // Fills name, email, designation, department and current CTC from the employee master.
  const fillFromEmployee = (emp) => {
    const fit = (field, value) => TEXT_RULES[field].normalize(value || "").slice(0, TEXT_RULES[field].max);
    setForm((previous) => ({
      ...previous,
      employeeName: fit("employeeName", emp.fullName) || previous.employeeName,
      employeeEmail: fit("employeeEmail", emp.email) || previous.employeeEmail,
      designation: fit("designation", emp.designation) || previous.designation,
      department: fit("department", emp.department) || previous.department,
      currentCtc: emp.annualCtc != null ? String(emp.annualCtc) : previous.currentCtc,
    }));
    // The values are checked again when you click Generate.
    setFieldErrors((previous) => ({
      ...previous,
      employeeName: "",
      employeeEmail: "",
      designation: "",
      department: "",
    }));
    setIsGenerated(false);
    setIsEditing(false);
  };

  const lookupEmployee = async (employeeId) => {
    if (lastLookup.current === employeeId) return; // already looked up (or in progress)
    lastLookup.current = employeeId;
    setLookupHint("Looking up employee details…");
    try {
      const emp = await appraisalService.lookupEmployee(employeeId);
      if (lastLookup.current !== employeeId) return; // the ID was changed meanwhile
      fillFromEmployee(emp);
      setLookupHint("Details filled in from the employee master. Check them before generating.");
    } catch (requestError) {
      if (lastLookup.current !== employeeId) return;
      if (requestError.response?.status === 404) {
        setLookupHint("No employee found for this ID. Enter the details by hand.");
      } else {
        lastLookup.current = ""; // allow a retry
        console.error("Employee lookup failed:", requestError.response?.data || requestError);
        setLookupHint("Could not look up this employee. Enter the details by hand.");
      }
    }
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
    // A valid Employee ID: fetch the rest of the details.
    if (name === "employeeId" && !rule.validate(form.employeeId)) {
      lookupEmployee(form.employeeId.trim());
    }
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
          hints={{ employeeId: lookupHint }}
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