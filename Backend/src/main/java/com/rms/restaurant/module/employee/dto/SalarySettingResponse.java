package com.rms.restaurant.module.employee.dto;

import com.rms.restaurant.common.utils.enums.SalaryType;

import java.math.BigDecimal;

public record SalarySettingResponse(
        String id,
        String employeeId,
        SalaryType mainSalaryType,
        BigDecimal mainBaseWage,
        String mainAdvancedRatesJson,
        boolean overtimeEnabled,
        String overtimeRatesJson,
        String salaryTemplate
) {}
