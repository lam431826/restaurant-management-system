package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateOpeningBalanceRequest(
        @NotNull CashFlowMethod method,
        @NotNull @PositiveOrZero BigDecimal amount
) {}
