package com.rms.restaurant.module.integration.payment_gateway.dto;

public record PaymentSessionResponse(
        String sessionId,
        String paymentUrl,
        String status
) {}
