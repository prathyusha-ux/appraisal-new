package com.uxinterfacely.appraisalletter.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Input fields of the salary-revision appraisal form. */
public record AppraisalRequest(
        @NotBlank(message = "Employee name is required") String employeeName,
        @NotBlank(message = "Employee email is required")
        @Email(message = "Enter a valid employee email address") String employeeEmail,
        @NotBlank(message = "Designation is required") String designation,
        @NotBlank(message = "Department is required") String department,

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
