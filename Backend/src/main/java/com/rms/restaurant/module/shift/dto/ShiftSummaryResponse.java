package com.rms.restaurant.module.shift.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// BR-SUM-01: expected/actual/variance per method, cash-in/out, totals
public record ShiftSummaryResponse(
        String id,
        String cashierId,
        String closedBy,
        String status,
        String shiftType,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        BigDecimal openingCash,
        BigDecimal handoverAmount,
        BigDecimal totalCashIn,
        BigDecimal totalCashOut,
        BigDecimal totalRevenue,
        BigDecimal totalVariance,
        BigDecimal cardBatchTotal,
        List<PaymentMethodBreakdown> paymentBreakdown,
        List<CashMovementDetail> cashMovements,
        String closingNote
) {}
