package com.uxinterfacely.appraisalletter.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.uxinterfacely.appraisalletter.model.Appraisal;
import com.uxinterfacely.appraisalletter.service.SalaryCalculator.SalaryBreakdown;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Builds the "Employee Performance Appraisal and Salary Revision Letter" PDF.
 * Page 1: details + revised salary table. Page 2: closing text + signature.
 * The wording matches the on-screen letter (AppraisalLetterPreview.jsx).
 */
@Service
public class PdfGenerationService {

    private static final String COMPANY = "UXINTERFACELY IT SOLUTIONS LLP";
    private static final String GST = "GST-36AAIFU2638L1ZQ";

    private static final Color INK = new Color(26, 26, 26);
    private static final Color BLUE = new Color(54, 91, 141);
    private static final Color GRID = new Color(184, 188, 196);
    private static final Color HEADER_BG = new Color(226, 226, 226);

    private final SalaryCalculator salaryCalculator;
    private final NumberFormat money = NumberFormat.getNumberInstance(new Locale("en", "IN"));

    public PdfGenerationService(SalaryCalculator salaryCalculator) {
        this.salaryCalculator = salaryCalculator;
    }

    public byte[] generatePdf(Appraisal a) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 38, 62);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, output);
            writer.setPageEvent(new GstFooterEvent());
            document.open();

            Font body = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, INK);
            Font bold = new Font(Font.HELVETICA, 9.5f, Font.BOLD, INK);
            Font title = new Font(Font.HELVETICA, 11f, Font.BOLD, BLUE);

            addLogo(document);

            Paragraph heading = new Paragraph(
                    "Employee Performance Appraisal and Salary Revision Letter", title);
            heading.setAlignment(Element.ALIGN_CENTER);
            heading.setSpacingAfter(24);
            document.add(heading);

            document.add(new Paragraph("Dear " + safe(a.getEmployeeName(), "[Employee Name]") + ",", body));

            Paragraph greeting = new Paragraph();
            greeting.add(new Phrase("Greetings from ", body));
            greeting.add(new Phrase(COMPANY + "!", bold));
            greeting.setSpacingBefore(8);
            greeting.setSpacingAfter(9);
            document.add(greeting);

            Paragraph intro = new Paragraph(
                    "We are pleased to inform you that, following a review of your performance, "
                    + "contributions, and overall progress during the appraisal period, the management "
                    + "has decided to provide you with a performance appraisal and salary revision. "
                    + "We appreciate your dedication, commitment, and efforts toward achieving the "
                    + "organization's goals. Your contributions to the team and the company are valued, "
                    + "and we encourage you to continue maintaining the same level of professionalism "
                    + "and responsibility in your role.", body);
            intro.setAlignment(Element.ALIGN_JUSTIFIED);
            intro.setLeading(13.2f);
            intro.setSpacingAfter(11);
            document.add(intro);

            Paragraph detailsHeading = new Paragraph("Please find your appraisal details below:", body);
            detailsHeading.setSpacingAfter(8f);
            document.add(detailsHeading);

            BigDecimal current = n(a.getCurrentCtc());
            BigDecimal revised = n(a.getRevisedCtc());
            BigDecimal pct = current.signum() == 0
                    ? BigDecimal.ZERO
                    : revised.subtract(current).multiply(new BigDecimal("100"))
                            .divide(current, 2, RoundingMode.HALF_UP);

            // Two-column table so the gap between bullet and text is consistent.
            PdfPTable details = new PdfPTable(new float[]{18f, 482f});
            details.setWidthPercentage(100);
            details.setSpacingBefore(6f);
            details.setSpacingAfter(13f);
            details.setKeepTogether(true);
            addDetail(details, "Employee Name: " + safe(a.getEmployeeName(), "[Employee Name]"), body);
            addDetail(details, "Designation: " + safe(a.getDesignation(), "[Current Designation]"), body);
            addDetail(details, "Department: " + safe(a.getDepartment(), "[Department Name]"), body);
            addDetail(details, "Current Annual CTC: " + rupee(current) + " per annum", body);
            addDetail(details, "Revised Annual CTC: " + rupee(revised) + " per annum", body);
            addDetail(details, "Increment Percentage: " + pct.toPlainString() + "%", body);
            addDetail(details, "Effective Date: " + (a.getEffectiveDate() == null
                    ? "DD/MM/YYYY"
                    : a.getEffectiveDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))), body);
            document.add(details);

            Paragraph salaryHeading = new Paragraph(
                    "Revised Annual CTC for " + safe(a.getEmployeeName(), "[Employee Name]") + ":", bold);
            salaryHeading.setSpacingBefore(8);
            salaryHeading.setSpacingAfter(8);
            document.add(salaryHeading);

            document.add(buildSalaryTable(a, body, bold));

            // Closing text and sign-off always start on page 2.
            document.newPage();

            addPara(document,
                    "The revised salary will be applicable from the effective date mentioned above. "
                    + "The updated salary structure, including applicable allowances and deductions, "
                    + "will be shared separately or attached to this letter.", body);
            addPara(document,
                    "We expect you to continue improving your skills, taking ownership of your "
                    + "responsibilities, collaborating effectively with your team, and contributing "
                    + "to the company's continued growth and success.", body);
            addPara(document,
                    "Kindly acknowledge receipt of this letter and contact the HR department if you "
                    + "require any clarification regarding your appraisal or revised compensation.", body);
            addPara(document,
                    "Congratulations on your appraisal! We look forward to your continued growth and "
                    + "valuable contributions to " + COMPANY + ".", body);

            Paragraph signoff = new Paragraph(
                    "Yours faithfully,\nFor " + COMPANY + ",", body);
            signoff.setSpacingBefore(18);
            signoff.setSpacingAfter(4);
            signoff.setKeepTogether(true);
            document.add(signoff);

            addSignature(document);

        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate appraisal PDF", e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }
        return output.toByteArray();
    }

    private PdfPTable buildSalaryTable(Appraisal a, Font body, Font bold) {
        SalaryBreakdown s = salaryCalculator.calculate(a.getRevisedCtc(), a.getVariablePay());
        BigDecimal twelve = BigDecimal.valueOf(12);

        PdfPTable table = new PdfPTable(new float[]{2.2f, 1.3f, 1.3f});
        table.setWidthPercentage(92);
        table.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.setHeaderRows(1);
        table.setKeepTogether(true);
        table.setSpacingAfter(12);

        cell(table, "Component", bold, HEADER_BG, Element.ALIGN_CENTER);
        cell(table, "Monthly", bold, HEADER_BG, Element.ALIGN_CENTER);
        cell(table, "Yearly", bold, HEADER_BG, Element.ALIGN_CENTER);

        addSalaryRow(table, "Basic", s.basic(), s.basic().multiply(twelve), body);
        addSalaryRow(table, "House Rent Allowance (HRA)", s.hra(), s.hra().multiply(twelve), body);
        addSalaryRow(table, "Special Allowance", s.specialAllowance(), s.specialAllowance().multiply(twelve), body);
        addSalaryRow(table, "Variable Pay", null, s.annualVariablePay(), body);
        addSalaryRow(table, "Total CTC", s.totalCtcMonthly(), s.totalCtcYearly(), bold);

        cell(table, "Deductions", bold, Color.WHITE, Element.ALIGN_LEFT);
        cell(table, "", body, Color.WHITE, Element.ALIGN_RIGHT);
        cell(table, "", body, Color.WHITE, Element.ALIGN_RIGHT);

        addSalaryRow(table, "PF-Employee", s.employeePf(), s.employeePf().multiply(twelve), body);
        addSalaryRow(table, "PF-Employer", s.employerPf(), s.employerPf().multiply(twelve), body);
        addSalaryRow(table, "Professional Tax", s.professionalTax(), s.professionalTax().multiply(twelve), body);
        addSalaryRow(table, "Total Deductions", s.totalDeductionsMonthly(),
                s.totalDeductionsMonthly().multiply(twelve), bold);
        addSalaryRow(table, "Take Home", s.takeHomeMonthly(), s.takeHomeYearly(), bold);
        return table;
    }

    private void addLogo(Document document) throws Exception {
        Image logo = Image.getInstance(new ClassPathResource("static/assets/company-logo.png").getURL());
        logo.scaleToFit(100, 92);
        logo.setAlignment(Image.ALIGN_LEFT);
        logo.setSpacingAfter(20);
        document.add(logo);
    }

    private void addSignature(Document document) throws Exception {
        Image stamp = Image.getInstance(new ClassPathResource("static/assets/signature.png").getURL());
        stamp.scaleToFit(120, 75);
        stamp.setAlignment(Image.ALIGN_LEFT);
        stamp.setSpacingBefore(4);
        stamp.setSpacingAfter(8);
        document.add(stamp);
    }

    /** GST line + rule drawn at the bottom of every page. */
    private static class GstFooterEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            float left = document.left();
            float right = document.right();
            float y = document.bottom() - 5;

            canvas.saveState();
            canvas.setColorStroke(GRID);
            canvas.setLineWidth(1f);
            canvas.moveTo(left, y + 15);
            canvas.lineTo(right, y + 15);
            canvas.stroke();
            ColumnText.showTextAligned(canvas, Element.ALIGN_CENTER,
                    new Phrase(GST, new Font(Font.HELVETICA, 9f, Font.BOLD, BLUE)),
                    (left + right) / 2, y, 0);
            canvas.restoreState();
        }
    }

    private void addDetail(PdfPTable details, String text, Font font) {
        PdfPCell bullet = new PdfPCell(new Phrase("\u2022", font));
        bullet.setBorder(Rectangle.NO_BORDER);
        bullet.setPaddingLeft(4f);
        bullet.setPaddingRight(0f);
        bullet.setPaddingTop(1f);
        bullet.setPaddingBottom(3f);
        bullet.setVerticalAlignment(Element.ALIGN_TOP);

        PdfPCell content = new PdfPCell(new Phrase(text, font));
        content.setBorder(Rectangle.NO_BORDER);
        content.setPaddingLeft(7f);
        content.setPaddingRight(0f);
        content.setPaddingTop(1f);
        content.setPaddingBottom(3f);
        content.setVerticalAlignment(Element.ALIGN_TOP);

        details.addCell(bullet);
        details.addCell(content);
    }

    private void addPara(Document document, String text, Font font) throws DocumentException {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setAlignment(Element.ALIGN_JUSTIFIED);
        paragraph.setLeading(13.2f);
        paragraph.setSpacingBefore(6);
        paragraph.setSpacingAfter(6);
        document.add(paragraph);
    }

    private void cell(PdfPTable table, String text, Font font, Color background, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(INK);
        cell.setHorizontalAlignment(alignment);
        cell.setBackgroundColor(background);
        table.addCell(cell);
    }

    private void addSalaryRow(PdfPTable table, String name, BigDecimal monthly, BigDecimal yearly, Font font) {
        cell(table, name, font, Color.WHITE, Element.ALIGN_LEFT);
        cell(table, monthly == null ? "\u2014" : fmt(monthly), font, Color.WHITE, Element.ALIGN_RIGHT);
        cell(table, fmt(yearly), font, Color.WHITE, Element.ALIGN_RIGHT);
    }

    private BigDecimal n(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String fmt(BigDecimal value) {
        return money.format(n(value).setScale(0, RoundingMode.HALF_UP));
    }

    /** Matches the on-screen letter: two decimals max, Indian digit grouping. */
    private String rupee(BigDecimal value) {
        NumberFormat f = NumberFormat.getNumberInstance(new Locale("en", "IN"));
        f.setMaximumFractionDigits(2);
        return "Rs. " + f.format(n(value));
    }

    private String safe(String value, String placeholder) {
        return value == null || value.isBlank() ? placeholder : value;
    }
}
