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
        List<List<String>> requestedGroups = validateRequestStructure(request);

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
        if (sourceAllocations.size() < 2) {
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

    private List<List<String>> validateRequestStructure(SplitInvoiceRequest request) {
        if (request == null || request.groups() == null || request.groups().size() < 2) {
            throw invalidSplit();
        }

        List<List<String>> normalizedGroups = new ArrayList<>();
        Set<String> allAllocationIds = new LinkedHashSet<>();
        for (SplitInvoiceGroupRequest group : request.groups()) {
            if (group == null || group.allocationIds() == null || group.allocationIds().isEmpty()) {
                throw invalidSplit();
            }

            List<String> normalizedIds = new ArrayList<>();
            Set<String> groupAllocationIds = new LinkedHashSet<>();
            for (String allocationId : group.allocationIds()) {
                if (allocationId == null || allocationId.isBlank()) {
                    throw invalidSplit();
                }

                String normalizedId = allocationId.trim();
                if (!groupAllocationIds.add(normalizedId) || !allAllocationIds.add(normalizedId)) {
                    throw invalidSplit();
                }
                normalizedIds.add(normalizedId);
            }
            normalizedGroups.add(List.copyOf(normalizedIds));
        }
        return List.copyOf(normalizedGroups);
    }

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
            List<List<String>> requestedGroups
    ) {
        if (requestedGroups.size() > sourceAllocations.size()) {
            throw invalidSplit();
        }

        Map<String, InvoiceItemAllocation> allocationsById = new LinkedHashMap<>();
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            allocationsById.put(allocation.getId(), allocation);
        }

        List<ValidatedInvoiceSplitPlan.ValidatedGroup> validatedGroups = new ArrayList<>();
        Set<String> coveredAllocationIds = new LinkedHashSet<>();
        BigDecimal plannedTotal = BigDecimal.ZERO;
        for (List<String> requestedGroup : requestedGroups) {
            List<InvoiceItemAllocation> groupAllocations = new ArrayList<>();
            BigDecimal groupSubtotal = BigDecimal.ZERO;
            for (String allocationId : requestedGroup) {
                InvoiceItemAllocation allocation = allocationsById.get(allocationId);
                if (allocation == null || !coveredAllocationIds.add(allocationId)) {
                    throw invalidSplit();
                }
                groupAllocations.add(allocation);
                groupSubtotal = groupSubtotal.add(
                        allocation.getUnitPriceSnapshot()
                                .multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity()))
                );
            }

            if (groupAllocations.isEmpty() || groupSubtotal.compareTo(BigDecimal.ZERO) <= 0) {
                throw invalidSplit();
            }
            validatedGroups.add(new ValidatedInvoiceSplitPlan.ValidatedGroup(groupAllocations, groupSubtotal));
            plannedTotal = plannedTotal.add(groupSubtotal);
        }

        if (!coveredAllocationIds.equals(allocationsById.keySet())
                || plannedTotal.compareTo(sourceInvoice.getSubtotal()) != 0
                || plannedTotal.compareTo(sourceInvoice.getTotalAmount()) != 0) {
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
                coveredAllocationIds
        );
    }

    private ApplicationException invalidSplit() {
        return new ApplicationException(ApplicationError.INVALID_INVOICE_SPLIT);
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }
}
