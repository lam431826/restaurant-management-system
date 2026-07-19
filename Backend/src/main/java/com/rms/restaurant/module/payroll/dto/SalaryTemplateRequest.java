package com.rms.restaurant.module.payroll.dto;

import com.rms.restaurant.common.utils.enums.SalaryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SalaryTemplateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull SalaryType mainSalaryType,
        @NotNull BigDecimal mainBaseWage,
        String mainAdvancedRatesJson,
        boolean overtimeEnabled,
        String overtimeRatesJson
) {}
