package com.rms.restaurant.module.payroll.dto;

/** Full settings snapshot — the UI always saves the whole form. */
public record PayrollSettingRequest(
        int payrollCutoffDay,
        boolean autoCreateEnabled,
        boolean autoUpdateEnabled,
        boolean personalIncomeTaxEnabled) {
}
