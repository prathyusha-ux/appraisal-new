package com.uxinterfacely.appraisalletter.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

/**
 * The PDF columns of appraisal_table. The file itself lives in the Supabase
 * Storage bucket; only its path is kept here. It is a separate entity so that
 * lists and searches never touch these columns.
 */
@Entity
@Table(name = "appraisal_table")
public class AppraisalPdf {

    @Id
    @Column(name = "id")
    private Long appraisalId;

    @Column(name = "pdf_path")
    private String pdfPath;

    @Column(name = "pdf_updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public AppraisalPdf() {}

    public AppraisalPdf(Long appraisalId, String pdfPath) {
        this.appraisalId = appraisalId;
        this.pdfPath = pdfPath;
    }

    public Long getAppraisalId() { return appraisalId; }
    public void setAppraisalId(Long appraisalId) { this.appraisalId = appraisalId; }
    public String getPdfPath() { return pdfPath; }
    public void setPdfPath(String pdfPath) { this.pdfPath = pdfPath; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}