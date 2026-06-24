package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailResponse(
        String id,
        String orderId,
        LocalDateTime createdAt,
        String tableName,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        boolean paid,
        List<LineItem> lines,
        List<PaymentRecord> payments
) {
    public record LineItem(String name, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    public record PaymentRecord(String method, BigDecimal amount, String status, LocalDateTime createdAt) {}
}
