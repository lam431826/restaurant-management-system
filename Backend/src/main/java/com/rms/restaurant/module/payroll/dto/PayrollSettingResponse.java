package com.rms.restaurant.module.payroll.dto;

public record PayrollSettingResponse(
        int payrollCutoffDay,
        boolean autoCreateEnabled,
        boolean autoUpdateEnabled,
        boolean personalIncomeTaxEnabled) {
}
