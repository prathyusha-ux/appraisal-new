import appraisalService from "../services/appraisalService";

export default function PdfDownloadButton({ appraisalId, disabled }) {
  const downloadPdf = async () => {
    try {
      await appraisalService.downloadPdf(appraisalId);
    } catch {
      window.alert("Could not download the PDF. Please check the backend connection.");
    }
  };

  return (
    <button type="button" disabled={disabled || !appraisalId} onClick={downloadPdf}>
      Download as PDF
    </button>
  );
}