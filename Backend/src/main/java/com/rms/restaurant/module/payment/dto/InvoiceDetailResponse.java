package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailResponse(
        String id,
        String orderId,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        LocalDateTime createdAt,
        String promotionId,
        String promotionCode,
        List<InvoiceItemResponse> items,
        InvoiceStatus status,
        String mergedIntoInvoiceId
) {}
