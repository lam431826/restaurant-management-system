package com.rms.restaurant.module.reporting.service.impl;

import com.rms.restaurant.module.reporting.dto.FinancialReportResponse;
import com.rms.restaurant.module.reporting.dto.MenuPerformanceResponse;
import com.rms.restaurant.module.reporting.dto.TrafficReportResponse;
import com.rms.restaurant.module.reporting.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    @Override public FinancialReportResponse getFinancialReport(LocalDate from, LocalDate to) { return null; }
    @Override public TrafficReportResponse getTrafficReport(LocalDate from, LocalDate to) { return null; }
    @Override public MenuPerformanceResponse getMenuPerformance(LocalDate from, LocalDate to) { return null; }
}
