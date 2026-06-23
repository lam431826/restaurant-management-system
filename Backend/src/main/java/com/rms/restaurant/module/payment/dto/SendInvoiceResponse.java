package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SendInvoiceResponse(
        String invoiceId,
        String orderId,
        BigDecimal totalAmount,
        boolean paid,
        LocalDateTime sentAt,
        String deliveryMethod,
        String message
) {}
