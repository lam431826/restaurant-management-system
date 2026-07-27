package com.rms.restaurant.module.shift.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// BR-SUM-01: expected/actual/variance per method, totals
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
        BigDecimal totalRevenue,
        BigDecimal totalVariance,
        BigDecimal cardBatchTotal,
        List<PaymentMethodBreakdown> paymentBreakdown,
        String closingNote
) {}
