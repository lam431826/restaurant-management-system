package com.rms.restaurant.module.attendance.dto;

import java.math.BigDecimal;

public record ViolationTypeResponse(
        String id,
        String name,
        BigDecimal penaltyAmount) {
}
