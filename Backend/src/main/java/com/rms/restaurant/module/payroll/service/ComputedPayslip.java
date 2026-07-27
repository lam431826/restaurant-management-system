package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;

/** Result of computing one employee's pay over a work period (BR-PAY-10).
 * lateEarlyDeduction is the automatic late/early wage deduction (SHIFT-type only, when
 * AttendanceSetting.latePenaltyEnabled) -- added to the manual violation-penalty total by the
 * caller (PayrollServiceImpl) to form the payslip's final deduction; always ZERO otherwise. */
public record ComputedPayslip(
        SalaryType salaryType,
        BigDecimal mainSalary,
        BigDecimal overtimeSalary,
        int shiftCount,
        int workedMinutes,
        int otMinutes,
        String snapshotJson,
        BigDecimal lateEarlyDeduction
) {}
