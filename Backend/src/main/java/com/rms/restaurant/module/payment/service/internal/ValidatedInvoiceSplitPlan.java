package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public record ValidatedInvoiceSplitPlan(
        Invoice sourceInvoice,
        Order owningOrder,
        List<InvoiceItemAllocation> sourceAllocations,
        List<OrderItem> orderItems,
        List<ValidatedGroup> groups,
        BigDecimal sourceSubtotal,
        BigDecimal sourceTotal,
        Set<String> coveredAllocationIds
) {
    public ValidatedInvoiceSplitPlan {
        Objects.requireNonNull(sourceInvoice);
        Objects.requireNonNull(owningOrder);
        sourceAllocations = List.copyOf(sourceAllocations);
        orderItems = List.copyOf(orderItems);
        groups = List.copyOf(groups);
        Objects.requireNonNull(sourceSubtotal);
        Objects.requireNonNull(sourceTotal);
        coveredAllocationIds = Collections.unmodifiableSet(new LinkedHashSet<>(coveredAllocationIds));
    }

    public record ValidatedGroup(
            List<InvoiceItemAllocation> allocations,
            BigDecimal subtotal
    ) {
        public ValidatedGroup {
            allocations = List.copyOf(allocations);
            Objects.requireNonNull(subtotal);
        }
    }
}
