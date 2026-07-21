package com.rms.restaurant.module.payment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * One child invoice to peel off the source.
 *
 * <p>{@code items} is the current shape and carries an explicit quantity per allocation.
 * {@code allocationIds} is the legacy whole-allocation shape, kept so existing callers keep
 * working; it means "take the allocation's entire quantity". Exactly one of the two must be
 * supplied — a group carrying both is rejected as ambiguous rather than guessed at.
 */
public record SplitInvoiceGroupRequest(
        List<@NotBlank String> allocationIds,
        List<@Valid SplitInvoiceItemRequest> items
) {
    public boolean hasItems() {
        return items != null && !items.isEmpty();
    }

    public boolean hasAllocationIds() {
        return allocationIds != null && !allocationIds.isEmpty();
    }
}
