import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function buildLetterPdf(rootElement) {
  const pages = rootElement.querySelectorAll(".letter-page");
  if (pages.length === 0) {
    throw new Error("Generate the letter first.");
  }

  const wasEditing = rootElement.classList.contains("editing");
  rootElement.classList.remove("editing");

  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i += 1) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/jpeg", 0.9);

      let width = pageWidth;
      let height = (canvas.height * width) / canvas.width;
      if (height > pageHeight) {
        height = pageHeight;
        width = (canvas.width * height) / canvas.height;
      }

      if (i > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", (pageWidth - width) / 2, 0, width, height);
    }
    return pdf;
  } finally {
    if (wasEditing) rootElement.classList.add("editing");
  }
}