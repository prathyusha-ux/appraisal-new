package com.uxinterfacely.appraisalletter.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "appraisal_pdfs")
public class AppraisalPdf {

    @Id
    @Column(name = "appraisal_id")
    private Long appraisalId;

    @Column(name = "pdf_data", nullable = false)
    private byte[] pdfData;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public AppraisalPdf() {}

    public AppraisalPdf(Long appraisalId, byte[] pdfData) {
        this.appraisalId = appraisalId;
        this.pdfData = pdfData;
    }

    public Long getAppraisalId() { return appraisalId; }
    public void setAppraisalId(Long appraisalId) { this.appraisalId = appraisalId; }
    public byte[] getPdfData() { return pdfData; }
    public void setPdfData(byte[] pdfData) { this.pdfData = pdfData; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
