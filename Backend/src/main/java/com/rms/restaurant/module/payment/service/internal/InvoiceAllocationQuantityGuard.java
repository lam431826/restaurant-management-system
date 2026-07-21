package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Replacement for the database guarantee dropped in V41.
 *
 * <p>Until V41, {@code uq_iia_active_order_item} made it physically impossible to bill the
 * same order item on two invoices at once. Partial-quantity split needs that to be legal
 * (source keeps 2, child takes 1), so the row-level rule is replaced by the quantity rule it
 * was really standing in for: <em>the units actively billed for an order item may never
 * exceed the units actually ordered.</em>
 *
 * <p>Callers must already hold the pessimistic locks on the affected order items and
 * allocations, and must call this after flushing their mutation, so the re-read sees the
 * post-mutation state inside the same transaction.
 */
@Service
@RequiredArgsConstructor
public class InvoiceAllocationQuantityGuard {

    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;

    /** Fails the transaction if any order item is billed for more units than were ordered. */
    public void assertNotOverAllocated(List<OrderItem> orderItems) {
        if (orderItems == null || orderItems.isEmpty()) {
            return;
        }

        Map<String, Integer> orderedQuantityById = new LinkedHashMap<>();
        for (OrderItem orderItem : orderItems) {
            if (orderItem == null || orderItem.getId() == null || orderItem.getId().isBlank()) {
                throw new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
            }
            orderedQuantityById.put(orderItem.getId(), orderItem.getQuantity());
        }

        Map<String, Integer> activeQuantityById = new LinkedHashMap<>();
        for (InvoiceItemAllocation allocation
                : invoiceItemAllocationRepository.findActiveByOrderItemIdsForUpdate(
                        orderedQuantityById.keySet())) {
            if (allocation == null || !allocation.isActive()) {
                continue;
            }
            activeQuantityById.merge(
                    allocation.getOrderItemId(),
                    allocation.getAllocatedQuantity(),
                    Integer::sum
            );
        }

        for (Map.Entry<String, Integer> entry : activeQuantityById.entrySet()) {
            Integer ordered = orderedQuantityById.get(entry.getKey());
            if (ordered == null || entry.getValue() > ordered) {
                throw new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
            }
        }
    }
}
