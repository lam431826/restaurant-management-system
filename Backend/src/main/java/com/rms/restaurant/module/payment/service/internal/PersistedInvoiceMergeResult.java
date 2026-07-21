package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

public record PersistedInvoiceMergeResult(
        String orderId,
        String orderCode,
        List<String> sourceInvoiceIds,
        String targetInvoiceId,
        String targetInvoiceCode,
        BigDecimal targetSubtotal,
        BigDecimal targetDiscountAmount,
        BigDecimal targetTotalAmount,
        boolean targetPaid,
        String targetPromotionId,
        LocalDateTime targetCreatedAt,
        InvoiceStatus targetStatus,
        String targetMergedIntoInvoiceId,
        String targetSplitFromInvoiceId
) {
    public PersistedInvoiceMergeResult {
        Objects.requireNonNull(orderId);
        Objects.requireNonNull(orderCode);
        sourceInvoiceIds = List.copyOf(sourceInvoiceIds);
        Objects.requireNonNull(targetInvoiceId);
        Objects.requireNonNull(targetInvoiceCode);
        Objects.requireNonNull(targetSubtotal);
        Objects.requireNonNull(targetDiscountAmount);
        Objects.requireNonNull(targetTotalAmount);
        Objects.requireNonNull(targetCreatedAt);
        Objects.requireNonNull(targetStatus);
    }
}
