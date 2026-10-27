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

    /** Emails the saved appraisal PDF and records whether it was sent. */
    public Appraisal sendEmail(Long id) {
        Appraisal appraisal = getById(id);
        byte[] pdf = pdfGenerationService.generatePdf(appraisal);
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
