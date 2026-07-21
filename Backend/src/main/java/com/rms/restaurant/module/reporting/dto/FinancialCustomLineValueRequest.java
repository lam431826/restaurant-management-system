package com.rms.restaurant.module.reporting.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record FinancialCustomLineValueRequest(
        int year,
        @Min(1) @Max(12) int month,
        BigDecimal amount
) {}
