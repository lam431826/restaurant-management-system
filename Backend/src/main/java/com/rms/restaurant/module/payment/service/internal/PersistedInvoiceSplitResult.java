package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record PersistedInvoiceSplitResult(
        String sourceInvoiceId,
        String sourceInvoiceCode,
        InvoiceStatus sourceStatus,
        BigDecimal sourceSubtotal,
        BigDecimal sourceTotal,
        List<PersistedChildInvoice> children
) {
    public PersistedInvoiceSplitResult {
        Objects.requireNonNull(sourceInvoiceId);
        Objects.requireNonNull(sourceInvoiceCode);
        Objects.requireNonNull(sourceStatus);
        Objects.requireNonNull(sourceSubtotal);
        Objects.requireNonNull(sourceTotal);
        children = List.copyOf(children);
    }

    public record PersistedChildInvoice(
            String childInvoiceId,
            String childInvoiceCode,
            BigDecimal subtotal,
            BigDecimal totalAmount,
            List<String> sourceAllocationIds,
            List<String> childAllocationIds
    ) {
        public PersistedChildInvoice {
            Objects.requireNonNull(childInvoiceId);
            Objects.requireNonNull(childInvoiceCode);
            Objects.requireNonNull(subtotal);
            Objects.requireNonNull(totalAmount);
            sourceAllocationIds = List.copyOf(sourceAllocationIds);
            childAllocationIds = List.copyOf(childAllocationIds);
        }
    }
}
