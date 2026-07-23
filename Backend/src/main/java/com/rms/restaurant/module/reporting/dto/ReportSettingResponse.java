package com.rms.restaurant.module.reporting.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;

public record ReportSettingResponse(
        boolean customRevenueWindowEnabled,
        LocalTime revenueCutoffTime,
        LocalDateTime updatedAt
) {}
