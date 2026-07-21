package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OpeningBalanceItem(
        CashFlowMethod method,
        BigDecimal amount,
        String updatedBy,
        LocalDateTime updatedAt
) {}
