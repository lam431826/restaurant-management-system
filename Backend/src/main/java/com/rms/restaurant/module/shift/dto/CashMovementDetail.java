package com.rms.restaurant.module.shift.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CashMovementDetail(
        String id,
        String type,
        BigDecimal amount,
        String reason,
        String operatorId,
        LocalDateTime createdAt
) {}
