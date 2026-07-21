package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record SplitInvoiceChildResponse(
        String invoiceId,
        String invoiceCode,
        BigDecimal subtotal,
        BigDecimal totalAmount,
        List<String> sourceAllocationIds,
        List<String> newAllocationIds
) {
    public SplitInvoiceChildResponse {
        Objects.requireNonNull(invoiceId);
        Objects.requireNonNull(invoiceCode);
        Objects.requireNonNull(subtotal);
        Objects.requireNonNull(totalAmount);
        sourceAllocationIds = List.copyOf(sourceAllocationIds);
        newAllocationIds = List.copyOf(newAllocationIds);
    }
}
