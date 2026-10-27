package com.uxinterfacely.appraisalletter.controller;

import com.uxinterfacely.appraisalletter.dto.AppraisalRequest;
import com.uxinterfacely.appraisalletter.model.Appraisal;
import com.uxinterfacely.appraisalletter.service.AppraisalService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.util.List;
import java.util.Map;

/**
 *   POST /api/appraisals            save an appraisal
 *   GET  /api/appraisals            list saved appraisals (newest first)
 *   GET  /api/appraisals/search     search by employee name
 *   GET  /api/appraisals/{id}       one appraisal
 *   GET  /api/appraisals/{id}/pdf   download the letter as PDF
 *   PUT  /api/appraisals/{id}/pdf   store the letter PDF (multipart "file") in the database
 *   POST /api/appraisals/{id}/email email the PDF to the employee
 *   POST /api/appraisals/send-email email a PDF built in the browser (multipart)
 *   GET  /api/appraisals/health     health check
 */
@RestController
@RequestMapping("/api/appraisals")
public class AppraisalController {

    private final AppraisalService service;

    public AppraisalController(AppraisalService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping
    public ResponseEntity<Appraisal> create(@Valid @RequestBody AppraisalRequest request) {
        return ResponseEntity.status(201).body(service.save(request));
    }

    @GetMapping
    public List<Appraisal> listAll() {
        return service.findAll();
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String name) {
        if (name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "A name query parameter is required."));
        }
        return ResponseEntity.ok(Map.of("success", true, "results", service.searchByName(name)));
    }

    @GetMapping("/{id}")
    public Appraisal getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        Appraisal a = service.getById(id);
        String fileName = a.getEmployeeName().trim().replaceAll("\\s+", "_") + "_Appraisal_Letter.pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName).build().toString())
                .body(service.generatePdf(id));
    }

    @PutMapping(value = "/{id}/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadPdf(@PathVariable Long id,
                                         @RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("The PDF file is empty.");
        }
        service.savePdf(id, file.getBytes());
        return Map.of("status", "saved", "message", "PDF saved to the database.");
    }

    @PostMapping("/{id}/email")
    public Map<String, String> sendEmail(@PathVariable Long id) {
        Appraisal a = service.sendEmail(id);
        return Map.of("status", a.getStatus(),
                "message", "Appraisal PDF sent to " + a.getEmployeeEmail() + ".");
    }

    @PostMapping(value = "/send-email", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> sendEmailWithPdf(
            @RequestParam("to") String to,
            @RequestParam("employeeName") String employeeName,
            @RequestParam(value = "appraisalId", required = false) Long appraisalId,
            @RequestParam("file") MultipartFile file) throws IOException {
        if (!to.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid recipient email address.");
        }
        if (file.isEmpty()) {
            throw new IllegalArgumentException("The PDF file is empty.");
        }
        service.sendUploadedPdf(appraisalId, to.trim(), employeeName, file.getBytes());
        return Map.of("status", "sent", "message", "Appraisal PDF sent to " + to.trim() + ".");
    }
}
