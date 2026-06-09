package com.rms.restaurant.module.shift.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShiftSummaryResponse(
        String id,
        String cashierId,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        BigDecimal openingCash,
        BigDecimal closingCash,
        BigDecimal totalRevenue,
        String status
) {}
