package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VnpayCreateResponse(
        String paymentId,
        String txnRef,
        String paymentUrl,
        BigDecimal amount,
        LocalDateTime expiresAt
) {}
