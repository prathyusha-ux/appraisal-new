import { useState } from "react";
import { downloadAppraisalPdf } from "../utils/buildPdf";

/**
 * Builds the PDF directly from the currently rendered letter (including
 * any inline edits) and downloads it — no backend call at all, matching
 * Experience Letter's "Download as PDF" button exactly.
 */
export default function PdfDownloadButton({ employeeName }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPdf = async () => {
    const pageEls = Array.from(document.querySelectorAll("#appraisal-letter .letter-page"));
    if (pageEls.length === 0) {
      window.alert("Generate the appraisal letter first.");
      return;
    }

    setIsDownloading(true);
    try {
      const safeName = (employeeName || "Employee").trim().replace(/\s+/g, "_");
      await downloadAppraisalPdf(pageEls, `${safeName}_Appraisal_Letter.pdf`);
    } catch (err) {
      window.alert(
        "Something went wrong generating the PDF.\n\nDetails: " + (err && err.message ? err.message : err)
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button type="button" className="download-button" onClick={downloadPdf} disabled={isDownloading}>
      {isDownloading ? "Preparing PDF..." : "Download Appraisal PDF"}
    </button>
  );
}
