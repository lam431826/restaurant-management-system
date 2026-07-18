package com.rms.restaurant.module.payroll.service;

import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;

/** Result of computing one employee's pay over a work period (BR-PAY-10). */
public record ComputedPayslip(
        SalaryType salaryType,
        BigDecimal mainSalary,
        BigDecimal overtimeSalary,
        int shiftCount,
        int workedMinutes,
        int otMinutes,
        String snapshotJson
) {}
