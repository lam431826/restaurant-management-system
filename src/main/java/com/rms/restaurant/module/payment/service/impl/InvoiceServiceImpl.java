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
