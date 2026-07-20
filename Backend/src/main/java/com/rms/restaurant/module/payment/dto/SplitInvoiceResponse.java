package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record SplitInvoiceResponse(
        String sourceInvoiceId,
        InvoiceStatus sourceStatus,
        BigDecimal sourceSubtotal,
        BigDecimal sourceTotal,
        List<SplitInvoiceChildResponse> children
) {
    public SplitInvoiceResponse {
        Objects.requireNonNull(sourceInvoiceId);
        Objects.requireNonNull(sourceStatus);
        Objects.requireNonNull(sourceSubtotal);
        Objects.requireNonNull(sourceTotal);
        children = List.copyOf(children);
    }
}
