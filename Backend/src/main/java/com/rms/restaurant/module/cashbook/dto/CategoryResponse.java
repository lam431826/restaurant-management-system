package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowType;

import java.time.LocalDateTime;

public record CategoryResponse(
        String id,
        String code,
        String name,
        CashFlowType type,
        String description,
        boolean accountingToIncome,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
