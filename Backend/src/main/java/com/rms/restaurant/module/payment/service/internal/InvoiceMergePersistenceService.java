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
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InvoiceMergePersistenceService {

    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final int MAX_MONEY_PRECISION = 12;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final PaymentRepository paymentRepository;
    private final EntityManager entityManager;

    @Transactional
    public PersistedInvoiceMergeResult mergeAtomically(ValidatedInvoiceMergePlan plan) {
        validatePlanStructure(plan);

        Order owningOrder = orderRepository.findByIdForUpdate(plan.orderId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        List<Invoice> sourceInvoices = lockAndValidateSources(plan, owningOrder);
        validatePaymentHistory(plan.sourceInvoiceIds(), sourceInvoices);
        validateSourceEligibilityAndFinancials(sourceInvoices);

        List<InvoiceItemAllocation> sourceAllocations = invoiceItemAllocationRepository
                .findActiveByInvoiceIdsForUpdate(plan.sourceInvoiceIds());
        List<String> orderItemIds = sourceAllocations.stream()
                .map(InvoiceItemAllocation::getOrderItemId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .sorted()
                .toList();
        List<OrderItem> orderItems = orderItemIds.isEmpty()
                ? List.of()
                : orderItemRepository.findAllByIdsForUpdate(orderItemIds);

        MergeFinancials financials = validateAllocationsAndFinancials(
                plan,
                owningOrder,
                sourceInvoices,
                sourceAllocations,
                orderItems
        );
        Map<String, SourceInvoiceSnapshot> invoiceSnapshots = captureInvoiceSnapshots(sourceInvoices);
        Map<String, SourceAllocationSnapshot> allocationSnapshots = captureAllocationSnapshots(sourceAllocations);

        Invoice targetInvoice = createTargetInvoice(plan.orderId(), financials.targetSubtotal());

        for (InvoiceItemAllocation sourceAllocation : sourceAllocations) {
            sourceAllocation.setActive(false);
        }
        invoiceItemAllocationRepository.saveAll(sourceAllocations);
        // The filtered unique index requires source rows to be inactive before replacements are inserted.
        invoiceItemAllocationRepository.flush();

        List<InvoiceItemAllocation> targetAllocations = buildTargetAllocations(
                targetInvoice,
                sourceAllocations
        );
        List<InvoiceItemAllocation> savedTargetAllocations = invoiceItemAllocationRepository.saveAll(
                targetAllocations
        );
        invoiceItemAllocationRepository.flush();

        for (Invoice sourceInvoice : sourceInvoices) {
            sourceInvoice.setStatus(InvoiceStatus.MERGED);
            sourceInvoice.setMergedIntoInvoiceId(targetInvoice.getId());
        }
        invoiceRepository.saveAll(sourceInvoices);
        invoiceRepository.flush();

        validateFinalState(
                plan,
                owningOrder,
                sourceInvoices,
                sourceAllocations,
                targetInvoice,
                savedTargetAllocations,
                invoiceSnapshots,
                allocationSnapshots,
                financials
        );

        return new PersistedInvoiceMergeResult(
                plan.orderId(),
                plan.sourceInvoiceIds(),
                targetInvoice.getId(),
                targetInvoice.getSubtotal(),
                targetInvoice.getDiscountAmount(),
                targetInvoice.getTotalAmount(),
                targetInvoice.isPaid(),
                targetInvoice.getPromotionId(),
                targetInvoice.getCreatedAt(),
                targetInvoice.getStatus(),
                targetInvoice.getMergedIntoInvoiceId(),
                targetInvoice.getSplitFromInvoiceId()
        );
    }

    private List<Invoice> lockAndValidateSources(
            ValidatedInvoiceMergePlan plan,
            Order owningOrder
    ) {
        List<Invoice> sourceInvoices = invoiceRepository.findAllByIdsForUpdate(plan.sourceInvoiceIds());
        if (sourceInvoices.size() != plan.sourceInvoiceIds().size()) {
            throw new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND);
        }

        List<String> lockedIds = sourceInvoices.stream().map(Invoice::getId).toList();
        if (!lockedIds.equals(plan.sourceInvoiceIds())) {
            throw invalidAllocationData();
        }
        if (owningOrder.getId() == null || !plan.orderId().equals(owningOrder.getId())) {
            throw invalidAllocationData();
        }
        if (owningOrder.getStatus() == null) {
            throw invalidAllocationData();
        }
        if (owningOrder.getStatus() == OrderStatus.CLOSED
                || owningOrder.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_MERGEABLE);
        }

        for (Invoice invoice : sourceInvoices) {
            if (invoice == null
                    || invoice.getId() == null
                    || invoice.getOrderId() == null
                    || !plan.orderId().equals(invoice.getOrderId())) {
                throw new ApplicationException(ApplicationError.INVOICE_MERGE_ORDER_MISMATCH);
            }
            if (invoice.isPaid()) {
                throw new ApplicationException(ApplicationError.INVOICE_ALREADY_PAID);
            }
        }
        return sourceInvoices;
    }

    private void validatePaymentHistory(List<String> sourceInvoiceIds, List<Invoice> sourceInvoices) {
        if (sourceInvoices.stream().anyMatch(Invoice::isPaid)
                || paymentRepository.existsByInvoiceIdInAndStatus(sourceInvoiceIds, PAYMENT_STATUS_PAID)) {
            throw new ApplicationException(ApplicationError.INVOICE_ALREADY_PAID);
        }
        if (paymentRepository.existsByInvoiceIdIn(sourceInvoiceIds)) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_MERGEABLE);
        }
    }

    private void validateSourceEligibilityAndFinancials(List<Invoice> sourceInvoices) {
        for (Invoice invoice : sourceInvoices) {
            if (invoice.getStatus() != InvoiceStatus.ACTIVE
                    || invoice.getMergedIntoInvoiceId() != null
                    || invoice.getPromotionId() != null
                    || invoice.getDiscountAmount() == null
                    || invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) != 0) {
                throw new ApplicationException(ApplicationError.INVOICE_NOT_MERGEABLE);
            }
            validatePositiveMoney(invoice.getSubtotal());
            validatePositiveMoney(invoice.getTotalAmount());
            if (invoice.getSubtotal().compareTo(invoice.getTotalAmount()) != 0) {
                throw invalidInvoiceTotal();
            }
        }
    }

    private MergeFinancials validateAllocationsAndFinancials(
            ValidatedInvoiceMergePlan plan,
            Order owningOrder,
            List<Invoice> sourceInvoices,
            List<InvoiceItemAllocation> sourceAllocations,
            List<OrderItem> orderItems
    ) {
        Map<String, Invoice> invoiceById = new LinkedHashMap<>();
        for (Invoice invoice : sourceInvoices) {
            if (invoiceById.put(invoice.getId(), invoice) != null) {
                throw invalidAllocationData();
            }
        }

        Map<String, OrderItem> orderItemById = new LinkedHashMap<>();
        for (OrderItem orderItem : orderItems) {
            if (orderItem == null
                    || orderItem.getId() == null
                    || orderItem.getId().isBlank()
                    || orderItemById.put(orderItem.getId(), orderItem) != null) {
                throw invalidAllocationData();
            }
        }

        Map<String, BigDecimal> allocationSubtotalByInvoiceId = new LinkedHashMap<>();
        for (String sourceInvoiceId : plan.sourceInvoiceIds()) {
            allocationSubtotalByInvoiceId.put(sourceInvoiceId, BigDecimal.ZERO);
        }

        Set<String> allocationIds = new LinkedHashSet<>();
        Set<String> allocatedOrderItemIds = new LinkedHashSet<>();
        BigDecimal targetSubtotal = BigDecimal.ZERO;
        for (InvoiceItemAllocation allocation : sourceAllocations) {
            validateSourceAllocation(
                    allocation,
                    owningOrder,
                    invoiceById,
                    orderItemById,
                    allocationIds,
                    allocatedOrderItemIds
            );
            BigDecimal lineSubtotal = allocation.getUnitPriceSnapshot()
                    .multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity()));
            validatePositiveMoney(lineSubtotal);
            allocationSubtotalByInvoiceId.compute(
                    allocation.getInvoiceId(),
                    (ignored, subtotal) -> subtotal.add(lineSubtotal)
            );
            targetSubtotal = targetSubtotal.add(lineSubtotal);
            validatePositiveMoney(targetSubtotal);
        }

        if (sourceAllocations.isEmpty()
                || !allocatedOrderItemIds.equals(orderItemById.keySet())) {
            throw invalidAllocationData();
        }

        BigDecimal sourceSubtotalSum = BigDecimal.ZERO;
        BigDecimal sourceTotalSum = BigDecimal.ZERO;
        for (Invoice sourceInvoice : sourceInvoices) {
            BigDecimal allocationSubtotal = allocationSubtotalByInvoiceId.get(sourceInvoice.getId());
            if (allocationSubtotal == null
                    || allocationSubtotal.compareTo(BigDecimal.ZERO) <= 0
                    || allocationSubtotal.compareTo(sourceInvoice.getSubtotal()) != 0) {
                throw invalidInvoiceTotal();
            }
            sourceSubtotalSum = sourceSubtotalSum.add(sourceInvoice.getSubtotal());
            sourceTotalSum = sourceTotalSum.add(sourceInvoice.getTotalAmount());
            validatePositiveMoney(sourceSubtotalSum);
            validatePositiveMoney(sourceTotalSum);
        }

        if (targetSubtotal.compareTo(sourceSubtotalSum) != 0
                || targetSubtotal.compareTo(sourceTotalSum) != 0) {
            throw invalidInvoiceTotal();
        }
        return new MergeFinancials(targetSubtotal, sourceSubtotalSum, sourceTotalSum);
    }

    private void validateSourceAllocation(
            InvoiceItemAllocation allocation,
            Order owningOrder,
            Map<String, Invoice> invoiceById,
            Map<String, OrderItem> orderItemById,
            Set<String> allocationIds,
            Set<String> allocatedOrderItemIds
    ) {
        if (allocation == null
                || allocation.getId() == null
                || allocation.getId().isBlank()
                || !allocationIds.add(allocation.getId())
                || allocation.getInvoiceId() == null
                || !invoiceById.containsKey(allocation.getInvoiceId())
                || !allocation.isActive()
                || allocation.getOrderItemId() == null
                || allocation.getOrderItemId().isBlank()
                || !allocatedOrderItemIds.add(allocation.getOrderItemId())
                || allocation.getAllocatedQuantity() <= 0
                || allocation.getUnitPriceSnapshot() == null
                || allocation.getUnitPriceSnapshot().compareTo(BigDecimal.ZERO) <= 0
                || allocation.getUnitPriceSnapshot().scale() != 0
                || allocation.getUnitPriceSnapshot().precision() > MAX_MONEY_PRECISION) {
            throw invalidAllocationData();
        }

        OrderItem orderItem = orderItemById.get(allocation.getOrderItemId());
        if (orderItem == null
                || orderItem.getOrder() == null
                || orderItem.getOrder().getId() == null
                || !owningOrder.getId().equals(orderItem.getOrder().getId())
                || orderItem.getQuantity() <= 0
                || orderItem.getQuantity() != allocation.getAllocatedQuantity()
                || !isPayable(orderItem.getCookingStatus())) {
            throw invalidAllocationData();
        }
    }

    private Invoice createTargetInvoice(String orderId, BigDecimal targetSubtotal) {
        Invoice target = Invoice.builder()
                .orderId(orderId)
                .subtotal(targetSubtotal)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(targetSubtotal)
                .promotionId(null)
                .paid(false)
                .status(InvoiceStatus.ACTIVE)
                .mergedIntoInvoiceId(null)
                .splitFromInvoiceId(null)
                .build();
        Invoice savedTarget = invoiceRepository.save(target);
        invoiceRepository.flush();
        if (savedTarget.getId() == null
                || savedTarget.getId().isBlank()
                || savedTarget.getCreatedAt() == null) {
            throw invalidAllocationData();
        }
        return savedTarget;
    }

    private List<InvoiceItemAllocation> buildTargetAllocations(
            Invoice targetInvoice,
            List<InvoiceItemAllocation> sourceAllocations
    ) {
        List<InvoiceItemAllocation> targetAllocations = new ArrayList<>();
        for (InvoiceItemAllocation sourceAllocation : sourceAllocations) {
            targetAllocations.add(InvoiceItemAllocation.builder()
                    .invoiceId(targetInvoice.getId())
                    .orderItemId(sourceAllocation.getOrderItemId())
                    .allocatedQuantity(sourceAllocation.getAllocatedQuantity())
                    .unitPriceSnapshot(sourceAllocation.getUnitPriceSnapshot())
                    .active(true)
                    .build());
        }
        return targetAllocations;
    }

    private void validateFinalState(
            ValidatedInvoiceMergePlan plan,
            Order owningOrder,
            List<Invoice> sourceInvoices,
            List<InvoiceItemAllocation> sourceAllocations,
            Invoice targetInvoice,
            List<InvoiceItemAllocation> targetAllocations,
            Map<String, SourceInvoiceSnapshot> invoiceSnapshots,
            Map<String, SourceAllocationSnapshot> allocationSnapshots,
            MergeFinancials financials
    ) {
        validateTargetInvoice(plan, owningOrder, targetInvoice, financials);
        if (sourceInvoices.size() != plan.sourceInvoiceIds().size()
                || sourceAllocations.size() != targetAllocations.size()
                || invoiceSnapshots.size() != sourceInvoices.size()
                || allocationSnapshots.size() != sourceAllocations.size()) {
            throw invalidAllocationData();
        }

        for (Invoice sourceInvoice : sourceInvoices) {
            SourceInvoiceSnapshot snapshot = invoiceSnapshots.get(sourceInvoice.getId());
            if (snapshot == null
                    || !entityManager.contains(sourceInvoice)
                    || sourceInvoice.getStatus() != InvoiceStatus.MERGED
                    || !targetInvoice.getId().equals(sourceInvoice.getMergedIntoInvoiceId())
                    || targetInvoice.getId().equals(sourceInvoice.getId())
                    || !snapshot.matchesUnchangedFinancialHistory(sourceInvoice)) {
                throw invalidAllocationData();
            }
        }

        Set<String> targetAllocationIds = new LinkedHashSet<>();
        Map<String, InvoiceItemAllocation> targetAllocationByOrderItemId = new LinkedHashMap<>();
        BigDecimal targetAllocationSubtotal = BigDecimal.ZERO;
        for (InvoiceItemAllocation targetAllocation : targetAllocations) {
            if (targetAllocation == null
                    || targetAllocation.getId() == null
                    || targetAllocation.getId().isBlank()
                    || targetAllocation.getCreatedAt() == null
                    || !targetAllocationIds.add(targetAllocation.getId())
                    || targetAllocationByOrderItemId.put(
                    targetAllocation.getOrderItemId(),
                    targetAllocation
            ) != null
                    || !targetAllocation.isActive()
                    || !targetInvoice.getId().equals(targetAllocation.getInvoiceId())) {
                throw invalidAllocationData();
            }
            targetAllocationSubtotal = targetAllocationSubtotal.add(
                    targetAllocation.getUnitPriceSnapshot()
                            .multiply(BigDecimal.valueOf(targetAllocation.getAllocatedQuantity()))
            );
        }

        for (InvoiceItemAllocation sourceAllocation : sourceAllocations) {
            SourceAllocationSnapshot snapshot = allocationSnapshots.get(sourceAllocation.getId());
            InvoiceItemAllocation targetAllocation = snapshot == null
                    ? null
                    : targetAllocationByOrderItemId.get(snapshot.orderItemId());
            if (snapshot == null
                    || sourceAllocation.isActive()
                    || !snapshot.matchesUnchangedFields(sourceAllocation)
                    || targetAllocation == null
                    || !snapshot.matchesReplacement(targetAllocation)) {
                throw invalidAllocationData();
            }
        }

        Set<String> persistedTargetAllocationIds = invoiceItemAllocationRepository
                .findActiveByInvoiceIdsForUpdate(List.of(targetInvoice.getId()))
                .stream()
                .map(InvoiceItemAllocation::getId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        if (targetAllocationSubtotal.compareTo(targetInvoice.getSubtotal()) != 0
                || targetAllocationSubtotal.compareTo(financials.sourceSubtotalSum()) != 0
                || targetAllocationSubtotal.compareTo(financials.sourceTotalSum()) != 0
                || !persistedTargetAllocationIds.equals(targetAllocationIds)
                || !invoiceItemAllocationRepository
                .findActiveByInvoiceIdsForUpdate(plan.sourceInvoiceIds())
                .isEmpty()
                || paymentRepository.existsByInvoiceIdIn(plan.sourceInvoiceIds())
                || paymentRepository.existsByInvoiceId(targetInvoice.getId())) {
            throw invalidAllocationData();
        }
    }

    private void validateTargetInvoice(
            ValidatedInvoiceMergePlan plan,
            Order owningOrder,
            Invoice targetInvoice,
            MergeFinancials financials
    ) {
        if (!entityManager.contains(targetInvoice)
                || targetInvoice.getId() == null
                || targetInvoice.getId().isBlank()
                || plan.sourceInvoiceIds().contains(targetInvoice.getId())
                || !owningOrder.getId().equals(targetInvoice.getOrderId())
                || targetInvoice.getStatus() != InvoiceStatus.ACTIVE
                || targetInvoice.isPaid()
                || targetInvoice.getPromotionId() != null
                || targetInvoice.getMergedIntoInvoiceId() != null
                || targetInvoice.getSplitFromInvoiceId() != null
                || targetInvoice.getCreatedAt() == null
                || targetInvoice.getDiscountAmount() == null
                || targetInvoice.getDiscountAmount().compareTo(BigDecimal.ZERO) != 0
                || targetInvoice.getSubtotal().compareTo(financials.targetSubtotal()) != 0
                || targetInvoice.getTotalAmount().compareTo(financials.targetSubtotal()) != 0) {
            throw invalidAllocationData();
        }
    }

    private Map<String, SourceInvoiceSnapshot> captureInvoiceSnapshots(List<Invoice> invoices) {
        Map<String, SourceInvoiceSnapshot> snapshots = new LinkedHashMap<>();
        for (Invoice invoice : invoices) {
            SourceInvoiceSnapshot snapshot = SourceInvoiceSnapshot.from(invoice);
            if (snapshots.put(snapshot.id(), snapshot) != null) {
                throw invalidAllocationData();
            }
        }
        return snapshots;
    }

    private Map<String, SourceAllocationSnapshot> captureAllocationSnapshots(
            List<InvoiceItemAllocation> allocations
    ) {
        Map<String, SourceAllocationSnapshot> snapshots = new LinkedHashMap<>();
        for (InvoiceItemAllocation allocation : allocations) {
            SourceAllocationSnapshot snapshot = SourceAllocationSnapshot.from(allocation);
            if (snapshots.put(snapshot.id(), snapshot) != null) {
                throw invalidAllocationData();
            }
        }
        return snapshots;
    }

    private void validatePlanStructure(ValidatedInvoiceMergePlan plan) {
        if (plan == null
                || plan.orderId() == null
                || plan.orderId().isBlank()
                || plan.sourceInvoiceIds() == null
                || plan.sourceInvoiceIds().size() < 2
                || plan.sourceInvoiceIds().size() > 100) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_MERGE);
        }
        if (plan.sourceInvoiceIds().stream().anyMatch(id -> id == null || id.isBlank())) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_MERGE);
        }
        List<String> canonicalIds = plan.sourceInvoiceIds().stream().sorted().toList();
        if (!canonicalIds.equals(plan.sourceInvoiceIds())
                || new LinkedHashSet<>(canonicalIds).size() != canonicalIds.size()
        ) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_MERGE);
        }
    }

    private void validatePositiveMoney(BigDecimal amount) {
        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0
                || amount.scale() != 0
                || amount.precision() > MAX_MONEY_PRECISION) {
            throw invalidInvoiceTotal();
        }
    }

    private boolean isPayable(CookingStatus status) {
        return status == CookingStatus.READY || status == CookingStatus.SERVED;
    }

    private ApplicationException invalidInvoiceTotal() {
        return new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }

    private record MergeFinancials(
            BigDecimal targetSubtotal,
            BigDecimal sourceSubtotalSum,
            BigDecimal sourceTotalSum
    ) {}

    private record SourceInvoiceSnapshot(
            String id,
            String orderId,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            String promotionId,
            boolean paid,
            LocalDateTime createdAt,
            String splitFromInvoiceId
    ) {
        private static SourceInvoiceSnapshot from(Invoice invoice) {
            return new SourceInvoiceSnapshot(
                    invoice.getId(),
                    invoice.getOrderId(),
                    invoice.getSubtotal(),
                    invoice.getDiscountAmount(),
                    invoice.getTotalAmount(),
                    invoice.getPromotionId(),
                    invoice.isPaid(),
                    invoice.getCreatedAt(),
                    invoice.getSplitFromInvoiceId()
            );
        }

        private boolean matchesUnchangedFinancialHistory(Invoice invoice) {
            return id.equals(invoice.getId())
                    && orderId.equals(invoice.getOrderId())
                    && sameAmount(subtotal, invoice.getSubtotal())
                    && sameAmount(discountAmount, invoice.getDiscountAmount())
                    && sameAmount(totalAmount, invoice.getTotalAmount())
                    && Objects.equals(promotionId, invoice.getPromotionId())
                    && paid == invoice.isPaid()
                    && Objects.equals(createdAt, invoice.getCreatedAt())
                    && Objects.equals(splitFromInvoiceId, invoice.getSplitFromInvoiceId());
        }
    }

    private record SourceAllocationSnapshot(
            String id,
            String invoiceId,
            String orderItemId,
            int allocatedQuantity,
            BigDecimal unitPriceSnapshot,
            LocalDateTime createdAt
    ) {
        private static SourceAllocationSnapshot from(InvoiceItemAllocation allocation) {
            if (allocation == null
                    || allocation.getId() == null
                    || allocation.getInvoiceId() == null
                    || allocation.getOrderItemId() == null
                    || allocation.getUnitPriceSnapshot() == null) {
                throw new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
            }
            return new SourceAllocationSnapshot(
                    allocation.getId(),
                    allocation.getInvoiceId(),
                    allocation.getOrderItemId(),
                    allocation.getAllocatedQuantity(),
                    allocation.getUnitPriceSnapshot(),
                    allocation.getCreatedAt()
            );
        }

        private boolean matchesUnchangedFields(InvoiceItemAllocation allocation) {
            return id.equals(allocation.getId())
                    && invoiceId.equals(allocation.getInvoiceId())
                    && orderItemId.equals(allocation.getOrderItemId())
                    && allocatedQuantity == allocation.getAllocatedQuantity()
                    && sameAmount(unitPriceSnapshot, allocation.getUnitPriceSnapshot())
                    && Objects.equals(createdAt, allocation.getCreatedAt());
        }

        private boolean matchesReplacement(InvoiceItemAllocation allocation) {
            return orderItemId.equals(allocation.getOrderItemId())
                    && allocatedQuantity == allocation.getAllocatedQuantity()
                    && sameAmount(unitPriceSnapshot, allocation.getUnitPriceSnapshot());
        }
    }

    private static boolean sameAmount(BigDecimal expected, BigDecimal actual) {
        return expected == null
                ? actual == null
                : actual != null && expected.compareTo(actual) == 0;
    }
}
