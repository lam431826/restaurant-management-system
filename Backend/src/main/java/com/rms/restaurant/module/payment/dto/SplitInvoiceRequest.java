package com.rms.restaurant.module.payment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Each group becomes one new child invoice peeled off the source. The source invoice keeps
 * whatever quantity is not requested here and must retain at least one unit, so a single
 * group is already a valid split.
 */
public record SplitInvoiceRequest(
        @NotNull
        @Size(min = 1)
        List<@NotNull @Valid SplitInvoiceGroupRequest> groups
) {}
