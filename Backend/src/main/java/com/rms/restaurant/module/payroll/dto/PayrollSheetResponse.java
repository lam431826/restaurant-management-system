package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.PayrollScope;
import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import com.rms.restaurant.common.utils.enums.SalaryPaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PayrollSheetResponse(
        String id,
        String code,
        String name,
        PayrollTerm term,
        LocalDate periodStart,
        LocalDate periodEnd,
        PayrollScope scope,
        PayrollSheetStatus status,
        SalaryPaymentStatus paymentStatus,
        int employeeCount,
        BigDecimal total,
        BigDecimal paid,
        BigDecimal remaining,
        String note,
        String createdBy,
        String finalizedBy,
        LocalDateTime finalizedAt,
        LocalDateTime dataRefreshedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
