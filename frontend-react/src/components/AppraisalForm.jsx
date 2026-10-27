import { useCallback, useEffect, useState } from "react";
import appraisalService, { getAppraisals } from "../services/appraisalService";
import EmployeeDetails from "./EmployeeDetails";
import AppraisalLetterPreview from "./AppraisalLetterPreview";
import { buildLetterPdf } from "../utils/letterPdf";

export default function AppraisalForm() {
  const [form, setForm] = useState({
    employeeName: "",
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
  const [pdfStatus, setPdfStatus] = useState("");
  const [savedAppraisalId, setSavedAppraisalId] = useState(null);
  const [appraisals, setAppraisals] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const loadAppraisals = useCallback(async () => {
    setIsLoadingList(true);
    setListError("");
    try {
      const records = await getAppraisals();
      setAppraisals(Array.isArray(records) ? records : []);
    } catch (requestError) {
      setListError(
        requestError.response?.data?.message ||
        "Could not load saved appraisals. Check the backend and database connection."
      );
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadAppraisals();
  }, [loadAppraisals]);

  const updateField = (name, value) => {
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

  const pdfFileName = `${(form.employeeName || "Employee").trim().replace(/\s+/g, "_")}_Appraisal_Letter.pdf`;

  const makeLetterPdf = () => {
    const root = document.getElementById("appraisal-letter");
    if (!root) throw new Error("Generate the letter first.");
    return buildLetterPdf(root);
  };

  // Builds the PDF from the letter on screen and stores it in the database.
  const storePdf = async (id) => {
    setPdfStatus("Saving PDF to the database...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // let the letter finish rendering
      const pdf = await makeLetterPdf();
      await appraisalService.uploadPdf(id, pdf.output("blob"), pdfFileName);
      setPdfStatus("PDF saved to the database.");
    } catch (pdfError) {
      setPdfStatus("");
      setError(
        "Letter saved, but its PDF could not be stored. " +
        (pdfError.response?.data?.message || pdfError.message || "")
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const current = Number(form.currentCtc);
    const revised = Number(form.revisedCtc);

    if (!form.employeeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.employeeEmail)) {
      setError("Enter a valid employee email address.");
      return;
    }
    if (!Number.isFinite(current) || current <= 0) {
      setError("Current Annual CTC must be greater than ₹0.");
      return;
    }
    if (!Number.isFinite(revised) || revised < 0) {
      setError("Revised Annual CTC must be a valid non-negative amount.");
      return;
    }

    // Show the letter straight away (right under the form); saving happens after.
    setError("");
    setEmailMessage("");
    setEmailError("");
    setPdfStatus("");
    setSavedAppraisalId(null);
    setIsEditing(false);
    setLetterVersion((v) => v + 1);
    setIsGenerated(true);

    setIsSaving(true);
    try {
      const payload = {
        ...form,
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
      await loadAppraisals();
    } catch (requestError) {
      setError(
        "Letter generated, but it could not be saved to the database. " +
        (requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Check that the backend is running and the API key and allowed origin are correct.")
      );
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
      await storePdf(savedAppraisalId); // save the edited letter
      await loadAppraisals();
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
      ? ((Number(form.revisedCtc) - Number(form.currentCtc)) / Number(form.currentCtc)) * 100
      : 0;

  return (
    <main className="appraisal-container">
      <form className="form-card" onSubmit={handleSubmit}>
        <EmployeeDetails form={form} updateField={updateField} />

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
      {pdfStatus && <p className="email-success" role="status">{pdfStatus}</p>}
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

      <section className="saved-appraisals" aria-labelledby="saved-appraisals-heading">
        <div className="saved-appraisals-heading">
          <div>
            <h2 id="saved-appraisals-heading">Saved Appraisal Records</h2>
            <p>Records retrieved from the database.</p>
          </div>
          <button type="button"