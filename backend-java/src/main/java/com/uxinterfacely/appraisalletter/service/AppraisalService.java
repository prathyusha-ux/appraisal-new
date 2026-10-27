package com.uxinterfacely.appraisalletter.service;

import com.uxinterfacely.appraisalletter.dto.AppraisalRequest;
import com.uxinterfacely.appraisalletter.exception.ResourceNotFoundException;
import com.uxinterfacely.appraisalletter.model.Appraisal;
import com.uxinterfacely.appraisalletter.repository.AppraisalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppraisalService {

    private final AppraisalRepository repository;
    private final PdfGenerationService pdfGenerationService;
    private final EmailService emailService;

    public AppraisalService(AppraisalRepository repository,
                            PdfGenerationService pdfGenerationService,
                            EmailService emailService) {
        this.repository = repository;
        this.pdfGenerationService = pdfGenerationService;
        this.emailService = emailService;
    }

    public Appraisal save(AppraisalRequest req) {
        Appraisal a = new Appraisal();
        a.setEmployeeName(req.employeeName().trim());
        a.setEmployeeEmail(req.employeeEmail().trim());
        a.setDesignation(req.designation().trim());
        a.setDepartment(req.department().trim());
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
     * Returns the stored client-generated PDF if one was ever uploaded
     * (via savePdf below) — this is the real, possibly-edited letter.
     * Falls back to rebuilding server-side only for older records saved
     * before pdf_data existed, since those never got a client-side copy.
     */
    public byte[] generatePdf(Long id) {
        Appraisal a = getById(id);
        if (a.getPdfData() != null && a.getPdfData().length > 0) {
            return a.getPdfData();
        }
        return pdfGenerationService.generatePdf(a);
    }

    /**
     * Stores the PDF the browser just built (html2canvas + jsPDF) from the
     * rendered letter — called right after Generate, same moment
     * Experience Letter's auto-save fires.
     */
    public Appraisal savePdf(Long id, byte[] pdfBytes) {
        Appraisal appraisal = getById(id);
        appraisal.setPdfData(pdfBytes);
        return repository.save(appraisal);
    }

    /**
     * Emails the PDF the browser just built (reflecting any inline edits
     * made to the letter), and stores it as the record's PDF too, so a
     * later Download gets the same, just-sent version.
     */
    public Appraisal sendEmail(Long id, byte[] pdfBytes) {
        Appraisal appraisal = getById(id);
        appraisal.setPdfData(pdfBytes);
        try {
            emailService.sendAppraisalLetter(appraisal, pdfBytes);
            appraisal.setStatus("sent");
        } catch (RuntimeException e) {
            appraisal.setStatus("failed");
            repository.save(appraisal);
            throw e;
        }
        return repository.save(appraisal);
    }
        /** Emails a PDF built in the browser; marks the saved record as sent if an id is given. */
    public void sendUploadedPdf(Long appraisalId, String to, String employeeName, byte[] pdf) {
        emailService.sendPdf(to, employeeName, pdf);
        if (appraisalId != null) {
            repository.findById(appraisalId).ifPresent(a -> {
                a.setStatus("sent");
                repository.save(a);
            });
        }
    }
}
