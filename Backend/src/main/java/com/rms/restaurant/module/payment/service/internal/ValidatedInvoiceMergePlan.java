package com.rms.restaurant.module.payment.service.internal;

import java.util.List;
import java.util.Objects;

public record ValidatedInvoiceMergePlan(
        String orderId,
        List<String> sourceInvoiceIds
) {
    public ValidatedInvoiceMergePlan {
        Objects.requireNonNull(orderId);
        sourceInvoiceIds = List.copyOf(sourceInvoiceIds);
    }
}
