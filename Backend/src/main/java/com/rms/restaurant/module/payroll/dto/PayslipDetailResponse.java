package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayslipStatus;
import com.rms.restaurant.common.utils.enums.SalaryPaymentStatus;
import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** UC-PAY-08: full payslip view — income breakdown, attendance detail, payment history. */
public record PayslipDetailResponse(
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
        String sheetId,
        String sheetCode,
        String sheetName,
        LocalDate periodStart,
        LocalDate periodEnd,
        PayrollSheetStatus sheetStatus,
        List<AttendanceDetailRow> attendance,
        List<PaymentResponse> payments
) {}
