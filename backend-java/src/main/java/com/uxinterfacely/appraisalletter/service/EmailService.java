package com.uxinterfacely.appraisalletter.service;

import com.uxinterfacely.appraisalletter.model.Appraisal;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/** Emails the generated appraisal PDF to the employee's email address. */
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.from-email}")
    private String fromEmail;

    @Value("${app.company-name}")
    private String companyName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** Sends the saved record's letter (PDF generated on the server). */
    public void sendAppraisalLetter(Appraisal appraisal, byte[] pdfBytes) {
        sendPdf(appraisal.getEmployeeEmail(), appraisal.getEmployeeName(), pdfBytes);
    }

    /** Sends any appraisal PDF, e.g. the one built in the browser after editing. */
    public void sendPdf(String to, String employeeName, byte[] pdfBytes) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Employee email address is missing.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Appraisal Letter - " + employeeName);
            helper.setText(buildEmailBodyHtml(employeeName), true);

            String fileName = employeeName.trim().replaceAll("\\s+", "_") + "_Appraisal_Letter.pdf";
            helper.addAttachment(fileName, new jakarta.mail.util.ByteArrayDataSource(pdfBytes, "application/pdf"));

            mailSender.send(message);
        } catch (MessagingException | MailException e) {
            throw new IllegalStateException("Unable to send appraisal email. Check SMTP settings.", e);
        }
    }

    private String buildEmailBodyHtml(String employeeName) {
        return """
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111111;">
                  <p>Dear %s,</p>
                  <p>Please find attached your appraisal and salary revision letter.</p>
                  <p>Regards,<br>HR Department<br><strong>%s</strong></p>
                </div>
                """.formatted(employeeName, companyName);
    }
}
