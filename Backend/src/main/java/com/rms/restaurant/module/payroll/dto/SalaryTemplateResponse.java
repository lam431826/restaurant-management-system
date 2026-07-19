package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SalaryTemplateResponse(
        String id,
        String name,
        SalaryType mainSalaryType,
        BigDecimal mainBaseWage,
        String mainAdvancedRatesJson,
        boolean overtimeEnabled,
        String overtimeRatesJson,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
