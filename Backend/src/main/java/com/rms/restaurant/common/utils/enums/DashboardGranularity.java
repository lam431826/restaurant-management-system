package com.rms.restaurant.common.utils.enums;

/**
 * Time bucket width for the manager dashboard revenue series. HOUR is used for a single-day
 * period ("Hôm nay"); DAY for multi-day ranges (7/30 ngày, tháng này). Kept deliberately small
 * — quarter/year live in {@link FinancialGranularity}, which serves the separate P&L report.
 */
public enum DashboardGranularity {
    HOUR,
    DAY
}
