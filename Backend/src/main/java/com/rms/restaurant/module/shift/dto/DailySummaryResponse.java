package com.rms.restaurant.module.shift.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// CS-05: consolidated daily summary aggregating all cashiers' shifts for a date.
public record DailySummaryResponse(
        LocalDate date,
        boolean incomplete,          // BR-CS-10: true if any shift is still OPEN/PENDING_RECON
        int shiftCount,
        BigDecimal totalRevenue,
        BigDecimal totalCashIn,
        BigDecimal totalCashOut,
        BigDecimal totalVariance,
        List<MethodTotal> methodTotals,    // Tầng 1 — day totals by payment method
        List<CashierShiftRow> shifts       // Tầng 2 — per-cashier breakdown
) {
    public record MethodTotal(
            PaymentMethod method,
            BigDecimal expected,
            BigDecimal actual,
            BigDecimal variance
    ) {}

    public record CashierShiftRow(
            String shiftId,
            String cashierId,
            String cashierName,
            String status,
            LocalDateTime openedAt,
            LocalDateTime closedAt,
            BigDecimal openingCash,
            BigDecimal handoverAmount,
            BigDecimal totalRevenue,
            BigDecimal totalCashIn,
            BigDecimal totalCashOut,
            BigDecimal totalVariance,
            List<PaymentMethodBreakdown> paymentBreakdown
    ) {}
}
