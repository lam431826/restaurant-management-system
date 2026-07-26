package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.common.utils.enums.DashboardGranularity;
import com.rms.restaurant.common.utils.enums.FinancialGranularity;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.reporting.dto.DashboardOverviewResponse;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialPeriodResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportService {
    List<FinancialPeriodResponse> getFinancialReport(int year, FinancialGranularity granularity);
    /** Aggregated manager-dashboard snapshot for the half-open [from, to) window. */
    DashboardOverviewResponse getDashboardOverview(
            LocalDateTime from, LocalDateTime to, DashboardGranularity granularity);

    List<EndOfDaySalesRow> getEndOfDaySales(
            LocalDateTime from, LocalDateTime to,
            List<String> staffIds, PaymentMethod paymentMethod, String areaName, String tableName);
}
