package com.uxinterfacely.appraisalletter.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** The PDF columns of appraisal_table, kept as a separate entity so lists never load the PDF bytes. */
@Entity
@Table(name = "appraisal_table")
public class AppraisalPdf {

    @Id
    @Column(name = "id")
    private Long appraisalId;

    @Column(name = "pdf_data")
    private byte[] pdfData;

    @Column(name = "pdf_updated_at")
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