package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        String id,
        String invoiceId,
        PaymentMethod method,
        BigDecimal amount,
        String status,
        String gatewayRef,
        LocalDateTime createdAt
) {}
