package com.rms.restaurant.module.integration.payment_gateway.dto;

import java.math.BigDecimal;

public record PaymentSessionRequest(
        String invoiceId,
        BigDecimal amount,
        String currency,
        String returnUrl,
        String cancelUrl,
        String description
) {}
