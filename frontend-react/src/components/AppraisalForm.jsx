import { useCallback, useEffect, useState } from "react";
import appraisalService, { getAppraisals } from "../services/appraisalService";
import EmployeeDetails from "./EmployeeDetails";
import AppraisalLetterPreview from "./AppraisalLetterPreview";
import PdfDownloadButton from "./PdfDownloadButton";
import { buildAppraisalPdfBlob } from "../utils/buildPdf";

function getLetterPageEls() {
  return Array.from(document.querySelectorAll("#appraisal-letter .letter-page"));
}

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
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [savedAppraisalId, setSavedAppraisalId] = useState(null);
  const [appraisals, setAppraisals] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

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

    setError("");
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
      setEmailMessage("");
      setEmailError("");
      setIsEditing(false);
      setIsGenerated(true);
      await loadAppraisals();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "Could not save appraisal. Check that the backend and database are running."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!savedAppraisalId) {
      setEmailError("Save the appraisal before sending the email.");
      return;
    }
    setIsSendingEmail(true);
    setEmailMessage("");
    setEmailError("");
    try {
      // Rebuilds the PDF fresh from whatever's currently on screen, so any
      // inline edit made via "Edit Letter" is included — unlike the old
      // version, which just told the backend to regenerate from the
      // original, unedited form data.
      const pageEls = getLetterPageEls();
      const blob = await buildAppraisalPdfBlob(pageEls);
      const safeName = (form.employeeName || "Employee").trim().replace(/\s+/g, "_");
      const result = await appraisalService.sendAppraisalEmail(
        savedAppraisalId,
        blob,
        `${safeName}_Appraisal_Letter.pdf`
      );
      setEmailMessage(result.message || `Appraisal PDF sent to ${form.employeeEmail}.`);
    } catch (requestError) {
      setEmailError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        requestError.message ||
        "Email could not be sent. Check the recipient address and backend SMTP settings."
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Auto-saves the PDF right after Generate (before any editing) — same
  // moment Experience Letter's auto-save fires. Runs once the letter has
  // actually rendered, since the .letter-page elements don't exist in the
  // DOM until after this render commits.
  useEffect(() => {
    if (!isGenerated || !savedAppraisalId) return;
    const pageEls = getLetterPageEls();
    if (pageEls.length === 0) return;

    let cancelled = false;
    (async () => {
      setSaveStatus("Generated ✓ — saving...");
      try {
        const blob = await buildAppraisalPdfBlob(pageEls);
        if (cancelled) return;
        const safeName = (form.employeeName || "Employee").trim().replace(/\s+/g, "_");
        await appraisalService.uploadPdf(savedAppraisalId, blob, `${safeName}_Appraisal_Letter.pdf`);
        if (!cancelled) setSaveStatus("Generated ✓ — saved");
      } catch (err) {
        console.error("Auto-save PDF failed:", err);
        if (!cancelled) setSaveStatus("Generated ✓ (save failed — check console)");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only re-runs when a NEW letter is generated, not on
    // every form change — this is a one-shot auto-save right after Generate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerated, savedAppraisalId]);

  const incrementPercentage =
    Number(form.currentCtc) > 0
      ? ((Number(form.revisedCtc) - Number(form.currentCtc)) /
          Number(form.currentCtc)) *
        100
      : 0;

  return (
    <main className="appraisal-container">
      {!isGenerated && (
        <section className="form-card">
          <h2>Employee Salary Revision</h2>
          <p className="form-intro">
            Fill in all employee and salary revision details, then select
            Generate Appraisal Letter to view the completed letter.
          </p>

          <form onSubmit={handleSubmit}>
            <EmployeeDetails form={form} updateField={updateField} />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="generate-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Generate Appraisal Letter"}
            </button>
          </form>
        </section>
      )}

      {isGenerated && (
        <section className="generated-result">
          <div className="result-toolbar">
            <div>
              <h2>Appraisal Letter Generated</h2>
              <p>
                Increment Percentage:{" "}
                <strong>{incrementPercentage.toFixed(2)}%</strong>
              </p>
              {saveStatus && <p className="save-status">{saveStatus}</p>}
            </div>

            <button
              type="button"
              className={`edit-button${isEditing ? " active" : ""}`}
              onClick={() => setIsEditing((prev) => !prev)}
            >
              {isEditing ? "✓ Done Editing" : "✎ Edit Letter"}
            </button>
          </div>

          {isEditing && (
            <p className="edit-hint">
              Editing on — click directly into the letter text to make changes, then click
              "Done Editing" to lock them in.
            </p>
          )}

          <AppraisalLetterPreview
            form={form}
            incrementPercentage={incrementPercentage}
            salarySettings={form}
            isEditing={isEditing}
          />

          <div className="appraisal-actions">
            <PdfDownloadButton employeeName={form.employeeName} />
            <button
              type="button"
              className="download-button email-send-button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? "Sending Email..." : "Send Appraisal by Email"}
            </button>
          </div>
          {emailMessage && <p className="email-success" role="status">{emailMessage}</p>}
          {emailError && <p className="form-error" role="alert">{emailError}</p>}
        </section>
      )}

      {!isGenerated && <section className="saved-appraisals" aria-labelledby="saved-appraisals-heading">
        <div className="saved-appraisals-heading">
          <div>
            <h2 id="saved-appraisals-heading">Saved Appraisal Records</h2>
            <p>Records retrieved from the database.</p>
          </div>
          <button type="button" className="refresh-button" onClick={loadAppraisals} disabled={isLoadingList}>
            {isLoadingList ? "Loading..." : "Refresh"}
          </button>
        </div>

        {listError && <p className="form-error" role="alert">{listError}</p>}
        {isLoadingList ? (
          <p className="list-message">Loading appraisal records...</p>
        ) : appraisals.length === 0 ? (
          <p className="list-message">No appraisal records found. Generate and save an appraisal to see it here.</p>
        ) : (
          <div className="table-scroll">
            <table className="saved-appraisals-table">
              <thead>
                <tr>
                  <th>ID</th><th>Employee</th><th>Designation</th><th>Department</th>
                  <th>Current CTC (₹)</th><th>Revised CTC (₹)</th><th>Increment</th><th>Effective Date</th><th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {appraisals.map((record) => {
                  const current = Number(record.currentCtc || 0);
                  const revised = Number(record.revisedCtc || 0);
                  const increment = current > 0 ? ((revised - current) / current) * 100 : 0;
                  const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
                  return (
                    <tr key={record.id}>
                      <td>{record.id}</td><td>{record.employeeName}</td><td>{record.designation}</td>
                      <td>{record.department}</td><td>{money(current)}</td><td>{money(revised)}</td>
                      <td>{increment.toFixed(2)}%</td><td>{record.effectiveDate || "—"}</td>
                      <td><button type="button" className="table-download-button" onClick={() => appraisalService.downloadPdf(record.id)}>Download</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </main>
  );
}
