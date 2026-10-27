import { useCallback, useEffect, useRef, useState } from "react";
import appraisalService, { getAppraisals } from "../services/appraisalService";
import EmployeeDetails from "./EmployeeDetails";
import AppraisalLetterPreview from "./AppraisalLetterPreview";
import PdfDownloadButton from "./PdfDownloadButton";

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

  const formTop = useRef(null);
  const letterRef = useRef(null);

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

    // Show the letter straight away; saving to the database happens after.
    setError("");
    setEmailMessage("");
    setEmailError("");
    setSavedAppraisalId(null);
    setIsGenerated(true);
    setTimeout(() => {
      letterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

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
      await loadAppraisals();
    } catch (requestError) {
      setError(
        "Letter generated, but it could not be saved, so PDF download and email are unavailable. " +
        (requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Check that the backend is running and the API key and allowed origin are correct.")
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
      const result = await appraisalService.sendAppraisalEmail(savedAppraisalId);
      setEmailMessage(result.message || `Appraisal PDF sent to ${form.employeeEmail}.`);
    } catch (requestError) {
      setEmailError(
        requestError.response?.data?.message ||
        requestError.response?.data?.error ||
        "Email could not be sent. Check the recipient address and backend SMTP settings."
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const incrementPercentage =
    Number(form.currentCtc) > 0
      ? ((Number(form.revisedCtc) - Number(form.currentCtc)) / Number(form.currentCtc)) * 100
      : 0;

  const editDetails = () => {
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formTop.current?.querySelector("input")?.focus({ preventScroll: true });
  };

  return (
    <main className="appraisal-container">
      <form className="form-card" ref={formTop} onSubmit={handleSubmit}>
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
        <PdfDownloadButton appraisalId={savedAppraisalId} disabled={!isGenerated} />
        <button type="button" className="btn-green" onClick={editDetails}>
          ✎ Edit Details
        </button>
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={!isGenerated || !savedAppraisalId || isSendingEmail}
        >
          {isSendingEmail ? "Sending..." : "✉ Email Appraisal Letter"}
        </button>
      </div>
      {emailMessage && <p className="email-success" role="status">{emailMessage}</p>}
      {emailError && <p className="form-error center-error" role="alert">{emailError}</p>}

      {isGenerated ? (
        <div ref={letterRef}>
          <AppraisalLetterPreview
            form={form}
            incrementPercentage={incrementPercentage}
            salarySettings={form}
          />
        </div>
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
          <button type="button" onClick={loadAppraisals} disabled={isLoadingList}>
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
                  <th>Current CTC (₹)</th><th>Revised CTC (₹)</th><th>Increment</th>
                  <th>Effective Date</th><th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {appraisals.map((record) => {
                  const current = Number(record.currentCtc || 0);
                  const revised = Number(record.revisedCtc || 0);
                  const increment = current > 0 ? ((revised - current) / current) * 100 : 0;
                  const money = (value) =>
                    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
                  return (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.employeeName}</td>
                      <td>{record.designation}</td>
                      <td>{record.department}</td>
                      <td>{money(current)}</td>
                      <td>{money(revised)}</td>
                      <td>{increment.toFixed(2)}%</td>
                      <td>{record.effectiveDate || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="table-download-button"
                          onClick={() => appraisalService.downloadPdf(record.id)}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
