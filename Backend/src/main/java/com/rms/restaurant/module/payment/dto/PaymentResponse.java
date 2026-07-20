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
        // Transaction/reference code. CASH: unused (null). QR: the simulated
        // external gateway's transaction reference.
        String gatewayRef,
        BigDecimal receivedAmount,
        BigDecimal changeAmount,
        LocalDateTime expiresAt,
        LocalDateTime paidAt,
        LocalDateTime createdAt
) {}
