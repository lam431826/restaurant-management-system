package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.dto.FinancialReportResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface ReportService {
    FinancialReportResponse getFinancialReport(LocalDate from, LocalDate to);
    TrafficReportResponse getTrafficReport(LocalDate from, LocalDate to);
    MenuPerformanceResponse getMenuPerformance(LocalDate from, LocalDate to);

    List<EndOfDaySalesRow> getEndOfDaySales(
            LocalDateTime from, LocalDateTime to,
            List<String> staffIds, PaymentMethod paymentMethod, String areaName, String tableName);
}
