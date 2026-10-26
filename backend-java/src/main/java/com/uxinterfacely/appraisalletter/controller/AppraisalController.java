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
 *   GET  /api/appraisals/{id}/pdf   download the letter as PDF (the
 *                                   browser-generated one if uploaded,
 *                                   else a server-side rebuild as fallback)
 *   POST /api/appraisals/{id}/pdf   upload the browser-generated PDF —
 *                                   called right after Generate, same as
 *                                   Experience Letter's auto-save
 *   POST /api/appraisals/{id}/email email the uploaded PDF to the employee
 *                                   (multipart body, field name "pdf")
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

    /**
     * Stores the PDF the browser just built from the rendered letter.
     * Called automatically right after Generate (before any editing),
     * same moment Experience Letter's auto-save fires.
     */
    @PostMapping("/{id}/pdf")
    public ResponseEntity<Appraisal> uploadPdf(@PathVariable Long id,
                                                @RequestParam("pdf") MultipartFile pdfFile) throws IOException {
        if (pdfFile.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(service.savePdf(id, pdfFile.getBytes()));
    }

    /**
     * Emails whatever PDF the browser just built — which reflects any
     * inline edits made to the letter since Generate, unlike the old
     * version of this endpoint which silently rebuilt the PDF server-side
     * from the original, unedited form data.
     */
    @PostMapping("/{id}/email")
    public Map<String, String> sendEmail(@PathVariable Long id,
                                          @RequestParam("pdf") MultipartFile pdfFile) throws IOException {
        if (pdfFile.isEmpty()) {
            return Map.of("message", "No PDF was attached to the request.");
        }
        Appraisal a = service.sendEmail(id, pdfFile.getBytes());
        return Map.of("status", a.getStatus(),
                "message", "Appraisal PDF sent to " + a.getEmployeeEmail() + ".");
    }
}
