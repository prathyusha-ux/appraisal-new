package com.uxinterfacely.appraisalletter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Input fields of the salary-revision appraisal form. */
public record AppraisalRequest(
        // Text fields are checked by AppraisalService so every message matches the form.
        String employeeName,
        String employeeId,
        String employeeEmail,
        String designation,
        String department,

        @NotNull(message = "Current CTC is required")
        @DecimalMin(value = "0.01", message = "Current CTC must be greater than 0") BigDecimal currentCtc,

        @NotNull(message = "Revised CTC is required")
        @DecimalMin(value = "0.00", message = "Revised CTC cannot be negative") BigDecimal revisedCtc,

        @NotNull(message = "Effective date is required") LocalDate effectiveDate,

        @NotNull @DecimalMin("0.00") BigDecimal variablePay,
        @NotNull @DecimalMin("0.00") BigDecimal employeePf,
        @NotNull @DecimalMin("0.00") BigDecimal employerPf,
        @NotNull @DecimalMin("0.00") BigDecimal professionalTax
) {}