package com.rms.restaurant.module.employee.dto;

import com.rms.restaurant.common.utils.enums.SalaryType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SalarySettingRequest(
        @NotNull SalaryType mainSalaryType,
        @NotNull BigDecimal mainBaseWage,
        String mainAdvancedRatesJson,
        boolean overtimeEnabled,
        String overtimeRatesJson,
        String salaryTemplate
) {}
