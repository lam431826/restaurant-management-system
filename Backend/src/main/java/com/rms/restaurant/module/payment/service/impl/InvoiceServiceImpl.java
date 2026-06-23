package com.rms.restaurant.module.payment.service.impl;

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

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PromotionRepository promotionRepository;
    private final PaymentRepository paymentRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final InvoiceMapper invoiceMapper;

    @Override
    public InvoiceResponse generate(GenerateInvoiceRequest request) {
        String orderId = request.orderId();

        orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        invoiceRepository.findByOrderId(orderId)
                .ifPresent(existing -> {
                    throw new ConflictException(ApplicationError.INVOICE_ALREADY_EXISTS);
                });

        BigDecimal subtotal = calculateSubtotal(orderItemRepository.findByOrderId(orderId));
        PromotionDiscount promotionDiscount = resolvePromotionDiscount(request.promotionCode(), subtotal);
        BigDecimal totalAmount = subtotal.subtract(promotionDiscount.discountAmount());

        Invoice invoice = Invoice.builder()
                .orderId(orderId)
                .subtotal(subtotal)
                .discountAmount(promotionDiscount.discountAmount())
                .totalAmount(totalAmount)
                .promotionId(promotionDiscount.promotionId())
                .paid(false)
                .build();

        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        PromotionDiscount promotionDiscount = resolvePromotionDiscount(request.promotionCode(), invoice.getSubtotal());
        BigDecimal totalAmount = invoice.getSubtotal().subtract(promotionDiscount.discountAmount());

        invoice.setPromotionId(promotionDiscount.promotionId());
        invoice.setDiscountAmount(promotionDiscount.discountAmount());
        invoice.setTotalAmount(totalAmount);

        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
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
    public InvoiceDetailResponse getDetail(String invoiceId) {
        Invoice inv = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        Order order = orderRepository.findById(inv.getOrderId()).orElse(null);
        String tableName = order != null
                ? tableRepository.findById(order.getTableId()).map(RestaurantTable::getName).orElse(null)
                : null;

        List<InvoiceDetailResponse.LineItem> lines = orderItemRepository.findByOrderId(inv.getOrderId()).stream()
                .map(oi -> new InvoiceDetailResponse.LineItem(
                        oi.getMenuItemName(),
                        oi.getQuantity(),
                        oi.getUnitPrice(),
                        oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()))))
                .collect(Collectors.toList());

        List<InvoiceDetailResponse.PaymentRecord> payments = paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(p -> new InvoiceDetailResponse.PaymentRecord(
                        p.getMethod().name(), p.getAmount(), p.getStatus(), p.getCreatedAt()))
                .collect(Collectors.toList());

        return new InvoiceDetailResponse(
                inv.getId(), inv.getOrderId(), inv.getCreatedAt(), tableName,
                inv.getSubtotal(), inv.getDiscountAmount(), inv.getTotalAmount(), inv.isPaid(),
                lines, payments);
    }

    private BigDecimal calculateSubtotal(List<OrderItem> orderItems) {
        return orderItems.stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private PromotionDiscount resolvePromotionDiscount(String promotionCode, BigDecimal subtotal) {
        if (promotionCode == null || promotionCode.isBlank()) {
            return new PromotionDiscount(BigDecimal.ZERO, null);
        }

        Promotion promotion = promotionRepository.findByCodeAndActiveTrue(normalizeCode(promotionCode))
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PROMOTION_NOT_FOUND));

        validatePromotionDate(promotion);

        BigDecimal discountAmount = promotion.getDiscountPercent() != null
                ? subtotal.multiply(promotion.getDiscountPercent()).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP)
                : promotion.getDiscountAmount();

        if (discountAmount.compareTo(subtotal) > 0) {
            discountAmount = subtotal;
        }

        return new PromotionDiscount(discountAmount, promotion.getId());
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

    private record PromotionDiscount(BigDecimal discountAmount, String promotionId) {}
}
