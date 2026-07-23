package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;

/** One Cashbook category's Chi phí(6)/Thu nhập khác(8) amount within a single Báo cáo tài
 * chính period (month/quarter/year). See ReportServiceImpl.accumulateCashbookCategoryLines. */
public record FinancialCategoryLineAmountDto(
        String categoryId,
        BigDecimal amount
) {}
