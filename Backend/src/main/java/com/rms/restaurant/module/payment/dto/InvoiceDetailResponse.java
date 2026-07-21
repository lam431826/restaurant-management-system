package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailResponse(
        String id,
        String code,
        String orderId,
        String orderCode,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        LocalDateTime createdAt,
        String createdBy,
        String promotionId,
        String promotionCode,
        List<InvoiceItemResponse> items,
        InvoiceStatus status,
        String mergedIntoInvoiceId,
        String mergedIntoInvoiceCode,
        String splitFromInvoiceId,
        String splitFromInvoiceCode,
        // Reverse lineage. Children of a SPLIT source, and the sources that were merged
        // into this invoice. Empty when not applicable.
        List<String> splitChildInvoiceIds,
        List<String> splitChildInvoiceCodes,
        List<String> mergedSourceInvoiceIds,
        List<String> mergedSourceInvoiceCodes
) {}
