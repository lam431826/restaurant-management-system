package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.SplitInvoiceGroupRequest;
import com.rms.restaurant.module.payment.dto.SplitInvoiceItemRequest;
import com.rms.restaurant.module.payment.dto.SplitInvoiceRequest;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvoiceSplitValidator {

    private static final String PAYMENT_STATUS_PAID = "PAID";

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public ValidatedInvoiceSplitPlan validateForUpdate(
            String sourceInvoiceId,
            SplitInvoiceRequest request
    ) {
        String normalizedSourceInvoiceId = normalizeSourceInvoiceId(sourceInvoiceId);
        List<List<RequestedSelection>> requestedGroups = validateRequestStructure(request);

        String projectedOrderId = invoiceRepository.findOrderIdById(normalizedSourceInvoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        if (projectedOrderId.isBlank()) {
            throw invalidAllocationData();
        }

        Order owningOrder = orderRepository.findByIdForUpdate(projectedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        Invoice sourceInvoice = invoiceRepository.findByIdForUpdate(normalizedSourceInvoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        validateLockedOwnership(normalizedSourceInvoiceId, projectedOrderId, sourceInvoice, owningOrder);

        List<InvoiceItemAllocation> sourceAllocations = invoiceItemAllocationRepository
                .findActiveByInvoiceIdForUpdate(normalizedSourceInvoiceId);
        List<String> orderItemIds = sourceAllocations.stream()
                .map(InvoiceItemAllocation::getOrderItemId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .sorted()
                .toList();
        List<OrderItem> orderItems = orderItemIds.isEmpty()
                ? List.of()
                : orderItemRepository.findAllByIdsForUpdate(orderItemIds);

        boolean hasPaidPayment = paymentRepository.existsByInvoiceIdAndStatus(
                normalizedSourceInvoiceId,
                PAYMENT_STATUS_PAID
        );
        boolean hasPaymentHistory = paymentRepository.existsByInvoiceId(normalizedSourceInvoiceId);

        validateSourceEligibility(sourceInvoice, owningOrder, hasPaidPayment, hasPaymentHistory);
        // Eligibility is measured in units, not allocation rows: a single line of quantity 3
        // is splittable, while two lines would be required under the old row-count rule.
        int totalActiveQuantity = 0;
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            totalActiveQuantity += Math.max(allocation.getAllocatedQuantity(), 0);
        }
        if (totalActiveQuantity < 2) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_SPLITTABLE);
        }

        BigDecimal allocationSubtotal = validateAllocationIntegrity(
                sourceInvoice,
                owningOrder,
                sourceAllocations,
                orderItems
        );
        if (allocationSubtotal.compareTo(sourceInvoice.getSubtotal()) != 0) {
            throw invalidAllocationData();
        }

        return buildValidatedPlan(
                sourceInvoice,
                owningOrder,
                sourceAllocations,
                orderItems,
                requestedGroups
        );
    }

    private String normalizeSourceInvoiceId(String sourceInvoiceId) {
        if (sourceInvoiceId == null || sourceInvoiceId.isBlank()) {
            throw new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND);
        }
        return sourceInvoiceId.trim();
    }

    /**
     * Normalizes both request shapes into explicit (allocationId, quantity) selections.
     * A legacy {@code allocationIds} entry means "the whole allocation" and is resolved to a
     * concrete quantity later, once the source allocations are known, using
     * {@link #WHOLE_ALLOCATION}. The same allocation may appear in more than one group —
     * that is how one line of quantity 3 is spread across two children — but never twice
     * within a single group, which would be an ambiguous duplicate.
     */
    private List<List<RequestedSelection>> validateRequestStructure(SplitInvoiceRequest request) {
        if (request == null || request.groups() == null || request.groups().isEmpty()) {
            throw invalidSplit();
        }

        List<List<RequestedSelection>> normalizedGroups = new ArrayList<>();
        for (SplitInvoiceGroupRequest group : request.groups()) {
            if (group == null) {
                throw invalidSplit();
            }
            // Both shapes at once is ambiguous; neither is empty.
            if (group.hasItems() == group.hasAllocationIds()) {
                throw invalidSplit();
            }

            List<RequestedSelection> selections = new ArrayList<>();
            Set<String> groupAllocationIds = new LinkedHashSet<>();
            if (group.hasItems()) {
                for (SplitInvoiceItemRequest item : group.items()) {
                    if (item == null
                            || item.allocationId() == null
                            || item.allocationId().isBlank()
                            || item.quantity() == null
                            || item.quantity() < 1) {
                        throw invalidSplit();
                    }
                    String normalizedId = item.allocationId().trim();
                    if (!groupAllocationIds.add(normalizedId)) {
                        throw invalidSplit();
                    }
                    selections.add(new RequestedSelection(normalizedId, item.quantity()));
                }
            } else {
                for (String allocationId : group.allocationIds()) {
                    if (allocationId == null || allocationId.isBlank()) {
                        throw invalidSplit();
                    }
                    String normalizedId = allocationId.trim();
                    if (!groupAllocationIds.add(normalizedId)) {
                        throw invalidSplit();
                    }
                    selections.add(new RequestedSelection(normalizedId, WHOLE_ALLOCATION));
                }
            }
            normalizedGroups.add(List.copyOf(selections));
        }
        return List.copyOf(normalizedGroups);
    }

    /** Sentinel for the legacy shape: take the allocation's entire quantity. */
    private static final int WHOLE_ALLOCATION = -1;

    private record RequestedSelection(String allocationId, int quantity) {}

    private void validateLockedOwnership(
            String sourceInvoiceId,
            String projectedOrderId,
            Invoice sourceInvoice,
            Order owningOrder
    ) {
        if (sourceInvoice.getId() == null
                || !sourceInvoiceId.equals(sourceInvoice.getId())
                || sourceInvoice.getOrderId() == null
                || sourceInvoice.getOrderId().isBlank()
                || owningOrder.getId() == null
                || !projectedOrderId.equals(owningOrder.getId())
                || !projectedOrderId.equals(sourceInvoice.getOrderId())) {
            throw invalidAllocationData();
        }
    }

    private void validateSourceEligibility(
            Invoice sourceInvoice,
            Order owningOrder,
            boolean hasPaidPayment,
            boolean hasPaymentHistory
    ) {
        if (sourceInvoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_PAYABLE);
        }
        if (sourceInvoice.isPaid() || hasPaidPayment) {
            throw new ApplicationException(ApplicationError.INVOICE_ALREADY_PAID);
        }
        if (hasPaymentHistory) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_SPLITTABLE);
        }
        if (owningOrder.getStatus() == null) {
            throw invalidAllocationData();
        }
        if (owningOrder.getStatus() == OrderStatus.CLOSED
                || owningOrder.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_SPLITTABLE);
        }
        if (sourceInvoice.getPromotionId() != null
                || (sourceInvoice.getDiscountAmount() != null
                && sourceInvoice.getDiscountAmount().compareTo(BigDecimal.ZERO) != 0)) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_SPLITTABLE);
        }
        if (sourceInvoice.getSubtotal() == null
                || sourceInvoice.getSubtotal().compareTo(BigDecimal.ZERO) <= 0
                || sourceInvoice.getTotalAmount() == null
                || sourceInvoice.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0
                || sourceInvoice.getTotalAmount().compareTo(sourceInvoice.getSubtotal()) != 0) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
        }
    }

    private BigDecimal validateAllocationIntegrity(
            Invoice sourceInvoice,
            Order owningOrder,
            List<InvoiceItemAllocation> sourceAllocations,
            List<OrderItem> orderItems
    ) {
        Map<String, OrderItem> orderItemsById = new LinkedHashMap<>();
        for (OrderItem orderItem : orderItems) {
            if (orderItem == null
                    || orderItem.getId() == null
                    || orderItem.getId().isBlank()
                    || orderItemsById.put(orderItem.getId(), orderItem) != null) {
                throw invalidAllocationData();
            }
        }

        Set<String> allocationIds = new LinkedHashSet<>();
        Set<String> allocatedOrderItemIds = new LinkedHashSet<>();
        BigDecimal allocationSubtotal = BigDecimal.ZERO;
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            if (allocation == null
                    || allocation.getId() == null
                    || allocation.getId().isBlank()
                    || !allocationIds.add(allocation.getId())
                    || allocation.getInvoiceId() == null
                    || !sourceInvoice.getId().equals(allocation.getInvoiceId())
                    || !allocation.isActive()
                    || allocation.getOrderItemId() == null
                    || allocation.getOrderItemId().isBlank()
                    || !allocatedOrderItemIds.add(allocation.getOrderItemId())
                    || allocation.getAllocatedQuantity() <= 0
                    || allocation.getUnitPriceSnapshot() == null
                    || allocation.getUnitPriceSnapshot().compareTo(BigDecimal.ZERO) <= 0) {
                throw invalidAllocationData();
            }

            OrderItem orderItem = orderItemsById.get(allocation.getOrderItemId());
            if (orderItem == null
                    || orderItem.getOrder() == null
                    || orderItem.getOrder().getId() == null
                    || !owningOrder.getId().equals(orderItem.getOrder().getId())
                    || orderItem.getQuantity() <= 0
                    || !isPayable(orderItem.getCookingStatus())) {
                throw invalidAllocationData();
            }

            allocationSubtotal = allocationSubtotal.add(
                    allocation.getUnitPriceSnapshot()
                            .multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity()))
            );
        }

        if (!orderItemsById.keySet().equals(allocatedOrderItemIds)) {
            throw invalidAllocationData();
        }
        return allocationSubtotal;
    }

    private boolean isPayable(CookingStatus status) {
        return status == CookingStatus.READY || status == CookingStatus.SERVED;
    }

    private ValidatedInvoiceSplitPlan buildValidatedPlan(
            Invoice sourceInvoice,
            Order owningOrder,
            List<InvoiceItemAllocation> sourceAllocations,
            List<OrderItem> orderItems,
            List<List<RequestedSelection>> requestedGroups
    ) {
        Map<String, InvoiceItemAllocation> allocationsById = new LinkedHashMap<>();
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            allocationsById.put(allocation.getId(), allocation);
        }

        // Units taken off each source allocation, accumulated across every child group.
        Map<String, Integer> requestedByAllocationId = new LinkedHashMap<>();
        List<ValidatedInvoiceSplitPlan.ValidatedGroup> validatedGroups = new ArrayList<>();
        BigDecimal plannedChildSubtotal = BigDecimal.ZERO;

        for (List<RequestedSelection> requestedGroup : requestedGroups) {
            if (requestedGroup.isEmpty()) {
                throw invalidSplit();
            }

            List<ValidatedInvoiceSplitPlan.ValidatedSelection> selections = new ArrayList<>();
            BigDecimal groupSubtotal = BigDecimal.ZERO;
            int groupQuantity = 0;

            for (RequestedSelection requested : requestedGroup) {
                InvoiceItemAllocation allocation = allocationsById.get(requested.allocationId());
                if (allocation == null) {
                    throw invalidSplit();
                }

                int available = allocation.getAllocatedQuantity();
                int quantity = requested.quantity() == WHOLE_ALLOCATION
                        ? available
                        : requested.quantity();
                if (quantity < 1 || quantity > available) {
                    throw invalidSplit();
                }

                int alreadyRequested = requestedByAllocationId.getOrDefault(allocation.getId(), 0);
                int totalRequested = alreadyRequested + quantity;
                if (totalRequested > available) {
                    throw invalidSplit();
                }
                requestedByAllocationId.put(allocation.getId(), totalRequested);

                selections.add(new ValidatedInvoiceSplitPlan.ValidatedSelection(allocation, quantity));
                groupQuantity += quantity;
                groupSubtotal = groupSubtotal.add(
                        allocation.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(quantity))
                );
            }

            if (groupQuantity < 1 || groupSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
                throw invalidSplit();
            }
            validatedGroups.add(
                    new ValidatedInvoiceSplitPlan.ValidatedGroup(selections, groupSubtotal)
            );
            plannedChildSubtotal = plannedChildSubtotal.add(groupSubtotal);
        }

        // What the source keeps. It stays ACTIVE, so it must retain at least one unit —
        // moving everything would leave a zero-value invoice behind.
        Map<String, Integer> remainingByAllocationId = new LinkedHashMap<>();
        BigDecimal remainingSubtotal = BigDecimal.ZERO;
        int remainingQuantity = 0;
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            int remaining = allocation.getAllocatedQuantity()
                    - requestedByAllocationId.getOrDefault(allocation.getId(), 0);
            if (remaining < 0) {
                throw invalidSplit();
            }
            remainingByAllocationId.put(allocation.getId(), remaining);
            remainingQuantity += remaining;
            remainingSubtotal = remainingSubtotal.add(
                    allocation.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(remaining))
            );
        }
        if (remainingQuantity < 1 || remainingSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw invalidSplit();
        }

        // Money conservation: what the source keeps plus every child equals the original.
        if (remainingSubtotal.add(plannedChildSubtotal).compareTo(sourceInvoice.getSubtotal()) != 0
                || remainingSubtotal.add(plannedChildSubtotal)
                        .compareTo(sourceInvoice.getTotalAmount()) != 0) {
            throw invalidSplit();
        }

        List<OrderItem> deterministicOrderItems = orderItems.stream()
                .sorted(Comparator.comparing(OrderItem::getId))
                .toList();
        return new ValidatedInvoiceSplitPlan(
                sourceInvoice,
                owningOrder,
                sourceAllocations,
                deterministicOrderItems,
                validatedGroups,
                sourceInvoice.getSubtotal(),
                sourceInvoice.getTotalAmount(),
                remainingByAllocationId,
                remainingSubtotal
        );
    }

    private ApplicationException invalidSplit() {
        return new ApplicationException(ApplicationError.INVALID_INVOICE_SPLIT);
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }
}
