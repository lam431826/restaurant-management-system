package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.SalaryPaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * UC-PAY-07 / BR-PAY-16: one payment action can cover several payslips with a shared
 * time/method/note and a per-payslip amount (partial payment allowed).
 */
public record PayRequest(
        @NotNull LocalDateTime paidAt,
        @NotNull SalaryPaymentMethod method,
        @Size(max = 500) String note,
        @NotEmpty @Valid List<PayItem> items
) {
    public record PayItem(@NotBlank String payslipId, @NotNull BigDecimal amount) {}
}
