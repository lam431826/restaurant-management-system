package com.rms.restaurant.module.reporting.service;

import com.rms.restaurant.module.reporting.dto.FinancialReportResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;

import java.time.LocalDate;

public interface ReportService {
    FinancialReportResponse getFinancialReport(LocalDate from, LocalDate to);
    TrafficReportResponse getTrafficReport(LocalDate from, LocalDate to);
    MenuPerformanceResponse getMenuPerformance(LocalDate from, LocalDate to);
}
