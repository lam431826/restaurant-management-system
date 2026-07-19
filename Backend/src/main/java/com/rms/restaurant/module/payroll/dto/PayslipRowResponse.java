package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.common.utils.enums.SalaryPaymentStatus;
import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;

public record PayslipRowResponse(
        String id,
        String code,
        String employeeId,
        String employeeCode,
        String employeeName,
        SalaryType salaryType,
        BigDecimal mainSalary,
        BigDecimal overtimeSalary,
        BigDecimal deduction,
        BigDecimal total,
        BigDecimal paidAmount,
        BigDecimal remaining,
        SalaryPaymentStatus paymentStatus,
        PayslipStatus status,
        int shiftCount,
        int workedMinutes,
        int otMinutes,
        boolean mainOverridden,
        boolean overtimeOverridden,
        boolean deductionOverridden
) {}
