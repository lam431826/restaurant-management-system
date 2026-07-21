package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailItem(
        String id,
        String code,
        String orderId,
        LocalDateTime createdAt,
        String tableName,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        List<LineItem> lines,
        List<PaymentRecord> payments,
        InvoiceStatus status,
        String mergedIntoInvoiceId,
        String splitFromInvoiceId
) {
    public record LineItem(
            String name,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            String orderItemId,
            String menuItemId
    ) {}

    public record PaymentRecord(String method, BigDecimal amount, String status, LocalDateTime createdAt) {}
}
