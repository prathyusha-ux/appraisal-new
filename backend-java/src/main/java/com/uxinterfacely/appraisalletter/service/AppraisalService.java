package com.uxinterfacely.appraisalletter.service;

import com.uxinterfacely.appraisalletter.dto.AppraisalRequest;
import com.uxinterfacely.appraisalletter.exception.ResourceNotFoundException;
import com.uxinterfacely.appraisalletter.model.Appraisal;
import com.uxinterfacely.appraisalletter.model.AppraisalPdf;
import com.uxinterfacely.appraisalletter.repository.AppraisalPdfRepository;
import com.uxinterfacely.appraisalletter.repository.AppraisalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppraisalService {

    private final AppraisalRepository repository;
    private final AppraisalPdfRepository pdfRepository;
    private final PdfGenerationService pdfGenerationService;
    private final EmailService emailService;

    public AppraisalService(AppraisalRepository repository,
                            AppraisalPdfRepository pdfRepository,
                            PdfGenerationService pdfGenerationService,
                            EmailService emailService) {
        this.repository = repository;
        this.pdfRepository = pdfRepository;
        this.pdfGenerationService = pdfGenerationService;
        this.emailService = emailService;
    }

    // ---------------------------------------------------------------
    // Field rules. These repeat the rules of the form (utils/validation.js),
    // so a request that skips the form is still checked.
    // ---------------------------------------------------------------

    private static void fail(String message) {
        throw new IllegalArgumentException(message);
    }

    /** Trims both ends and turns runs of spaces into one space. */
    private static String normalizeSpaces(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    /** Letters and single spaces, 3 to 60 characters. Extra spaces are fixed, not rejected. */
    private static String cleanName(String raw) {
        if (raw == null || raw.isEmpty()) {
            fail("Employee name is mandatory");
        }
        if (raw.trim().isEmpty()) {
            fail("Name is required");
        }
        String name = normalizeSpaces(raw);
        if (name.chars().anyMatch(Character::isDigit)) {
            fail("Numbers are not allowed");
        }
        if (!name.matches("^\\p{L}+( \\p{L}+)*$")) {
            fail("Special characters not allowed");
        }
        if (name.length() < 3) {
            fail("Name must be at least 3 characters");
        }
        if (name.length() > 60) {
            fail("Name should not exceed 60 characters");
        }
        return name;
    }

    /** Letters, numbers and hyphens only, 2 to 20 characters. */
    private static String cleanEmployeeId(String raw) {
        String id = raw == null ? "" : raw.trim();
        if (id.isEmpty()) {
            fail("Employee ID is mandatory");
        }
        if (!id.matches("^[A-Za-z0-9-]+$")) {
            fail("Only letters, numbers and hyphens are allowed");
        }
        if (id.length() < 2) {
            fail("Employee ID must be at least 2 characters");
        }
        if (id.length() > 20) {
            fail("Employee ID should not exceed 20 characters");
        }
        return id;
    }

    /** Valid format, no spaces, at most 100 characters. Saved in lower case. */
    private static String cleanEmail(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            fail("Email is required");
        }
        String email = raw.trim();
        if (email.chars().anyMatch(Character::isWhitespace)) {
            fail("Spaces are not allowed");
        }
        if (email.length() > 100) {
            fail("Email length should not exceed 100 characters");
        }
        if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$")) {
            fail("Invalid email format");
        }
        return email.toLowerCase(java.util.Locale.ROOT);
    }

    /** Letters and single spaces, 2 to 50 characters. */
    private static String cleanDepartment(String raw) {
        String text = normalizeSpaces(raw);
        if (text.isEmpty()) {
            fail("Department is mandatory");
        }
        if (text.chars().anyMatch(Character::isDigit)) {
            fail("Numbers are not allowed");
        }
        if (!text.matches("^\\p{L}+( \\p{L}+)*$")) {
            fail("Special characters not allowed");
        }
        if (text.length() < 2) {
            fail("Department must be at least 2 characters");
        }
        if (text.length() > 50) {
            fail("Department should not exceed 50 characters");
        }
        return text;
    }

    /** Letters separated by single spaces or hyphens, 2 to 60 characters, not one repeated letter. */
    private static String cleanDesignation(String raw) {
        String text = normalizeSpaces(raw);
        if (text.isEmpty()) {
            fail("Designation is mandatory");
        }
        if (text.chars().anyMatch(Character::isDigit)) {
            fail("Numbers are not allowed");
        }
        if (!text.matches("^\\p{L}+([ -]\\p{L}+)*$")) {
            fail("Special characters not allowed");
        }
        String letters = text.replace(" ", "").replace("-", "").toLowerCase(java.util.Locale.ROOT);
        if (letters.length() >= 3 && letters.chars().distinct().count() == 1) {
            fail("Enter a valid designation");
        }
        if (text.length() < 2) {
            fail("Designation must be at least 2 characters");
        }
        if (text.length() > 60) {
            fail("Designation should not exceed 60 characters");
        }
        return text;
    }

    public Appraisal save(AppraisalRequest req) {
        Appraisal a = new Appraisal();
        a.setEmployeeName(cleanName(req.employeeName()));
        a.setEmployeeId(cleanEmployeeId(req.employeeId()));
        a.setEmployeeEmail(cleanEmail(req.employeeEmail()));
        a.setDesignation(cleanDesignation(req.designation()));
        a.setDepartment(cleanDepartment(req.department()));
        a.setCurrentCtc(req.currentCtc());
        a.setRevisedCtc(req.revisedCtc());
        a.setEffectiveDate(req.effectiveDate());
        a.setVariablePay(req.variablePay());
        a.setEmployeePf(req.employeePf());
        a.setEmployerPf(req.employerPf());
        a.setProfessionalTax(req.professionalTax());
        a.setStatus("saved");
        return repository.save(a);
    }

    public Appraisal getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal " + id + " not found."));
    }

    public List<Appraisal> findAll() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    public List<Appraisal> searchByName(String name) {
        return repository.findByEmployeeNameContainingIgnoreCaseOrderByCreatedAtDesc(name);
    }

    /**
     * Returns the PDF stored in the database (the letter as built and edited
     * in the browser). Records saved before PDFs were stored fall back to a
     * server-built PDF.
     */
    public byte[] generatePdf(Long id) {
        Appraisal appraisal = getById(id);
        return pdfRepository.findById(id)
                .map(AppraisalPdf::getPdfData)
                .orElseGet(() -> pdfGenerationService.generatePdf(appraisal));
    }

    /** Stores (or replaces) the PDF for an appraisal. */
    public void savePdf(Long id, byte[] pdfBytes) {
        getById(id); // 404 if the appraisal does not exist
        pdfRepository.save(new AppraisalPdf(id, pdfBytes));
    }

    /** Emails the stored appraisal PDF (or a server-built one for older records) and records whether it was sent. */
    public Appraisal sendEmail(Long id) {
        Appraisal appraisal = getById(id);
        byte[] pdf = generatePdf(id);
        try {
            emailService.sendAppraisalLetter(appraisal, pdf);
            appraisal.setStatus("sent");
        } catch (RuntimeException e) {
            appraisal.setStatus("failed");
            repository.save(appraisal);
            throw e;
        }
        return repository.save(appraisal);
    }

    /** Emails a PDF built in the browser; stores it and marks the record as sent if an id is given. */
    public void sendUploadedPdf(Long appraisalId, String to, String employeeName, byte[] pdf) {
        if (appraisalId != null) {
            savePdf(appraisalId, pdf); // keep the sent version as the stored one
        }
        emailService.sendPdf(to, employeeName, pdf);
        if (appraisalId != null) {
            repository.findById(appraisalId).ifPresent(a -> {
                a.setStatus("sent");
                repository.save(a);
            });
        }
    }
}