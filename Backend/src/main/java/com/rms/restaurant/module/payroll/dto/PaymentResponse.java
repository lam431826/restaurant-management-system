package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.SalaryPaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        String id,
        String voucherCode,
        String payslipId,
        String payslipCode,
        String employeeName,
        BigDecimal amount,
        SalaryPaymentMethod method,
        LocalDateTime paidAt,
        String note,
        String createdBy
) {}
