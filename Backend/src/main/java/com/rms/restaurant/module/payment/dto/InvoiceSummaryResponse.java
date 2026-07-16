package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceSummaryResponse(
        String id,
        String orderId,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        String promotionId,
        LocalDateTime createdAt,
        InvoiceStatus status,
        String mergedIntoInvoiceId
) {}
