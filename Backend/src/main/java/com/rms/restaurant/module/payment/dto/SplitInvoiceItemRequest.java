package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * One quantity selection inside a split group: take {@code quantity} units off the source
 * allocation identified by {@code allocationId}. Quantity is a whole number of units —
 * order items are only ever counted in whole units.
 */
public record SplitInvoiceItemRequest(
        @NotBlank String allocationId,
        @NotNull @Min(1) Integer quantity
) {}
