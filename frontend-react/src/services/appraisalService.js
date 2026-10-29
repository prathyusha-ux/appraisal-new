import axios from "axios";

// Backend URL + API key. The key must match the backend's SERVER_API_KEY.
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9090"
).replace(/\/+$/, "");
const API_KEY = import.meta.env.VITE_SERVER_API_KEY || "";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  },
  timeout: 90000,
});

const appraisalService = {
  // Wakes up the backend (Render's free plan sleeps when idle)
  wakeUp: async () => {
    await api.get("/api/appraisals/health", { timeout: 120000 });
  },

  // Create and save an appraisal
  createAppraisal: async (data) => {
    const response = await api.post("/api/appraisals", data);
    return response.data;
  },

  // Retrieve an appraisal by ID
  getAppraisal: async (id) => {
    const response = await api.get(`/api/appraisals/${encodeURIComponent(id)}`);
    return response.data;
  },

  // Search saved appraisals by employee name
  searchAppraisals: async (name) => {
    const response = await api.get("/api/appraisals/search", { params: { name } });
    return response.data.results || [];
  },

  // Store the letter PDF (built in the browser) in the database
  uploadPdf: async (id, blob, fileName) => {
    const data = new FormData();
    data.append("file", blob, fileName);
    const response = await api.put(`/api/appraisals/${encodeURIComponent(id)}/pdf`, data, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return response.data;
  },

  // Email the letter PDF that was built in the browser (includes any edits)
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

  // Email the saved appraisal PDF to the employee email stored with the record
  sendAppraisalEmail: async (id) => {
    const response = await api.post(`/api/appraisals/${encodeURIComponent(id)}/email`);
    return response.data;
  },

  // Download appraisal PDF
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
