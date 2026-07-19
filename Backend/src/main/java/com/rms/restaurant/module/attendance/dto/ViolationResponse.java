package com.rms.restaurant.module.attendance.dto;

import java.math.BigDecimal;

public record ViolationResponse(
        String id,
        String violationTypeId,
        String violationTypeName,
        int count,
        BigDecimal appliedPenalty) {
}
