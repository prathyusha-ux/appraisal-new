// Builds the appraisal letter PDF entirely in the browser — a screenshot
// (via html2canvas) of each .letter-page element, assembled into a PDF
// (via jsPDF). This is the same approach Experience Letter uses, chosen
// specifically so inline edits made to the rendered letter (contentEditable)
// actually show up in the PDF — the old approach (Java rebuilding the PDF
// server-side from structured form fields) had no way to see those edits
// at all, since the server never received any free-text content.
//
// Requires: npm install html2canvas jspdf

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PX_TO_MM = 25.4 / 96;
const RENDER_SCALE = 3;
const JPEG_QUALITY = 0.95;

/**
 * @param {HTMLElement[]} pageEls - the .letter-page elements to capture, in order
 * @returns {Promise<Blob>} the finished PDF as a Blob
 */
export async function buildAppraisalPdfBlob(pageEls) {
  if (!pageEls || pageEls.length === 0) {
    throw new Error("Nothing to export — generate the letter first.");
  }

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  let pdf = null;

  for (let i = 0; i < pageEls.length; i++) {
    const pageEl = pageEls[i];

    // Pinned to the element's own exact box, same fix Experience Letter
    // needed — relying on window scroll/viewport size produced an
    // inconsistently cropped capture depending on where the page
    // happened to be scrolled to when the button was clicked.
    const canvas = await html2canvas(pageEl, {
      scale: RENDER_SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      width: pageEl.offsetWidth,
      height: pageEl.offsetHeight,
      windowWidth: pageEl.offsetWidth,
      windowHeight: pageEl.offsetHeight,
    });

    const widthMm = (canvas.width / RENDER_SCALE) * PX_TO_MM;
    const heightMm = (canvas.height / RENDER_SCALE) * PX_TO_MM;
    const imgData = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    if (!pdf) {
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [widthMm, heightMm] });
    } else {
      pdf.addPage([widthMm, heightMm], "portrait");
    }
    pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
  }

  return pdf.output("blob");
}

/**
 * Builds the PDF and triggers a browser download directly — no backend
 * call at all, matching Experience Letter's "Download as PDF" button.
 */
export async function downloadAppraisalPdf(pageEls, fileName) {
  const blob = await buildAppraisalPdfBlob(pageEls);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
