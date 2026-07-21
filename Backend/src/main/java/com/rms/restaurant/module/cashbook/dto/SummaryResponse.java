package com.rms.restaurant.module.cashbook.dto;

import java.math.BigDecimal;

public record SummaryResponse(
        BigDecimal openingBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal closingBalance
) {}
