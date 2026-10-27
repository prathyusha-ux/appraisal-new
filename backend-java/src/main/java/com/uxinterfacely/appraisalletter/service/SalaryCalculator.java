package com.uxinterfacely.appraisalletter.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Salary rules for the revised CTC (identical to the frontend's
 * utils/salaryCalculator.js, so the on-screen letter and the PDF match):
 *   Basic            = 50% of monthly CTC
 *   HRA              = 40% of Basic
 *   PF (emp + empr)  = 3,000 if Basic >= 25,000, else 12% of Basic
 *   Special Allow.   = Monthly CTC - Basic - HRA - Employer PF
 *   Total CTC        = Basic + HRA + Special Allowance
 *   Deductions       = Employee PF + Employer PF + Professional Tax (200)
 *   Take Home        = Total CTC - Deductions
 * All amounts are monthly unless the name says "annual".
 */
@Component
public class SalaryCalculator {

    private static final int SCALE = 6;
    private static final BigDecimal TWELVE = BigDecimal.valueOf(12);
    private static final BigDecimal PF_LIMIT = new BigDecimal("25000");
    private static final BigDecimal PF_FIXED = new BigDecimal("3000");
    private static final BigDecimal PF_RATE = new BigDecimal("0.12");
    private static final BigDecimal PROFESSIONAL_TAX = new BigDecimal("200");

    public SalaryBreakdown calculate(BigDecimal annualRevisedCtc, BigDecimal annualVariablePay) {
        if (annualRevisedCtc == null || annualRevisedCtc.signum() < 0) {
            throw new IllegalArgumentException("Revised CTC must be a valid non-negative amount.");
        }
        BigDecimal variable = annualVariablePay == null ? BigDecimal.ZERO : annualVariablePay.max(BigDecimal.ZERO);

        BigDecimal monthlyCtc = annualRevisedCtc.divide(TWELVE, SCALE, RoundingMode.HALF_UP);
        BigDecimal basic = monthlyCtc.multiply(new BigDecimal("0.5"));
        BigDecimal hra = basic.multiply(new BigDecimal("0.4"));
        BigDecimal pf = basic.compareTo(PF_LIMIT) >= 0 ? PF_FIXED : basic.multiply(PF_RATE);
        BigDecimal special = monthlyCtc.subtract(basic).subtract(hra).subtract(pf);

        BigDecimal totalCtc = basic.add(hra).add(special);
        BigDecimal deductions = pf.add(pf).add(PROFESSIONAL_TAX);
        BigDecimal takeHome = totalCtc.subtract(deductions);

        return new SalaryBreakdown(basic, hra, special, pf, pf, PROFESSIONAL_TAX,
                totalCtc, totalCtc.multiply(TWELVE).add(variable), variable,
                deductions, takeHome, takeHome.multiply(TWELVE).add(variable));
    }

    public record SalaryBreakdown(
            BigDecimal basic,
            BigDecimal hra,
            BigDecimal specialAllowance,
            BigDecimal employeePf,
            BigDecimal employerPf,
            BigDecimal professionalTax,
            BigDecimal totalCtcMonthly,
            BigDecimal totalCtcYearly,
            BigDecimal annualVariablePay,
            BigDecimal totalDeductionsMonthly,
            BigDecimal takeHomeMonthly,
            BigDecimal takeHomeYearly
    ) {}
}
