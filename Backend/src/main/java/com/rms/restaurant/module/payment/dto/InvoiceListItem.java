package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceListItem(
        String id,
        String code,
        LocalDateTime createdAt,
        String tableName,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        String paymentMethod,
        String paymentStatus,
        String note,
        String cashierName,
        String itemsText,
        InvoiceStatus status,
        String mergedIntoInvoiceId,
        String splitFromInvoiceId
) {}
