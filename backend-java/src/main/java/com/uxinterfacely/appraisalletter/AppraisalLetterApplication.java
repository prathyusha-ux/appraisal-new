package com.uxinterfacely.appraisalletter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point — equivalent to server.js's app.listen(PORT, ...) call in
 * the Node.js Offer Letter backend. Spring Boot handles the HTTP server
 * startup, dependency injection, and config loading automatically once
 * this main() method runs.
 */
@SpringBootApplication
public class AppraisalLetterApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppraisalLetterApplication.class, args);
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
