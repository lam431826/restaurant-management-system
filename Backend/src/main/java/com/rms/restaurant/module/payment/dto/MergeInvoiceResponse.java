package com.rms.restaurant.module.payment.dto;

import java.util.List;
import java.util.Objects;

public record MergeInvoiceResponse(
        String orderId,
        List<String> sourceInvoiceIds,
        InvoiceSummaryResponse targetInvoice
) {
    public MergeInvoiceResponse {
        Objects.requireNonNull(orderId);
        sourceInvoiceIds = List.copyOf(sourceInvoiceIds);
        Objects.requireNonNull(targetInvoice);
    }
}
