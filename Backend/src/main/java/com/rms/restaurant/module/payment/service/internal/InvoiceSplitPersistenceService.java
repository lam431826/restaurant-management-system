package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.module.payment.dto.SplitInvoiceRequest;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
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
public class InvoiceSplitPersistenceService {

    private final InvoiceSplitValidator invoiceSplitValidator;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final EntityManager entityManager;

    @Transactional
    public PersistedInvoiceSplitResult splitAtomically(
            String sourceInvoiceId,
            SplitInvoiceRequest request
    ) {
        ValidatedInvoiceSplitPlan plan = invoiceSplitValidator.validateForUpdate(sourceInvoiceId, request);
        Invoice sourceInvoice = plan.sourceInvoice();
        SourceInvoiceSnapshot sourceSnapshot = SourceInvoiceSnapshot.from(sourceInvoice);
        Map<String, SourceAllocationSnapshot> allocationSnapshots = captureAllocationSnapshots(
                plan.sourceAllocations()
        );
        validateManagedPlan(plan, sourceSnapshot, allocationSnapshots);

        List<Invoice> childInvoices = buildChildInvoices(plan);
        List<Invoice> savedChildren = invoiceRepository.saveAll(childInvoices);
        invoiceRepository.flush();
        validatePersistedChildIdentities(savedChildren, plan.groups().size());

        for (InvoiceItemAllocation sourceAllocation : plan.sourceAllocations()) {
            sourceAllocation.setActive(false);
        }
        invoiceItemAllocationRepository.saveAll(plan.sourceAllocations());
        // The filtered unique index requires old rows to become inactive before replacements are inserted.
        invoiceItemAllocationRepository.flush();

        List<InvoiceItemAllocation> childAllocations = buildChildAllocations(plan, savedChildren);
        List<InvoiceItemAllocation> savedChildAllocations = invoiceItemAllocationRepository.saveAll(
                childAllocations
        );
        invoiceItemAllocationRepository.flush();

        sourceInvoice.setStatus(InvoiceStatus.SPLIT);
        invoiceRepository.save(sourceInvoice);
        invoiceRepository.flush();

        validateFinalState(
                plan,
                sourceSnapshot,
                allocationSnapshots,
                savedChildren,
                savedChildAllocations
        );
        return buildResult(plan, savedChildren, savedChildAllocations);
    }

    private void validateManagedPlan(
            ValidatedInvoiceSplitPlan plan,
            SourceInvoiceSnapshot sourceSnapshot,
            Map<String, SourceAllocationSnapshot> allocationSnapshots
    ) {
        if (!entityManager.contains(plan.sourceInvoice())
                || !entityManager.contains(plan.owningOrder())
                || plan.sourceInvoice().getStatus() != InvoiceStatus.ACTIVE
                || plan.sourceInvoice().isPaid()
                || plan.sourceInvoice().getMergedIntoInvoiceId() != null
                || plan.sourceInvoice().getPromotionId() != null
                || plan.groups().size() < 2
                || plan.sourceAllocations().size() < 2
                || allocationSnapshots.size() != plan.sourceAllocations().size()) {
            throw invalidPersistenceState();
        }

        for (InvoiceItemAllocation allocation : plan.sourceAllocations()) {
            if (!entityManager.contains(allocation) || !allocation.isActive()) {
                throw invalidPersistenceState();
            }
        }
        validateSourceUnchanged(plan.sourceInvoice(), sourceSnapshot, InvoiceStatus.ACTIVE);
    }

    private List<Invoice> buildChildInvoices(ValidatedInvoiceSplitPlan plan) {
        List<Invoice> children = new ArrayList<>();
        for (ValidatedInvoiceSplitPlan.ValidatedGroup group : plan.groups()) {
            children.add(Invoice.builder()
                    .orderId(plan.owningOrder().getId())
                    .subtotal(group.subtotal())
                    .discountAmount(BigDecimal.ZERO)
                    .totalAmount(group.subtotal())
                    .promotionId(null)
                    .paid(false)
                    .status(InvoiceStatus.ACTIVE)
                    .mergedIntoInvoiceId(null)
                    .splitFromInvoiceId(plan.sourceInvoice().getId())
                    .build());
        }
        return children;
    }

    private List<InvoiceItemAllocation> buildChildAllocations(
            ValidatedInvoiceSplitPlan plan,
            List<Invoice> children
    ) {
        if (children.size() != plan.groups().size()) {
            throw invalidPersistenceState();
        }

        List<InvoiceItemAllocation> allocations = new ArrayList<>();
        for (int groupIndex = 0; groupIndex < plan.groups().size(); groupIndex++) {
            Invoice child = children.get(groupIndex);
            for (InvoiceItemAllocation sourceAllocation : plan.groups().get(groupIndex).allocations()) {
                allocations.add(InvoiceItemAllocation.builder()
                        .invoiceId(child.getId())
                        .orderItemId(sourceAllocation.getOrderItemId())
                        .allocatedQuantity(sourceAllocation.getAllocatedQuantity())
                        .unitPriceSnapshot(sourceAllocation.getUnitPriceSnapshot())
                        .active(true)
                        .build());
            }
        }
        return allocations;
    }

    private void validateFinalState(
            ValidatedInvoiceSplitPlan plan,
            SourceInvoiceSnapshot sourceSnapshot,
            Map<String, SourceAllocationSnapshot> sourceSnapshots,
            List<Invoice> children,
            List<InvoiceItemAllocation> childAllocations
    ) {
        validateSourceUnchanged(plan.sourceInvoice(), sourceSnapshot, InvoiceStatus.SPLIT);
        if (children.size() != plan.groups().size()
                || childAllocations.size() != plan.sourceAllocations().size()) {
            throw invalidPersistenceState();
        }

        Set<String> sourceAllocationIds = new LinkedHashSet<>();
        Set<String> childAllocationIds = new LinkedHashSet<>();
        BigDecimal childSubtotalSum = BigDecimal.ZERO;
        BigDecimal childTotalSum = BigDecimal.ZERO;
        int allocationOffset = 0;
        for (int groupIndex = 0; groupIndex < children.size(); groupIndex++) {
            Invoice child = children.get(groupIndex);
            ValidatedInvoiceSplitPlan.ValidatedGroup group = plan.groups().get(groupIndex);
            validateChildInvoice(child, plan, group);
            childSubtotalSum = childSubtotalSum.add(child.getSubtotal());
            childTotalSum = childTotalSum.add(child.getTotalAmount());

            for (InvoiceItemAllocation sourceAllocation : group.allocations()) {
                if (allocationOffset >= childAllocations.size()
                        || !sourceAllocationIds.add(sourceAllocation.getId())) {
                    throw invalidPersistenceState();
                }
                SourceAllocationSnapshot sourceAllocationSnapshot = sourceSnapshots.get(
                        sourceAllocation.getId()
                );
                validateSourceAllocation(sourceAllocation, sourceAllocationSnapshot);
                validateChildAllocation(
                        childAllocations.get(allocationOffset++),
                        child,
                        sourceAllocationSnapshot
                );
                if (!childAllocationIds.add(childAllocations.get(allocationOffset - 1).getId())) {
                    throw invalidPersistenceState();
                }
            }
        }

        if (allocationOffset != childAllocations.size()
                || !sourceAllocationIds.equals(plan.coveredAllocationIds())
                || childSubtotalSum.compareTo(plan.sourceSubtotal()) != 0
                || childTotalSum.compareTo(plan.sourceTotal()) != 0) {
            throw invalidPersistenceState();
        }
    }

    private void validateChildInvoice(
            Invoice child,
            ValidatedInvoiceSplitPlan plan,
            ValidatedInvoiceSplitPlan.ValidatedGroup group
    ) {
        if (child == null
                || child.getId() == null
                || child.getId().isBlank()
                || child.getCreatedAt() == null
                || !plan.owningOrder().getId().equals(child.getOrderId())
                || child.getStatus() != InvoiceStatus.ACTIVE
                || child.isPaid()
                || child.getPromotionId() != null
                || child.getMergedIntoInvoiceId() != null
                || !plan.sourceInvoice().getId().equals(child.getSplitFromInvoiceId())
                || child.getDiscountAmount() == null
                || child.getDiscountAmount().compareTo(BigDecimal.ZERO) != 0
                || child.getSubtotal() == null
                || child.getSubtotal().compareTo(group.subtotal()) != 0
                || child.getTotalAmount() == null
                || child.getTotalAmount().compareTo(group.subtotal()) != 0) {
            throw invalidPersistenceState();
        }
    }

    private void validateSourceAllocation(
            InvoiceItemAllocation allocation,
            SourceAllocationSnapshot snapshot
    ) {
        if (allocation == null
                || snapshot == null
                || allocation.isActive()
                || !snapshot.matchesUnchangedFields(allocation)) {
            throw invalidPersistenceState();
        }
    }

    private void validateChildAllocation(
            InvoiceItemAllocation allocation,
            Invoice child,
            SourceAllocationSnapshot source
    ) {
        if (allocation == null
                || allocation.getId() == null
                || allocation.getId().isBlank()
                || allocation.getCreatedAt() == null
                || !allocation.isActive()
                || !child.getId().equals(allocation.getInvoiceId())
                || !source.orderItemId().equals(allocation.getOrderItemId())
                || source.allocatedQuantity() != allocation.getAllocatedQuantity()
                || allocation.getUnitPriceSnapshot() == null
                || allocation.getUnitPriceSnapshot().compareTo(source.unitPriceSnapshot()) != 0) {
            throw invalidPersistenceState();
        }
    }

    private PersistedInvoiceSplitResult buildResult(
            ValidatedInvoiceSplitPlan plan,
            List<Invoice> children,
            List<InvoiceItemAllocation> childAllocations
    ) {
        List<PersistedInvoiceSplitResult.PersistedChildInvoice> childResults = new ArrayList<>();
        int allocationOffset = 0;
        for (int groupIndex = 0; groupIndex < plan.groups().size(); groupIndex++) {
            ValidatedInvoiceSplitPlan.ValidatedGroup group = plan.groups().get(groupIndex);
            List<String> sourceAllocationIds = group.allocations().stream()
                    .map(InvoiceItemAllocation::getId)
                    .toList();
            List<String> childAllocationIds = new ArrayList<>();
            for (int i = 0; i < group.allocations().size(); i++) {
                childAllocationIds.add(childAllocations.get(allocationOffset++).getId());
            }
            childResults.add(new PersistedInvoiceSplitResult.PersistedChildInvoice(
                    children.get(groupIndex).getId(),
                    group.subtotal(),
                    group.subtotal(),
                    sourceAllocationIds,
                    childAllocationIds
            ));
        }
        return new PersistedInvoiceSplitResult(
                plan.sourceInvoice().getId(),
                plan.sourceInvoice().getStatus(),
                plan.sourceSubtotal(),
                plan.sourceTotal(),
                childResults
        );
    }

    private Map<String, SourceAllocationSnapshot> captureAllocationSnapshots(
            List<InvoiceItemAllocation> allocations
    ) {
        Map<String, SourceAllocationSnapshot> snapshots = new LinkedHashMap<>();
        for (InvoiceItemAllocation allocation : allocations) {
            SourceAllocationSnapshot snapshot = SourceAllocationSnapshot.from(allocation);
            if (snapshots.put(snapshot.id(), snapshot) != null) {
                throw invalidPersistenceState();
            }
        }
        return snapshots;
    }

    private void validatePersistedChildIdentities(List<Invoice> children, int expectedCount) {
        Set<String> childIds = new LinkedHashSet<>();
        if (children.size() != expectedCount) {
            throw invalidPersistenceState();
        }
        for (Invoice child : children) {
            if (child == null
                    || child.getId() == null
                    || child.getId().isBlank()
                    || !childIds.add(child.getId())) {
                throw invalidPersistenceState();
            }
        }
    }

    private void validateSourceUnchanged(
            Invoice source,
            SourceInvoiceSnapshot snapshot,
            InvoiceStatus expectedStatus
    ) {
        if (!snapshot.id().equals(source.getId())
                || !snapshot.orderId().equals(source.getOrderId())
                || source.getStatus() != expectedStatus
                || source.isPaid() != snapshot.paid()
                || !sameAmount(snapshot.subtotal(), source.getSubtotal())
                || !sameAmount(snapshot.discountAmount(), source.getDiscountAmount())
                || !sameAmount(snapshot.totalAmount(), source.getTotalAmount())
                || !Objects.equals(snapshot.promotionId(), source.getPromotionId())
                || !Objects.equals(snapshot.createdAt(), source.getCreatedAt())
                || !Objects.equals(snapshot.splitFromInvoiceId(), source.getSplitFromInvoiceId())
                || source.getMergedIntoInvoiceId() != null) {
            throw invalidPersistenceState();
        }
    }

    private boolean sameAmount(BigDecimal expected, BigDecimal actual) {
        return expected == null ? actual == null : actual != null && expected.compareTo(actual) == 0;
    }

    private ApplicationException invalidPersistenceState() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }

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
                    || allocation.getId().isBlank()
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
                    && allocation.getUnitPriceSnapshot() != null
                    && unitPriceSnapshot.compareTo(allocation.getUnitPriceSnapshot()) == 0
                    && Objects.equals(createdAt, allocation.getCreatedAt());
        }
    }
}
