package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ConflictException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.*;
import com.rms.restaurant.module.payment.mapper.InvoiceMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.payment.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PromotionRepository promotionRepository;
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
        String orderId = request.orderId();

        orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        invoiceRepository.findByOrderId(orderId)
                .ifPresent(existing -> {
                    throw new ConflictException(ApplicationError.INVOICE_ALREADY_EXISTS);
                });

        BigDecimal subtotal = calculateSubtotal(orderItemRepository.findByOrderId(orderId));
        Promotion promotion = null;
        BigDecimal discountAmount = BigDecimal.ZERO;

        if (request.promotionCode() != null && !request.promotionCode().isBlank()) {
            promotion = findActivePromotionForUpdate(request.promotionCode());
            validatePromotionDate(promotion);
            validatePromotionUsage(promotion);
            discountAmount = calculateDiscount(promotion, subtotal);
        }

        BigDecimal totalAmount = subtotal.subtract(discountAmount);

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
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        if (invoice.isPaid()) {
            throw new ApplicationException(ApplicationError.INVOICE_ALREADY_PAID);
        }

        Promotion promotion = findActivePromotionForUpdate(request.promotionCode());
        boolean samePromotion = promotion.getId().equals(invoice.getPromotionId());

        if (invoice.getPromotionId() != null && !samePromotion) {
            throw new ApplicationException(ApplicationError.PROMOTION_CHANGE_NOT_ALLOWED);
        }

        validatePromotionDate(promotion);
        if (!samePromotion) {
            validatePromotionUsage(promotion);
        }

        BigDecimal discountAmount = calculateDiscount(promotion, invoice.getSubtotal());
        BigDecimal totalAmount = invoice.getSubtotal().subtract(discountAmount);

        invoice.setPromotionId(promotion.getId());
        invoice.setDiscountAmount(discountAmount);
        invoice.setTotalAmount(totalAmount);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        if (!samePromotion) {
            incrementUsedCount(promotion);
        }

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

    private BigDecimal calculateSubtotal(List<OrderItem> orderItems) {
        return orderItems.stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
