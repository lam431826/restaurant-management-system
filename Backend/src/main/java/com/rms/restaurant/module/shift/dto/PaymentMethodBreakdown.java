package com.rms.restaurant.module.shift.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;

public record PaymentMethodBreakdown(
        PaymentMethod method,
        BigDecimal expectedAmount,
        BigDecimal actualAmount,
        BigDecimal variance
) {}
