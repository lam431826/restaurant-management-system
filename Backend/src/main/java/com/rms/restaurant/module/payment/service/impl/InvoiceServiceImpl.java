package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.*;
import com.rms.restaurant.module.payment.mapper.InvoiceMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.payment.service.InvoiceService;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final String PAYMENT_STATUS_PAID = "PAID";

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PromotionRepository promotionRepository;
    private final PaymentRepository paymentRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final InvoiceMapper invoiceMapper;

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId) {
        boolean hasOrderId = orderId != null && !orderId.isBlank();
        List<Invoice> invoices;

        if (hasOrderId && paid != null) {
            invoices = invoiceRepository.findByOrderIdAndPaidOrderByCreatedAtDesc(orderId.trim(), paid);
        } else if (hasOrderId) {
            invoices = invoiceRepository.findByOrderIdOrderByCreatedAtDesc(orderId.trim());
        } else if (paid != null) {
            invoices = invoiceRepository.findByPaidOrderByCreatedAtDesc(paid);
        } else {
            invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
        }

        List<InvoiceSummaryResponse> responses = new ArrayList<>();
        for (Invoice invoice : invoices) {
            responses.add(invoiceMapper.toSummaryResponse(invoice));
        }
        return responses;
    }

    @Override
    public InvoiceResponse generate(GenerateInvoiceRequest request) {
        String orderId = request.orderId().trim();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        invoiceRepository.findByOrderId(orderId)
                .ifPresent(existing -> {
                    throw new ConflictException(ApplicationError.INVOICE_ALREADY_EXISTS);
                });

        validateOrderCanBeInvoiced(order);
        List<OrderItem> payableItems = validateOrderItemsForInvoice(orderItemRepository.findByOrderId(orderId));
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
                .orderId(orderId)
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .promotionId(promotion == null ? null : promotion.getId())
                .paid(false)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);
        if (promotion != null) {
            incrementUsedCount(promotion);
        }

        return invoiceMapper.toResponse(savedInvoice);
    }

    @Override
    public InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        validateInvoiceCanApplyDiscount(invoice);

        Order order = orderRepository.findById(invoice.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
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

        return invoiceMapper.toResponse(savedInvoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailResponse getById(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        List<OrderItem> orderItems = orderItemRepository.findByOrderId(invoice.getOrderId());
        List<InvoiceItemResponse> items = new ArrayList<>();

        for (OrderItem orderItem : orderItems) {
            if (!isPayableItem(orderItem)) {
                continue;
            }

            BigDecimal lineTotal = orderItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(orderItem.getQuantity()));

            items.add(new InvoiceItemResponse(
                    orderItem.getMenuItemId(),
                    orderItem.getMenuItemName(),
                    orderItem.getQuantity(),
                    orderItem.getUnitPrice(),
                    lineTotal,
                    orderItem.getNote()
            ));
        }

        String promotionCode = null;
        if (invoice.getPromotionId() != null) {
            promotionCode = promotionRepository.findById(invoice.getPromotionId())
                    .map(Promotion::getCode)
                    .orElse(null);
        }

        return new InvoiceDetailResponse(
                invoice.getId(),
                invoice.getOrderId(),
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                invoice.getCreatedAt(),
                invoice.getPromotionId(),
                promotionCode,
                items
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SendInvoiceResponse sendInvoice(String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        return new SendInvoiceResponse(
                invoice.getId(),
                invoice.getOrderId(),
                invoice.getTotalAmount(),
                invoice.isPaid(),
                LocalDateTime.now(),
                "SIMULATED",
                "Invoice sent successfully (simulated)"
        );
    }

    @Override public InvoiceResponse getByOrderId(String orderId) { return null; }
    @Override public InvoiceResponse[] split(SplitBillRequest request) { return null; }
    @Override public InvoiceResponse merge(MergeBillRequest request) { return null; }

    // ── PM-07: invoice / payment history list ────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceListItem> listInvoices() {
        Map<String, String> tableNames = tableRepository.findAll().stream()
                .collect(Collectors.toMap(RestaurantTable::getId, RestaurantTable::getName));

        List<Invoice> invoices = new ArrayList<>(invoiceRepository.findAll());
        invoices.sort((a, b) -> {
            LocalDateTime x = a.getCreatedAt(), y = b.getCreatedAt();
            if (x == null && y == null) return 0;
            if (x == null) return 1;
            if (y == null) return -1;
            return y.compareTo(x); // newest first
        });

        List<InvoiceListItem> result = new ArrayList<>();
        for (Invoice inv : invoices) {
            Order order = orderRepository.findById(inv.getOrderId()).orElse(null);
            String tableName = order != null ? tableNames.get(order.getTableId()) : null;
            String note = order != null ? order.getNote() : null;
            String cashierName = (order != null && order.getCashierId() != null)
                    ? userRepository.findById(order.getCashierId()).map(User::getFullName).orElse(null)
                    : null;
            String itemsText = order != null
                    ? orderItemRepository.findByOrderId(order.getId()).stream()
                        .map(OrderItem::getMenuItemName)
                        .collect(Collectors.joining(", "))
                    : "";

            Payment latest = paymentRepository.findByInvoiceId(inv.getId()).stream()
                    .max(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(null);
            String method = latest != null ? latest.getMethod().name() : null;
            String status = latest != null ? latest.getStatus() : (inv.isPaid() ? "PAID" : "PENDING");

            result.add(new InvoiceListItem(
                    inv.getId(), inv.getCreatedAt(), tableName,
                    inv.getSubtotal(), inv.getDiscountAmount(), inv.getTotalAmount(),
                    inv.isPaid(), method, status, note, cashierName, itemsText));
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

        List<InvoiceDetailItem.LineItem> lines = orderItemRepository.findByOrderId(inv.getOrderId()).stream()
                .filter(this::isPayableItem)
                .map(oi -> new InvoiceDetailItem.LineItem(
                        oi.getMenuItemName(),
                        oi.getQuantity(),
                        oi.getUnitPrice(),
                        oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()))))
                .collect(Collectors.toList());

        List<InvoiceDetailItem.PaymentRecord> payments = paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(p -> new InvoiceDetailItem.PaymentRecord(
                        p.getMethod().name(), p.getAmount(), p.getStatus(), p.getCreatedAt()))
                .collect(Collectors.toList());

        return new InvoiceDetailItem(
                inv.getId(), inv.getOrderId(), inv.getCreatedAt(), tableName,
                inv.getSubtotal(), inv.getDiscountAmount(), inv.getTotalAmount(), inv.isPaid(),
                lines, payments);
    }

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

    private List<OrderItem> validateOrderItemsForInvoice(List<OrderItem> orderItems) {
        if (orderItems.isEmpty()) {
            throw new ApplicationException(
                    ApplicationError.INVALID_INVOICE_ITEMS,
                    "Order must contain at least one item before invoice generation"
            );
        }

        List<OrderItem> payableItems = new ArrayList<>();
        for (OrderItem item : orderItems) {
            validateInvoiceItem(item);

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

        return payableItems;
    }

    private void validateInvoiceItem(OrderItem item) {
        if (item.getQuantity() <= 0
                || item.getUnitPrice() == null
                || item.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0
                || item.getCookingStatus() == null) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_ITEMS);
        }
    }

    private boolean isPayableItem(OrderItem item) {
        return item.getCookingStatus() == CookingStatus.READY
                || item.getCookingStatus() == CookingStatus.SERVED;
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
}
