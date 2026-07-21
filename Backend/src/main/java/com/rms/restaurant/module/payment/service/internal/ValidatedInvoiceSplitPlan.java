package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * A fully validated partial-quantity split.
 *
 * <p>Each group becomes one child invoice. The source invoice keeps
 * {@code remainingQuantityByAllocationId} and stays ACTIVE, so quantity and money are
 * conserved as: source remainder + every child = the original source.
 */
public record ValidatedInvoiceSplitPlan(
        Invoice sourceInvoice,
        Order owningOrder,
        List<InvoiceItemAllocation> sourceAllocations,
        List<OrderItem> orderItems,
        List<ValidatedGroup> groups,
        BigDecimal sourceSubtotal,
        BigDecimal sourceTotal,
        /** Allocation id -> units left on the source. 0 means the allocation is fully moved. */
        Map<String, Integer> remainingQuantityByAllocationId,
        /** Money the source keeps; always > 0 because the source must retain at least a unit. */
        BigDecimal remainingSubtotal
) {
    public ValidatedInvoiceSplitPlan {
        Objects.requireNonNull(sourceInvoice);
        Objects.requireNonNull(owningOrder);
        sourceAllocations = List.copyOf(sourceAllocations);
        orderItems = List.copyOf(orderItems);
        groups = List.copyOf(groups);
        Objects.requireNonNull(sourceSubtotal);
        Objects.requireNonNull(sourceTotal);
        remainingQuantityByAllocationId =
                Collections.unmodifiableMap(new LinkedHashMap<>(remainingQuantityByAllocationId));
        Objects.requireNonNull(remainingSubtotal);
    }

    /** One child invoice: the units it takes, and the money those units are worth. */
    public record ValidatedGroup(
            List<ValidatedSelection> selections,
            BigDecimal subtotal
    ) {
        public ValidatedGroup {
            selections = List.copyOf(selections);
            Objects.requireNonNull(subtotal);
        }
    }

    /** Take {@code quantity} units off {@code allocation}. */
    public record ValidatedSelection(
            InvoiceItemAllocation allocation,
            int quantity
    ) {
        public ValidatedSelection {
            Objects.requireNonNull(allocation);
        }
    }
}
