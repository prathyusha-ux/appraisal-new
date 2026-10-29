import axios from "axios";

// Backend URL + API key. The key must match the backend's SERVER_API_KEY.
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://appraisal-new-dpq8.onrender.com"
).replace(/\/+$/, "");
const API_KEY = import.meta.env.VITE_SERVER_API_KEY || "uxinterfacely@123";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  },
  timeout: 90000,
});

const appraisalService = {
  // Create and save an appraisal
  createAppraisal: async (data) => {
    const response = await api.post("/api/appraisals", data);
    return response.data;
  },
    // Wakes up the backend (Render's free plan sleeps when idle)
  wakeUp: async () => {
    await api.get("/api/appraisals/health", { timeout: 120000 });
  },
    // Search saved appraisals by employee name
      sendLetterEmail: async ({ to, employeeName, appraisalId, blob, fileName }) => {
    const data = new FormData();
    data.append("to", to);
    data.append("employeeName", employeeName);
    if (appraisalId) data.append("appraisalId", String(appraisalId));
    data.append("file", blob, fileName);
    const response = await api.post("/api/appraisals/send-email", data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return response.data;
  },
  searchAppraisals: async (name) => {
    const response = await api.get("/api/appraisals/search", { params: { name } });
    return response.data.results || [];
  },

  // Retrieve an appraisal by ID
  getAppraisal: async (id) => {
    const response = await api.get(`/api/appraisals/${encodeURIComponent(id)}`);
    return response.data;
  },

  // Uploads the PDF the browser just built (html2canvas + jsPDF) for this
  // appraisal, right after Generate — same moment Experience Letter's
  // auto-save fires. Overwrites any previously stored PDF for this id.
  uploadPdf: async (id, pdfBlob, fileName) => {
    const formData = new FormData();
    formData.append("pdf", pdfBlob, fileName);
    // Content-Type must be left unset (not even "multipart/form-data")
    // so axios/the browser fills in the required boundary= parameter
    // automatically — setting it manually here would break the upload.
    const response = await api.post(
      `/api/appraisals/${encodeURIComponent(id)}/pdf`,
      formData,
      { headers: { "Content-Type": undefined } }
    );
    return response.data;
  },

  // Emails the PDF the browser just built — reflecting any inline edits
  // made to the letter since Generate, since this is a fresh capture of
  // whatever's currently rendered, not a server-side rebuild.
  sendAppraisalEmail: async (id, pdfBlob, fileName) => {
    const formData = new FormData();
    formData.append("pdf", pdfBlob, fileName);
    const response = await api.post(
      `/api/appraisals/${encodeURIComponent(id)}/email`,
      formData,
      { headers: { "Content-Type": undefined } }
    );
    return response.data;
  },

  // Fallback: fetches whatever PDF is stored on the backend for this id
  // (the browser-generated one if uploaded, else the server's old
  // rebuild) — kept for the saved-appraisals table's "Download" column,
  // where there's no live, possibly-edited DOM to capture from directly.
  downloadPdf: async (id) => {
    const response = await api.get(`/api/appraisals/${encodeURIComponent(id)}/pdf`, {
      responseType: "blob",
    });

    const pdfBlob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appraisal-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },
};

// Retrieve all appraisals
export const getAppraisals = async () => {
  const response = await api.get("/api/appraisals");
  return response.data;
};

export default appraisalService;
