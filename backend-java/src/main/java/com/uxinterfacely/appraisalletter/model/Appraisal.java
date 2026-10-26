package com.uxinterfacely.appraisalletter.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "appraisals")
public class Appraisal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_name", nullable = false)
    private String employeeName;

    @Column(name = "employee_email")
    private String employeeEmail;

    @Column(name = "designation", nullable = false)
    private String designation;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "current_ctc", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentCtc;

    @Column(name = "revised_ctc", nullable = false, precision = 12, scale = 2)
    private BigDecimal revisedCtc;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "variable_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal variablePay = BigDecimal.ZERO;

    @Column(name = "employee_pf", precision = 12, scale = 2)
    private BigDecimal employeePf;

    @Column(name = "employer_pf", precision = 12, scale = 2)
    private BigDecimal employerPf;

    @Column(name = "professional_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal professionalTax = new BigDecimal("200");

    /** saved | sent | failed */
    @Column(name = "status", nullable = false)
    private String status = "saved";

    /**
     * The actual PDF as generated client-side (html2canvas + jsPDF) from
     * the rendered — and possibly edited — letter. Null for any record
     * saved before this existed, in which case the backend falls back to
     * PdfGenerationService's server-side rebuild.
     *
     * Deliberately NOT @Lob: on PostgreSQL, Hibernate's @Lob on byte[]
     * expects the old-style Large Object storage (an "oid" column, with
     * data in a separate pg_largeobject table) — not the same thing as a
     * plain "bytea" column, which is what the Flyway migration actually
     * created and what we want (simpler, no separate large-object
     * cleanup to worry about). @JdbcTypeCode(VARBINARY) maps directly to
     * bytea instead.
     */
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "pdf_data")
    private byte[] pdfData;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public String getEmployeeEmail() { return employeeEmail; }
    public void setEmployeeEmail(String employeeEmail) { this.employeeEmail = employeeEmail; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public BigDecimal getCurrentCtc() { return currentCtc; }
    public void setCurrentCtc(BigDecimal currentCtc) { this.currentCtc = currentCtc; }
    public BigDecimal getRevisedCtc() { return revisedCtc; }
    public void setRevisedCtc(BigDecimal revisedCtc) { this.revisedCtc = revisedCtc; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public BigDecimal getVariablePay() { return variablePay; }
    public void setVariablePay(BigDecimal variablePay) { this.variablePay = variablePay; }
    public BigDecimal getEmployeePf() { return employeePf; }
    public void setEmployeePf(BigDecimal employeePf) { this.employeePf = employeePf; }
    public BigDecimal getEmployerPf() { return employerPf; }
    public void setEmployerPf(BigDecimal employerPf) { this.employerPf = employerPf; }
    public BigDecimal getProfessionalTax() { return professionalTax; }
    public void setProfessionalTax(BigDecimal professionalTax) { this.professionalTax = professionalTax; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public byte[] getPdfData() { return pdfData; }
    public void setPdfData(byte[] pdfData) { this.pdfData = pdfData; }
}

    

