package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;

public record FinancialReportResponse(String period, BigDecimal totalRevenue, BigDecimal cashRevenue, BigDecimal cardRevenue, int totalOrders) {}
