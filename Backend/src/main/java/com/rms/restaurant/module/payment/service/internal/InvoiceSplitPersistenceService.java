package com.rms.restaurant.module.payment.service.internal;

import com.rms.restaurant.common.codegen.BusinessCodeGenerator;
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
    private final InvoiceAllocationQuantityGuard quantityGuard;
    private final BusinessCodeGenerator businessCodeGenerator;
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

        // Source allocations shrink to their remainder. An allocation fully moved to a child
        // is deleted outright rather than deactivated: the source invoice stays ACTIVE (it
        // never transitions to SPLIT), so there is no "this invoice just became historical"
        // moment to freeze a snapshot for. If the row were left behind merely deactivated, it
        // would keep living under this invoice_id indefinitely — and if this same invoice is
        // later used as a merge source, the historical loader for MERGED/SPLIT invoices reads
        // every row ever tied to invoice_id (active or not), resurrecting quantity this
        // invoice gave away in an earlier, unrelated split and double-counting it.
        List<InvoiceItemAllocation> keptAllocations = new ArrayList<>();
        List<InvoiceItemAllocation> exhaustedAllocations = new ArrayList<>();
        for (InvoiceItemAllocation sourceAllocation : plan.sourceAllocations()) {
            int remaining = plan.remainingQuantityByAllocationId()
                    .getOrDefault(sourceAllocation.getId(), -1);
            if (remaining < 0) {
                throw invalidPersistenceState();
            }
            if (remaining == 0) {
                exhaustedAllocations.add(sourceAllocation);
            } else {
                sourceAllocation.setAllocatedQuantity(remaining);
                keptAllocations.add(sourceAllocation);
            }
        }
        invoiceItemAllocationRepository.saveAll(keptAllocations);
        invoiceItemAllocationRepository.deleteAll(exhaustedAllocations);
        invoiceItemAllocationRepository.flush();

        List<InvoiceItemAllocation> childAllocations = buildChildAllocations(plan, savedChildren);
        List<InvoiceItemAllocation> savedChildAllocations = invoiceItemAllocationRepository.saveAll(
                childAllocations
        );
        invoiceItemAllocationRepository.flush();

        // The source keeps its remainder and stays ACTIVE and payable.
        sourceInvoice.setSubtotal(plan.remainingSubtotal());
        sourceInvoice.setTotalAmount(plan.remainingSubtotal());
        invoiceRepository.save(sourceInvoice);
        invoiceRepository.flush();

        validateFinalState(
                plan,
                sourceSnapshot,
                allocationSnapshots,
                savedChildren,
                savedChildAllocations
        );
        quantityGuard.assertNotOverAllocated(plan.orderItems());
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
                || plan.groups().isEmpty()
                || plan.sourceAllocations().isEmpty()
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
                    .code(businessCodeGenerator.nextInvoiceCode())
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
            for (ValidatedInvoiceSplitPlan.ValidatedSelection selection
                    : plan.groups().get(groupIndex).selections()) {
                allocations.add(InvoiceItemAllocation.builder()
                        .invoiceId(child.getId())
                        .orderItemId(selection.allocation().getOrderItemId())
                        .allocatedQuantity(selection.quantity())
                        .unitPriceSnapshot(selection.allocation().getUnitPriceSnapshot())
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
        // The source keeps its identity and stays ACTIVE; only its money moves.
        validateSourceRetained(plan.sourceInvoice(), sourceSnapshot, plan.remainingSubtotal());
        if (children.size() != plan.groups().size()) {
            throw invalidPersistenceState();
        }

        Set<String> childAllocationIds = new LinkedHashSet<>();
        BigDecimal childSubtotalSum = BigDecimal.ZERO;
        BigDecimal childTotalSum = BigDecimal.ZERO;
        // Units handed to children, per source allocation.
        Map<String, Integer> movedByAllocationId = new LinkedHashMap<>();
        int allocationOffset = 0;

        for (int groupIndex = 0; groupIndex < children.size(); groupIndex++) {
            Invoice child = children.get(groupIndex);
            ValidatedInvoiceSplitPlan.ValidatedGroup group = plan.groups().get(groupIndex);
            validateChildInvoice(child, plan, group);
            childSubtotalSum = childSubtotalSum.add(child.getSubtotal());
            childTotalSum = childTotalSum.add(child.getTotalAmount());

            for (ValidatedInvoiceSplitPlan.ValidatedSelection selection : group.selections()) {
                if (allocationOffset >= childAllocations.size()) {
                    throw invalidPersistenceState();
                }
                SourceAllocationSnapshot sourceAllocationSnapshot = sourceSnapshots.get(
                        selection.allocation().getId()
                );
                validateChildAllocation(
                        childAllocations.get(allocationOffset++),
                        child,
                        sourceAllocationSnapshot,
                        selection.quantity()
                );
                if (!childAllocationIds.add(childAllocations.get(allocationOffset - 1).getId())) {
                    throw invalidPersistenceState();
                }
                movedByAllocationId.merge(
                        selection.allocation().getId(), selection.quantity(), Integer::sum
                );
            }
        }

        // Quantity conservation, per source allocation:
        //     remaining on source + units moved to children == original quantity.
        for (InvoiceItemAllocation sourceAllocation : plan.sourceAllocations()) {
            SourceAllocationSnapshot snapshot = sourceSnapshots.get(sourceAllocation.getId());
            int expectedRemaining = plan.remainingQuantityByAllocationId()
                    .getOrDefault(sourceAllocation.getId(), -1);
            int moved = movedByAllocationId.getOrDefault(sourceAllocation.getId(), 0);
            if (snapshot == null
                    || expectedRemaining < 0
                    || expectedRemaining + moved != snapshot.allocatedQuantity()) {
                throw invalidPersistenceState();
            }
            validateSourceAllocationAfterSplit(sourceAllocation, snapshot, expectedRemaining);
        }

        // Money conservation: source remainder + every child == the original source total.
        if (allocationOffset != childAllocations.size()
                || childSubtotalSum.add(plan.remainingSubtotal())
                        .compareTo(plan.sourceSubtotal()) != 0
                || childTotalSum.add(plan.remainingSubtotal())
                        .compareTo(plan.sourceTotal()) != 0) {
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
                || child.getCode() == null
                || child.getCode().isBlank()
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

    /**
     * A source allocation either keeps exactly its remaining units and stays active, or is
     * fully moved and deleted outright (see the comment in {@link #splitAtomically} for why
     * deletion, not deactivation, is correct here). Identity fields on a kept row must never
     * drift.
     */
    private void validateSourceAllocationAfterSplit(
            InvoiceItemAllocation allocation,
            SourceAllocationSnapshot snapshot,
            int expectedRemaining
    ) {
        if (allocation == null || snapshot == null) {
            throw invalidPersistenceState();
        }
        if (expectedRemaining == 0) {
            if (invoiceItemAllocationRepository.existsById(allocation.getId())) {
                throw invalidPersistenceState();
            }
            return;
        }
        if (!snapshot.matchesIdentityFields(allocation)
                || !allocation.isActive()
                || allocation.getAllocatedQuantity() != expectedRemaining) {
            throw invalidPersistenceState();
        }
    }

    private void validateChildAllocation(
            InvoiceItemAllocation allocation,
            Invoice child,
            SourceAllocationSnapshot source,
            int expectedQuantity
    ) {
        if (allocation == null
                || source == null
                || allocation.getId() == null
                || allocation.getId().isBlank()
                || allocation.getCreatedAt() == null
                || !allocation.isActive()
                || !child.getId().equals(allocation.getInvoiceId())
                || !source.orderItemId().equals(allocation.getOrderItemId())
                || expectedQuantity < 1
                || allocation.getAllocatedQuantity() != expectedQuantity
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
            List<String> sourceAllocationIds = group.selections().stream()
                    .map(selection -> selection.allocation().getId())
                    .toList();
            List<String> childAllocationIds = new ArrayList<>();
            for (int i = 0; i < group.selections().size(); i++) {
                childAllocationIds.add(childAllocations.get(allocationOffset++).getId());
            }
            childResults.add(new PersistedInvoiceSplitResult.PersistedChildInvoice(
                    children.get(groupIndex).getId(),
                    children.get(groupIndex).getCode(),
                    group.subtotal(),
                    group.subtotal(),
                    sourceAllocationIds,
                    childAllocationIds
            ));
        }
        return new PersistedInvoiceSplitResult(
                plan.sourceInvoice().getId(),
                plan.sourceInvoice().getCode(),
                plan.sourceInvoice().getStatus(),
                // What the source actually kept, not its pre-split total — the source stays
                // ACTIVE and this is the amount now displayed/charged on it.
                plan.remainingSubtotal(),
                plan.remainingSubtotal(),
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

    /**
     * After a partial split the source stays ACTIVE and unpaid; only its subtotal/total drop
     * to the retained remainder. Everything identifying it must be untouched.
     */
    private void validateSourceRetained(
            Invoice source,
            SourceInvoiceSnapshot snapshot,
            BigDecimal expectedRemainingSubtotal
    ) {
        if (!snapshot.id().equals(source.getId())
                || !snapshot.orderId().equals(source.getOrderId())
                || source.getStatus() != InvoiceStatus.ACTIVE
                || source.isPaid() != snapshot.paid()
                || source.isPaid()
                || !sameAmount(expectedRemainingSubtotal, source.getSubtotal())
                || !sameAmount(expectedRemainingSubtotal, source.getTotalAmount())
                || expectedRemainingSubtotal.compareTo(BigDecimal.ZERO) <= 0
                || !sameAmount(snapshot.discountAmount(), source.getDiscountAmount())
                || !Objects.equals(snapshot.promotionId(), source.getPromotionId())
                || !Objects.equals(snapshot.createdAt(), source.getCreatedAt())
                || !Objects.equals(snapshot.splitFromInvoiceId(), source.getSplitFromInvoiceId())
                || source.getMergedIntoInvoiceId() != null) {
            throw invalidPersistenceState();
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

        /**
         * Identity only — deliberately excludes allocatedQuantity, which a partial split is
         * expected to reduce. The quantity itself is checked against the plan's remainder.
         */
        private boolean matchesIdentityFields(InvoiceItemAllocation allocation) {
            return id.equals(allocation.getId())
                    && invoiceId.equals(allocation.getInvoiceId())
                    && orderItemId.equals(allocation.getOrderItemId())
                    && allocation.getUnitPriceSnapshot() != null
                    && unitPriceSnapshot.compareTo(allocation.getUnitPriceSnapshot()) == 0
                    && Objects.equals(createdAt, allocation.getCreatedAt());
        }
    }
}
