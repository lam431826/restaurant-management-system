package com.rms.restaurant.module.attendance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

/** One violation row (UC-AT-06). appliedPenalty null = default to the type's unit amount. */
public record ViolationRequest(
        @NotBlank String violationTypeId,
        @Min(1) int count,
        BigDecimal appliedPenalty) {
}
