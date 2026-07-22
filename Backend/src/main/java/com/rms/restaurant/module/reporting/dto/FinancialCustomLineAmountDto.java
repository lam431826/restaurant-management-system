package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;

/** One custom line's amount within a single Báo cáo tài chính period (month/quarter/year). */
public record FinancialCustomLineAmountDto(
        String lineId,
        BigDecimal amount
) {}
