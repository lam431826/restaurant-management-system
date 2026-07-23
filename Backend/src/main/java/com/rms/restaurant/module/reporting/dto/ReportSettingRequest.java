package com.rms.restaurant.module.reporting.dto;

import java.time.LocalTime;

/** Full settings snapshot — the UI always saves the whole form. */
public record ReportSettingRequest(
        boolean customRevenueWindowEnabled,
        LocalTime revenueCutoffTime) {
}
