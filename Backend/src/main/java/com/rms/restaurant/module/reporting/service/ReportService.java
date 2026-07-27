package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.common.utils.enums.DashboardGranularity;
import com.rms.restaurant.common.utils.enums.FinancialGranularity;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.reporting.dto.DashboardOverviewResponse;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialCategoryLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialPeriodResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportService {
    List<FinancialPeriodResponse> getFinancialReport(int year, FinancialGranularity granularity);

    /** Cashbook categories eligible to appear as Chi phí(6)/Thu nhập khác(8) sub-lines — read-only
     * metadata (id/group/name) for the frontend to label the amounts in FinancialPeriodResponse. */
    List<FinancialCategoryLineDto> getFinancialReportLines();

    /** Aggregated manager-dashboard snapshot for the half-open [from, to) window. */
    DashboardOverviewResponse getDashboardOverview(
            LocalDateTime from, LocalDateTime to, DashboardGranularity granularity);

    List<EndOfDaySalesRow> getEndOfDaySales(
            LocalDateTime from, LocalDateTime to,
            List<String> staffIds, PaymentMethod paymentMethod, String areaName, String tableName);
}
