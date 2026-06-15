package com.rms.restaurant.module.shift.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ShiftSummaryResponse(
        String id,
        String cashierId,
        String closedBy,
        String status,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        BigDecimal openingCash,
        BigDecimal totalCashIn,
        BigDecimal totalCashOut,
        BigDecimal totalRevenue,
        BigDecimal totalVariance,
        List<PaymentMethodBreakdown> paymentBreakdown,
        List<CashMovementDetail> cashMovements,
        String closingNote
) {}
