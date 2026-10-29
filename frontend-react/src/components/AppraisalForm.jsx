import { useState } from "react";
import appraisalService from "../services/appraisalService";
import EmployeeDetails from "./EmployeeDetails";
import AppraisalLetterPreview from "./AppraisalLetterPreview";
import { buildLetterPdf } from "../utils/letterPdf";
import { useEffect, useState } from "react";

  useEffect(() => {
    appraisalService.wakeUp().catch(() => {}); // warm up the server in the background
  }, []);

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
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "failed"
  const [statusLabel, setStatusLabel] = useState("Generated");
  const [savedAppraisalId, setSavedAppraisalId] = useState(null);

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