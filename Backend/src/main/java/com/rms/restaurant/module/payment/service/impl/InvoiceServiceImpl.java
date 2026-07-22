package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.codegen.BusinessCodeGenerator;
import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.notification.service.NotificationDispatcher;
import com.rms.restaurant.common.utils.mail.GmailService;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.payment.dto.*;
import com.rms.restaurant.module.payment.mapper.InvoiceMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.payment.service.InvoiceService;
import com.rms.restaurant.module.payment.service.internal.InvoiceMergePersistenceService;
import com.rms.restaurant.module.payment.service.internal.InvoiceMergeValidator;
import com.rms.restaurant.module.payment.service.internal.InvoiceSplitPersistenceService;
import com.rms.restaurant.module.payment.service.internal.PersistedInvoiceMergeResult;
import com.rms.restaurant.module.payment.service.internal.PersistedInvoiceSplitResult;
import com.rms.restaurant.module.payment.service.internal.ValidatedInvoiceMergePlan;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.user.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final String PAYMENT_STATUS_PAID = "PAID";
    private static final List<InvoiceStatus> ALL_INVOICE_STATUSES = List.of(InvoiceStatus.values());
    // Only CASH/QR are selectable payment methods today; any other value on a historical
    // row is intentionally left unmapped so the invoice email omits it rather than guess.
    private static final Map<com.rms.restaurant.common.utils.enums.PaymentMethod, String> PAYMENT_METHOD_LABELS =
            Map.of(
                    com.rms.restaurant.common.utils.enums.PaymentMethod.CASH, "Tiền mặt",
                    com.rms.restaurant.common.utils.enums.PaymentMethod.QR, "Mã QR"
            );

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PromotionRepository promotionRepository;
    private final PaymentRepository paymentRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final MenuItemRepository menuItemRepository;
    private final InvoiceMapper invoiceMapper;
    private final InvoiceSplitPersistenceService invoiceSplitPersistenceService;
    private final InvoiceMergeValidator invoiceMergeValidator;
    private final InvoiceMergePersistenceService invoiceMergePersistenceService;
    private final AuditService auditService;
    private final NotificationDispatcher notificationDispatcher;
    private final GmailService gmailService;
    private final BusinessCodeGenerator businessCodeGenerator;

    // A business code typed into a free-text search field ("DH000123"), case-insensitive.
    private static final java.util.regex.Pattern ORDER_CODE_PATTERN =
            java.util.regex.Pattern.compile("^DH\\d+$", java.util.regex.Pattern.CASE_INSENSITIVE);

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId, List<InvoiceStatus> statuses) {
        orderId = resolveOrderIdFilter(orderId);
        boolean hasOrderId = orderId != null && !orderId.isBlank();
        // No lifecycle filter means "every status", preserving the existing contract for
        // the Cashier order view, which resolves ACTIVE/SPLIT/MERGED state itself.
        List<InvoiceStatus> effectiveStatuses = (statuses == null || statuses.isEmpty())
                ? ALL_INVOICE_STATUSES
                : statuses;
        List<Invoice> invoices;

        if (hasOrderId && paid != null) {
            invoices = invoiceRepository.findByOrderIdAndPaidAndStatusInOrderByCreatedAtDescIdDesc(
                    orderId.trim(), paid, effectiveStatuses);
        } else if (hasOrderId) {
            invoices = invoiceRepository.findByOrderIdAndStatusInOrderByCreatedAtDescIdDesc(
                    orderId.trim(), effectiveStatuses);
        } else if (paid != null) {
            invoices = invoiceRepository.findByPaidAndStatusInOrderByCreatedAtDescIdDesc(
                    paid, effectiveStatuses);
        } else {
            invoices = invoiceRepository.findByStatusInOrderByCreatedAtDescIdDesc(effectiveStatuses);
        }

        resolveAllocationLines(invoices);
        Map<String, String> lineageCodesById = resolveLineageCodes(invoices);
        Map<String, String> orderCodesByOrderId = resolveOrderCodes(invoices);

        List<InvoiceSummaryResponse> responses = new ArrayList<>();
        for (Invoice invoice : invoices) {
            responses.add(invoiceMapper.toSummaryResponse(invoice, lineageCodesById, orderCodesByOrderId));
        }
        return responses;
    }

    /** Batch-resolves codes for every invoice referenced via mergedIntoInvoiceId/splitFromInvoiceId. */
    private Map<String, String> resolveLineageCodes(List<Invoice> invoices) {
        Set<String> referencedIds = new LinkedHashSet<>();
        for (Invoice invoice : invoices) {
            if (invoice.getMergedIntoInvoiceId() != null) referencedIds.add(invoice.getMergedIntoInvoiceId());
            if (invoice.getSplitFromInvoiceId() != null) referencedIds.add(invoice.getSplitFromInvoiceId());
        }
        // Map.of() rejects a null key on get(), and mergedIntoInvoiceId/splitFromInvoiceId
        // are null for most invoices — a plain LinkedHashMap tolerates that lookup and
        // just returns null, which is exactly the "no lineage code" case callers expect.
        if (referencedIds.isEmpty()) {
            return new LinkedHashMap<>();
        }
        return invoiceRepository.findAllById(referencedIds).stream()
                .collect(Collectors.toMap(Invoice::getId, Invoice::getCode));
    }

    /** Batch-resolves the owning order's code for every invoice, keyed by orderId. */
    private Map<String, String> resolveOrderCodes(List<Invoice> invoices) {
        Set<String> orderIds = invoices.stream()
                .map(Invoice::getOrderId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (orderIds.isEmpty()) {
            return new LinkedHashMap<>();
        }
        return orderRepository.findAllById(orderIds).stream()
                .collect(Collectors.toMap(Order::getId, Order::getCode));
    }

    @Override
    public InvoiceResponse generate(GenerateInvoiceRequest request, String username) {
        String orderId = request.orderId().trim();

        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        validateOrderCanBeInvoiced(order);
        if (invoiceRepository.existsByOrderId(orderId)) {
            throw new ApplicationException(ApplicationError.ORDER_ALREADY_INVOICED);
        }

        List<OrderItem> lockedOrderItems = orderItemRepository.findAllByOrderIdForUpdate(orderId);
        List<OrderItem> payableItems = validateOrderItemsForInvoice(order, lockedOrderItems);
        validateNoActiveAllocationConflict(order, payableItems);
        BigDecimal subtotal = calculateSubtotal(payableItems);
        validateInvoiceSubtotal(subtotal);

        Promotion promotion = null;
        BigDecimal discountAmount = BigDecimal.ZERO;

        if (request.promotionCode() != null && !request.promotionCode().isBlank()) {
            promotion = findActivePromotionForUpdate(request.promotionCode());
            validatePromotionDate(promotion);
            validatePromotionUsage(promotion);
            discountAmount = calculateDiscount(promotion, subtotal);
        }

        BigDecimal totalAmount = subtotal.subtract(discountAmount);
        validateInvoiceTotal(totalAmount);

        Invoice invoice = Invoice.builder()
                .code(businessCodeGenerator.nextInvoiceCode())
                .orderId(orderId)
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .promotionId(promotion == null ? null : promotion.getId())
                .paid(false)
                .status(InvoiceStatus.ACTIVE)
                .mergedIntoInvoiceId(null)
                .splitFromInvoiceId(null)
                .createdBy(username)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);
        List<InvoiceItemAllocation> allocations = payableItems.stream()
                .map(item -> InvoiceItemAllocation.builder()
                        .invoiceId(savedInvoice.getId())
                        .orderItemId(item.getId())
                        .allocatedQuantity(item.getQuantity())
                        .unitPriceSnapshot(item.getUnitPrice())
                        .active(true)
                        .build())
                .collect(Collectors.toList());
        invoiceItemAllocationRepository.saveAll(allocations);

        if (promotion != null) {
            incrementUsedCount(promotion);
        }

        audit("INVOICE_GENERATE", savedInvoice.getId(),
                "{\"orderId\":\"" + esc(orderId) + "\",\"totalAmount\":" + savedInvoice.getTotalAmount()
                        + ",\"promotionCode\":\"" + esc(request.promotionCode()) + "\"}");

        return invoiceMapper.toResponse(savedInvoice);
    }

    @Override
    public InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request) {
        LockedDiscountContext lockContext = lockOrderAndInvoiceForDiscount(invoiceId);
        Order order = lockContext.order();
        Invoice invoice = lockContext.invoice();

        validateInvoiceCanApplyDiscount(invoice);

        validateOrderCanApplyDiscount(order);
        validateInvoiceHasNoOrphanDiscount(invoice);

        Promotion promotion = findActivePromotionForUpdate(request.promotionCode());
        validateExistingPromotionForApply(invoice, promotion);
        validatePromotionDate(promotion);
        validatePromotionUsage(promotion);

        BigDecimal discountAmount = calculateDiscount(promotion, invoice.getSubtotal());
        BigDecimal totalAmount = invoice.getSubtotal().subtract(discountAmount);
        validateInvoiceTotal(totalAmount);

        invoice.setPromotionId(promotion.getId());
        invoice.setDiscountAmount(discountAmount);
        invoice.setTotalAmount(totalAmount);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        incrementUsedCount(promotion);

        audit("INVOICE_APPLY_DISCOUNT", savedInvoice.getId(),
                "{\"promotionCode\":\"" + esc(promotion.getCode()) + "\",\"discountAmount\":" + discountAmount
                        + ",\"totalAmount\":" + totalAmount + "}");

        return invoiceMapper.toResponse(savedInvoice);
    }

    private LockedDiscountContext lockOrderAndInvoiceForDiscount(String invoiceId) {
        String projectedOrderId = invoiceRepository.findOrderIdById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        if (projectedOrderId.isBlank()) {
            throw invalidAllocationData();
        }

        Order order = orderRepository.findByIdForUpdate(projectedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        validateLockedInvoiceOwnership(invoiceId, projectedOrderId, order, invoice);
        return new LockedDiscountContext(order, invoice);
    }

    private void validateLockedInvoiceOwnership(
            String requestedInvoiceId,
            String projectedOrderId,
            Order order,
            Invoice invoice
    ) {
        if (order.getId() == null
                || !projectedOrderId.equals(order.getId())
                || invoice.getId() == null
                || !requestedInvoiceId.equals(invoice.getId())
                || invoice.getOrderId() == null
                || invoice.getOrderId().isBlank()
                || !projectedOrderId.equals(invoice.getOrderId())
                || !order.getId().equals(invoice.getOrderId())) {
            throw invalidAllocationData();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailResponse getById(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        List<ResolvedAllocationLine> allocationLines = resolveAllocationLines(invoice);
        Map<String, String> menuItemCodesById = menuItemCodesById(allocationLines);
        List<InvoiceItemResponse> items = allocationLines.stream()
                .map(line -> toInvoiceItemResponse(line, menuItemCodesById))
                .collect(Collectors.toList());

        String promotionCode = null;
        if (invoice.getPromotionId() != null) {
            promotionCode = promotionRepository.findById(invoice.getPromotionId())
                    .map(Promotion::getCode)
                    .orElse(null);
        }

        List<Invoice> splitChildren = loadSplitChildren(invoice);
        List<Invoice> mergedSources = loadMergedSources(invoice);
        String mergedIntoInvoiceCode = invoice.getMergedIntoInvoiceId() == null
                ? null
                : invoiceRepository.findById(invoice.getMergedIntoInvoiceId()).map(Invoice::getCode).orElse(null);
        String splitFromInvoiceCode = invoice.getSplitFromInvoiceId() == null
                ? null
                : invoiceRepository.findById(invoice.getSplitFromInvoiceId()).map(Invoice::getCode).orElse(null);
        String orderCode = orderRepository.findById(invoice.getOrderId()).map(Order::getCode).orElse(null);
        String createdByName = invoice.getCreatedBy() == null
                ? null
                : userRepository.findByUsername(invoice.getCreatedBy()).map(User::getFullName).orElse(invoice.getCreatedBy());

        return new InvoiceDetailResponse(
                invoice.getId(),
                invoice.getCode(),
                invoice.getOrderId(),
                orderCode,
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                invoice.getCreatedAt(),
                createdByName,
                invoice.getPromotionId(),
                promotionCode,
                items,
                invoice.getStatus(),
                invoice.getMergedIntoInvoiceId(),
                mergedIntoInvoiceCode,
                invoice.getSplitFromInvoiceId(),
                splitFromInvoiceCode,
                splitChildren.stream().map(Invoice::getId).toList(),
                splitChildren.stream().map(Invoice::getCode).toList(),
                mergedSources.stream().map(Invoice::getId).toList(),
                mergedSources.stream().map(Invoice::getCode).toList()
        );
    }

    /** Children created when this invoice was split. Only queried for a SPLIT source. */
    private List<Invoice> loadSplitChildren(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.SPLIT) {
            return List.of();
        }
        return invoiceRepository.findBySplitFromInvoiceIdOrderByCreatedAtAscIdAsc(invoice.getId());
    }

    /** Sources merged into this invoice. Only queried for an ACTIVE merge target. */
    private List<Invoice> loadMergedSources(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            return List.of();
        }
        return invoiceRepository.findByMergedIntoInvoiceIdOrderByCreatedAtAscIdAsc(invoice.getId());
    }

    @Override
    public SplitInvoiceResponse split(String invoiceId, SplitInvoiceRequest request, String username) {
        PersistedInvoiceSplitResult result = invoiceSplitPersistenceService.splitAtomically(invoiceId, request, username);
        List<SplitInvoiceChildResponse> children = result.children().stream()
                .map(child -> new SplitInvoiceChildResponse(
                        child.childInvoiceId(),
                        child.childInvoiceCode(),
                        child.subtotal(),
                        child.totalAmount(),
                        child.sourceAllocationIds(),
                        child.childAllocationIds()
                ))
                .toList();

        return new SplitInvoiceResponse(
                result.sourceInvoiceId(),
                result.sourceInvoiceCode(),
                result.sourceStatus(),
                result.sourceSubtotal(),
                result.sourceTotal(),
                children
        );
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public MergeInvoiceResponse merge(MergeInvoiceRequest request, String username) {
        ValidatedInvoiceMergePlan plan = invoiceMergeValidator.validate(request);
        PersistedInvoiceMergeResult result = invoiceMergePersistenceService.mergeAtomically(plan, username);
        InvoiceSummaryResponse targetInvoice = new InvoiceSummaryResponse(
                result.targetInvoiceId(),
                result.targetInvoiceCode(),
                result.orderId(),
                result.orderCode(),
                result.targetSubtotal(),
                result.targetDiscountAmount(),
                result.targetTotalAmount(),
                result.targetPaid(),
                result.targetPromotionId(),
                result.targetCreatedAt(),
                result.targetStatus(),
                result.targetMergedIntoInvoiceId(),
                // A freshly created merge target has no lineage of its own yet.
                null,
                result.targetSplitFromInvoiceId(),
                null
        );
        return new MergeInvoiceResponse(
                result.orderId(),
                result.sourceInvoiceIds(),
                targetInvoice
        );
    }

    /**
     * Emails the invoice to the customer recorded on the order. The send is synchronous so
     * the cashier is told the real outcome: success is reported only after the mail server
     * has accepted the message, and a rejection surfaces as an error rather than a
     * "sent" message. The recipient is never invented.
     */
    @Override
    @Transactional(readOnly = true)
    public SendInvoiceResponse sendInvoice(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        Order order = orderRepository.findById(invoice.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        String recipient = order.getCustomerEmail();
        if (recipient == null || recipient.isBlank()) {
            throw new ApplicationException(ApplicationError.INVOICE_CUSTOMER_EMAIL_REQUIRED);
        }
        if (!gmailService.isConfigured()) {
            throw new ApplicationException(ApplicationError.MAIL_CONFIGURATION_MISSING);
        }

        String tableName = tableRepository.findById(order.getTableId())
                .map(RestaurantTable::getName)
                .orElse(null);

        List<GmailService.InvoiceEmailLine> emailLines = resolveAllocationLines(invoice).stream()
                .map(line -> new GmailService.InvoiceEmailLine(
                        line.orderItem().getMenuItemName(),
                        line.allocation().getAllocatedQuantity(),
                        line.allocation().getUnitPriceSnapshot(),
                        line.lineTotal()))
                .toList();

        // Rejected/non-payable items never make it into an allocation line, so they have to
        // be re-derived from the order directly — mirrors the receipt's own filter.
        List<GmailService.NonPayableEmailLine> nonPayableEmailLines = order.getItems().stream()
                .filter(item -> item.getCookingStatus() == CookingStatus.REJECTED)
                .map(item -> new GmailService.NonPayableEmailLine(
                        item.getMenuItemName(), item.getQuantity(), item.getRejectionNote()))
                .toList();

        // Most recent PAID payment on this invoice, if any — used only to show the method
        // the customer actually paid with. Omitted from the email when none exists rather
        // than guessed.
        String paymentMethodLabel = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(invoice.getId())
                .stream()
                .filter(payment -> "PAID".equals(payment.getStatus()))
                .findFirst()
                .map(payment -> PAYMENT_METHOD_LABELS.getOrDefault(payment.getMethod(), null))
                .orElse(null);

        // Same person/shift the receipt shows during checkout: the user who actually
        // generated this invoice (Invoice.createdBy), and whichever shift of theirs was
        // open at that instant — resolved historically, not "whoever is logged in now".
        Optional<User> invoiceCreator = invoice.getCreatedBy() == null
                ? Optional.empty()
                : userRepository.findByUsername(invoice.getCreatedBy());
        String cashierName = invoiceCreator.map(User::getFullName).orElse(invoice.getCreatedBy());
        String shiftLabel = invoiceCreator
                .map(user -> resolveShiftLabel(user.getId(), invoice.getCreatedAt()))
                .orElse(null);

        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("guestName", order.getCustomerName());
        vars.put("customerPhone", order.getCustomerPhone());
        vars.put("invoiceId", invoice.getCode());
        vars.put("orderId", order.getCode());
        vars.put("tableName", tableName);
        vars.put("cashierName", cashierName);
        vars.put("shiftLabel", shiftLabel);
        vars.put("items", emailLines);
        vars.put("nonPayableItems", nonPayableEmailLines);
        vars.put("subtotal", invoice.getSubtotal());
        vars.put("discountAmount", invoice.getDiscountAmount());
        vars.put("totalAmount", invoice.getTotalAmount());
        vars.put("paid", invoice.isPaid());
        vars.put("paymentMethodLabel", paymentMethodLabel);
        vars.put("invoiceTime", invoice.getCreatedAt());

        boolean sent = notificationDispatcher.dispatchNow(
                recipient, "INVOICE_DELIVERY", vars, invoice.getId(), "INVOICE");
        if (!sent) {
            // The underlying cause is recorded in the notification log; the client only
            // gets a stable code so SMTP/credential details never leak to the UI.
            throw new ApplicationException(ApplicationError.MAIL_DELIVERY_FAILED);
        }

        return new SendInvoiceResponse(
                invoice.getId(),
                invoice.getOrderId(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                LocalDateTime.now(),
                "EMAIL",
                "Đã gửi hóa đơn tới " + recipient
        );
    }

    @Override public InvoiceResponse getByOrderId(String orderId) { return null; }

    // ── PM-07: invoice / payment history list ────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceListItem> listInvoices() {
        Map<String, String> tableNames = tableRepository.findAll().stream()
                .collect(Collectors.toMap(RestaurantTable::getId, RestaurantTable::getName));

        List<Invoice> invoices = invoiceRepository.findAllByOrderByCreatedAtDescIdDesc();
        Map<String, List<ResolvedAllocationLine>> linesByInvoiceId = resolveAllocationLines(invoices);

        List<InvoiceListItem> result = new ArrayList<>();
        for (Invoice inv : invoices) {
            Order order = orderRepository.findById(inv.getOrderId()).orElse(null);
            String tableName = order != null ? tableNames.get(order.getTableId()) : null;
            String note = order != null ? order.getNote() : null;
            String cashierName = (order != null && order.getCashierId() != null)
                    ? userRepository.findById(order.getCashierId()).map(User::getFullName).orElse(null)
                    : null;
            String itemsText = linesByInvoiceId.get(inv.getId()).stream()
                    .map(line -> line.orderItem().getMenuItemName())
                    .collect(Collectors.joining(", "));

            Payment latest = paymentRepository.findByInvoiceId(inv.getId()).stream()
                    .max(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(null);
            String method = latest != null ? latest.getMethod().name() : null;
            String status = latest != null ? latest.getStatus() : (inv.isPaid() ? "PAID" : "PENDING");

            result.add(new InvoiceListItem(
                    inv.getId(), inv.getCode(), inv.getCreatedAt(), tableName,
                    inv.getSubtotal(), inv.getDiscountAmount(), inv.getTotalAmount(),
                    inv.isPaid(), method, status, note, cashierName, itemsText,
                    inv.getStatus(), inv.getMergedIntoInvoiceId(), inv.getSplitFromInvoiceId()));
        }
        return result;
    }

    // ── PM-06: invoice details ───────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailItem getDetail(String invoiceId) {
        Invoice inv = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        Order order = orderRepository.findById(inv.getOrderId()).orElse(null);
        String tableName = order != null
                ? tableRepository.findById(order.getTableId()).map(RestaurantTable::getName).orElse(null)
                : null;

        List<InvoiceDetailItem.LineItem> lines = resolveAllocationLines(inv).stream()
                .map(line -> new InvoiceDetailItem.LineItem(
                        line.orderItem().getMenuItemName(),
                        line.allocation().getAllocatedQuantity(),
                        line.allocation().getUnitPriceSnapshot(),
                        line.lineTotal(),
                        line.orderItem().getId(),
                        line.orderItem().getMenuItemId()))
                .collect(Collectors.toList());

        List<InvoiceDetailItem.PaymentRecord> payments = paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(p -> new InvoiceDetailItem.PaymentRecord(
                        p.getMethod().name(), p.getAmount(), p.getStatus(), p.getCreatedAt()))
                .collect(Collectors.toList());

        return new InvoiceDetailItem(
                inv.getId(), inv.getCode(), inv.getOrderId(), inv.getCreatedAt(), tableName,
                inv.getSubtotal(), inv.getDiscountAmount(), inv.getTotalAmount(), inv.isPaid(),
                lines, payments, inv.getStatus(), inv.getMergedIntoInvoiceId(), inv.getSplitFromInvoiceId());
    }

    private List<ResolvedAllocationLine> resolveAllocationLines(Invoice invoice) {
        List<InvoiceItemAllocation> allocations = loadAllocations(invoice);
        allocations.forEach(allocation -> validateAllocation(invoice, allocation));
        Map<String, OrderItem> orderItemsById = loadOrderItemsById(
                allocations.stream()
                        .map(InvoiceItemAllocation::getOrderItemId)
                        .collect(Collectors.toCollection(LinkedHashSet::new))
        );
        return resolveAllocationLines(invoice, allocations, orderItemsById);
    }

    private Map<String, List<ResolvedAllocationLine>> resolveAllocationLines(List<Invoice> invoices) {
        if (invoices.isEmpty()) {
            return Map.of();
        }

        Set<String> invoiceIds = invoices.stream()
                .map(Invoice::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, List<InvoiceItemAllocation>> allAllocationsByInvoiceId =
                invoiceItemAllocationRepository.findAllByInvoiceIds(invoiceIds).stream()
                        .collect(Collectors.groupingBy(
                                InvoiceItemAllocation::getInvoiceId,
                                LinkedHashMap::new,
                                Collectors.toList()
                        ));

        Map<String, List<InvoiceItemAllocation>> selectedAllocationsByInvoiceId = new LinkedHashMap<>();
        Set<String> orderItemIds = new LinkedHashSet<>();
        for (Invoice invoice : invoices) {
            List<InvoiceItemAllocation> selected = selectAllocations(
                    invoice,
                    allAllocationsByInvoiceId.getOrDefault(invoice.getId(), List.of())
            );
            selected.forEach(allocation -> validateAllocation(invoice, allocation));
            selectedAllocationsByInvoiceId.put(invoice.getId(), selected);
            selected.stream().map(InvoiceItemAllocation::getOrderItemId).forEach(orderItemIds::add);
        }

        Map<String, OrderItem> orderItemsById = loadOrderItemsById(orderItemIds);
        Map<String, List<ResolvedAllocationLine>> resolvedByInvoiceId = new LinkedHashMap<>();
        for (Invoice invoice : invoices) {
            resolvedByInvoiceId.put(
                    invoice.getId(),
                    resolveAllocationLines(
                            invoice,
                            selectedAllocationsByInvoiceId.get(invoice.getId()),
                            orderItemsById
                    )
            );
        }
        return resolvedByInvoiceId;
    }

    private List<InvoiceItemAllocation> loadAllocations(Invoice invoice) {
        if (invoice.getStatus() == null) {
            throw invalidAllocationData();
        }

        return switch (invoice.getStatus()) {
            case ACTIVE -> invoiceItemAllocationRepository
                    .findAllByInvoiceIdAndActiveTrueOrderByCreatedAtAscIdAsc(invoice.getId());
            case MERGED, SPLIT -> invoiceItemAllocationRepository
                    .findAllByInvoiceIdOrderByCreatedAtAscIdAsc(invoice.getId());
        };
    }

    private List<InvoiceItemAllocation> selectAllocations(
            Invoice invoice,
            List<InvoiceItemAllocation> allAllocations
    ) {
        if (invoice.getStatus() == null) {
            throw invalidAllocationData();
        }

        return switch (invoice.getStatus()) {
            case ACTIVE -> allAllocations.stream()
                    .filter(InvoiceItemAllocation::isActive)
                    .collect(Collectors.toList());
            case MERGED, SPLIT -> allAllocations;
        };
    }

    private Map<String, OrderItem> loadOrderItemsById(Collection<String> orderItemIds) {
        if (orderItemIds.isEmpty()) {
            return Map.of();
        }

        return orderItemRepository.findAllById(orderItemIds).stream()
                .collect(Collectors.toMap(OrderItem::getId, Function.identity()));
    }

    private List<ResolvedAllocationLine> resolveAllocationLines(
            Invoice invoice,
            List<InvoiceItemAllocation> allocations,
            Map<String, OrderItem> orderItemsById
    ) {
        if (invoice.getId() == null
                || invoice.getOrderId() == null
                || allocations == null
                || allocations.isEmpty()) {
            throw invalidAllocationData();
        }

        List<ResolvedAllocationLine> resolvedLines = new ArrayList<>();
        BigDecimal allocationSubtotal = BigDecimal.ZERO;
        for (InvoiceItemAllocation allocation : allocations) {
            validateAllocation(invoice, allocation);

            OrderItem orderItem = orderItemsById.get(allocation.getOrderItemId());
            if (orderItem == null
                    || orderItem.getOrder() == null
                    || !invoice.getOrderId().equals(orderItem.getOrder().getId())) {
                throw invalidAllocationData();
            }

            BigDecimal lineTotal = allocation.getUnitPriceSnapshot()
                    .multiply(BigDecimal.valueOf(allocation.getAllocatedQuantity()));
            allocationSubtotal = allocationSubtotal.add(lineTotal);
            resolvedLines.add(new ResolvedAllocationLine(allocation, orderItem, lineTotal));
        }

        if (invoice.getSubtotal() == null || allocationSubtotal.compareTo(invoice.getSubtotal()) != 0) {
            throw invalidAllocationData();
        }

        return resolvedLines;
    }

    private void validateAllocation(Invoice invoice, InvoiceItemAllocation allocation) {
        if (allocation == null
                || allocation.getInvoiceId() == null
                || !invoice.getId().equals(allocation.getInvoiceId())
                || allocation.getOrderItemId() == null
                || allocation.getOrderItemId().isBlank()
                || allocation.getAllocatedQuantity() <= 0
                || allocation.getUnitPriceSnapshot() == null
                || allocation.getUnitPriceSnapshot().compareTo(BigDecimal.ZERO) <= 0) {
            throw invalidAllocationData();
        }
    }

    private Map<String, String> menuItemCodesById(List<ResolvedAllocationLine> lines) {
        List<String> menuItemIds = lines.stream()
                .map(line -> line.orderItem().getMenuItemId())
                .distinct()
                .toList();
        if (menuItemIds.isEmpty()) return Map.of();
        // MenuItem.code is optional (manager-assigned SKU-style code, not every item has one) —
        // Collectors.toMap rejects null values, so items without a code are simply left out; a
        // missing map entry and a present-but-null value both read back as null via Map.get.
        return menuItemRepository.findAllById(menuItemIds).stream()
                .filter(item -> item.getCode() != null)
                .collect(Collectors.toMap(MenuItem::getId, MenuItem::getCode));
    }

    private InvoiceItemResponse toInvoiceItemResponse(ResolvedAllocationLine line, Map<String, String> menuItemCodesById) {
        return new InvoiceItemResponse(
                line.orderItem().getMenuItemId(),
                menuItemCodesById.get(line.orderItem().getMenuItemId()),
                line.orderItem().getMenuItemName(),
                line.allocation().getAllocatedQuantity(),
                line.allocation().getUnitPriceSnapshot(),
                line.lineTotal(),
                line.orderItem().getNote(),
                line.orderItem().getId(),
                line.allocation().getId()
        );
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }

    private record ResolvedAllocationLine(
            InvoiceItemAllocation allocation,
            OrderItem orderItem,
            BigDecimal lineTotal
    ) {}

    private BigDecimal calculateSubtotal(List<OrderItem> orderItems) {
        return orderItems.stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateOrderCanBeInvoiced(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.CLOSED) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_INVOICEABLE);
        }
    }

    private void validateNoActiveAllocationConflict(Order order, List<OrderItem> payableItems) {
        if (payableItems.isEmpty()) {
            return;
        }

        List<String> orderItemIds = new ArrayList<>();
        for (OrderItem item : payableItems) {
            validateOrderItemIdentity(order, item);
            orderItemIds.add(item.getId());
        }

        if (!invoiceItemAllocationRepository.findActiveByOrderItemIdsForUpdate(orderItemIds).isEmpty()) {
            throw invalidAllocationData();
        }
    }

    private List<OrderItem> validateOrderItemsForInvoice(Order order, List<OrderItem> orderItems) {
        if (orderItems.isEmpty()) {
            throw new ApplicationException(
                    ApplicationError.INVALID_INVOICE_ITEMS,
                    "Order must contain at least one item before invoice generation"
            );
        }

        for (OrderItem item : orderItems) {
            validateOrderItemIdentity(order, item);

            if (item.getCookingStatus() == null) {
                throw new ApplicationException(ApplicationError.INVALID_INVOICE_ITEMS);
            }
        }

        List<OrderItem> payableItems = new ArrayList<>();
        for (OrderItem item : orderItems) {
            if (item.getCookingStatus() == CookingStatus.PENDING || item.getCookingStatus() == CookingStatus.COOKING) {
                throw new ApplicationException(ApplicationError.ORDER_NOT_READY_FOR_INVOICE);
            }

            if (isPayableItem(item)) {
                payableItems.add(item);
            }
        }

        if (payableItems.isEmpty()) {
            throw new ApplicationException(
                    ApplicationError.INVALID_INVOICE_ITEMS,
                    "Order does not contain any payable items"
            );
        }

        payableItems.forEach(this::validateInvoiceItem);

        return payableItems;
    }

    private void validateOrderItemIdentity(Order order, OrderItem item) {
        if (item == null
                || item.getId() == null
                || item.getId().isBlank()
                || item.getOrder() == null
                || !order.getId().equals(item.getOrder().getId())) {
            throw invalidAllocationData();
        }
    }

    private void validateInvoiceItem(OrderItem item) {
        if (item.getQuantity() <= 0
                || item.getUnitPrice() == null
                || item.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0
                || !isPayableItem(item)) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_ITEMS);
        }
    }

    private boolean isPayableItem(OrderItem item) {
        return item.getCookingStatus() == CookingStatus.READY
                || item.getCookingStatus() == CookingStatus.SERVED;
    }

    private static final DateTimeFormatter SHIFT_LABEL_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Formats the shift open for {@code cashierUserId} at {@code at}, the same "HH:mm - HH:mm"
     * / "Đang mở từ HH:mm" shape the cashier UI uses for the live shift — but resolved
     * historically, since by the time this runs the shift may already be closed or merged.
     * Returns null when no shift covers that instant (e.g. legacy data predating shift tracking).
     */
    private String resolveShiftLabel(String cashierUserId, LocalDateTime at) {
        if (cashierUserId == null || at == null) return null;
        return shiftRepository.findActiveForCashierAt(cashierUserId, at).stream()
                .findFirst()
                .map(shift -> shift.getClosedAt() == null
                        ? "Đang mở từ " + shift.getOpenedAt().format(SHIFT_LABEL_TIME_FORMATTER)
                        : shift.getOpenedAt().format(SHIFT_LABEL_TIME_FORMATTER) + " - "
                                + shift.getClosedAt().format(SHIFT_LABEL_TIME_FORMATTER))
                .orElse(null);
    }

    private void validateInvoiceSubtotal(BigDecimal subtotal) {
        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
        }
    }

    private void validateInvoiceTotal(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
        }
    }

    private void validateInvoiceCanApplyDiscount(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_PAYABLE);
        }

        if (invoice.isPaid() || hasPaidPayment(invoice.getId())) {
            throw new ApplicationException(ApplicationError.INVOICE_ALREADY_PAID);
        }

        validateInvoiceSubtotal(invoice.getSubtotal());
    }

    private boolean hasPaidPayment(String invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId).stream()
                .anyMatch(payment -> PAYMENT_STATUS_PAID.equals(payment.getStatus()));
    }

    private void validateInvoiceHasNoOrphanDiscount(Invoice invoice) {
        if ((invoice.getPromotionId() == null || invoice.getPromotionId().isBlank())
                && invoice.getDiscountAmount() != null
                && invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new ApplicationException(ApplicationError.INVOICE_ALREADY_DISCOUNTED);
        }
    }

    private void validateExistingPromotionForApply(Invoice invoice, Promotion promotion) {
        if (invoice.getPromotionId() == null || invoice.getPromotionId().isBlank()) {
            return;
        }

        if (invoice.getPromotionId().equals(promotion.getId())) {
            throw new ApplicationException(ApplicationError.INVOICE_PROMOTION_ALREADY_APPLIED);
        }

        throw new ApplicationException(ApplicationError.PROMOTION_CHANGE_NOT_ALLOWED);
    }

    private void validateOrderCanApplyDiscount(Order order) {
        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_DISCOUNTABLE);
        }
    }

    private Promotion findActivePromotionForUpdate(String promotionCode) {
        return promotionRepository.findActiveByCodeForUpdate(normalizeCode(promotionCode))
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PROMOTION_NOT_FOUND));
    }

    private void validatePromotionUsage(Promotion promotion) {
        if (promotion.getUsageLimit() != null
                && promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new ApplicationException(ApplicationError.PROMOTION_USAGE_LIMIT_REACHED);
        }
    }

    private BigDecimal calculateDiscount(Promotion promotion, BigDecimal subtotal) {
        BigDecimal discountAmount = promotion.getDiscountPercent() != null
                ? subtotal.multiply(promotion.getDiscountPercent()).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP)
                : promotion.getDiscountAmount();

        if (discountAmount.compareTo(subtotal) > 0) {
            discountAmount = subtotal;
        }

        return discountAmount;
    }

    private void incrementUsedCount(Promotion promotion) {
        promotion.setUsedCount(promotion.getUsedCount() + 1);
        promotionRepository.save(promotion);
    }

    private void validatePromotionDate(Promotion promotion) {
        LocalDate today = LocalDate.now();
        if ((promotion.getValidFrom() != null && today.isBefore(promotion.getValidFrom()))
                || (promotion.getValidTo() != null && today.isAfter(promotion.getValidTo()))) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION, "Promotion is not valid");
        }
    }

    private String normalizeCode(String promotionCode) {
        return promotionCode.trim().toUpperCase();
    }

    /**
     * The "Mã đơn hàng" filter accepts either the raw order UUID (existing behavior, used
     * programmatically e.g. from the Cashier screen) or a persisted business code typed by
     * hand ("DH000123"). A code is resolved to its UUID before the existing exact-match
     * repository queries run; an unknown code intentionally resolves to a value that
     * matches nothing rather than throwing, consistent with "no results" for a search.
     */
    private String resolveOrderIdFilter(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return orderId;
        }
        String trimmed = orderId.trim();
        if (!ORDER_CODE_PATTERN.matcher(trimmed).matches()) {
            return trimmed;
        }
        // An unknown code intentionally resolves to a sentinel that cannot match any real
        // order id, so the result is "no invoices" rather than "every invoice".
        return orderRepository.findByCode(trimmed.toUpperCase())
                .map(Order::getId)
                .orElse("00000000-0000-0000-0000-000000000000");
    }

    private record LockedDiscountContext(Order order, Invoice invoice) {}

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Invoice", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
