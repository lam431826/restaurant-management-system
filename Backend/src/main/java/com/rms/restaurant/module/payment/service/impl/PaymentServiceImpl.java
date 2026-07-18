package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.mapper.PaymentMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final String STATUS_PAID = "PAID";

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentMapper paymentMapper;

    @Override
    public PaymentResponse process(ProcessPaymentRequest request) {
        LockedPaymentContext lockContext = lockOrderAndInvoice(request.invoiceId());
        Order order = lockContext.order();
        Invoice invoice = lockContext.invoice();

        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_PAYABLE);
        }

        if (invoice.isPaid()) {
            throw new ApplicationException(
                    ApplicationError.INVOICE_ALREADY_PAID,
                    "Invoice has already been paid"
            );
        }

        if (hasPaidPayment(invoice.getId())) {
            throw new ApplicationException(
                    ApplicationError.INVOICE_ALREADY_PAID,
                    "A paid payment already exists for this invoice"
            );
        }

        validateOrderCanBePaid(order);
        validateInvoiceTotalBeforePayment(invoice);

        Payment payment = Payment.builder()
                .invoiceId(invoice.getId())
                .method(request.method())
                .amount(invoice.getTotalAmount())
                .status(STATUS_PAID)
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        invoice.setPaid(true);
        invoiceRepository.save(invoice);

        return paymentMapper.toResponse(savedPayment);
    }

    private LockedPaymentContext lockOrderAndInvoice(String invoiceId) {
        String projectedOrderId = invoiceRepository.findOrderIdById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        if (projectedOrderId.isBlank()) {
            throw new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
        }

        Order order = orderRepository.findByIdForUpdate(projectedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));
        validateLockedOwnership(invoiceId, projectedOrderId, order, invoice);
        return new LockedPaymentContext(order, invoice);
    }

    private void validateLockedOwnership(
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
            throw new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getHistory(String invoiceId) {
        List<Payment> payments;

        if (invoiceId == null || invoiceId.isBlank()) {
            payments = paymentRepository.findAllByOrderByCreatedAtDesc();
        } else {
            String normalizedInvoiceId = invoiceId.trim();
            if (!invoiceRepository.existsById(normalizedInvoiceId)) {
                throw new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND);
            }
            payments = paymentRepository.findByInvoiceIdOrderByCreatedAtDesc(normalizedInvoiceId);
        }

        List<PaymentResponse> responses = new ArrayList<>();
        for (Payment payment : payments) {
            responses.add(paymentMapper.toResponse(payment));
        }
        return responses;
    }

    @Override public void handleWebhook(PaymentWebhookPayload payload, String signature) {}

    private boolean hasPaidPayment(String invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId).stream()
                .anyMatch(payment -> STATUS_PAID.equals(payment.getStatus()));
    }

    private void validateOrderCanBePaid(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.CLOSED) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_PAYABLE);
        }
    }

    private void validateInvoiceTotalBeforePayment(Invoice invoice) {
        BigDecimal subtotal = invoice.getSubtotal();
        BigDecimal discountAmount = invoice.getDiscountAmount() == null
                ? BigDecimal.ZERO
                : invoice.getDiscountAmount();
        BigDecimal totalAmount = invoice.getTotalAmount();

        if (subtotal == null
                || subtotal.compareTo(BigDecimal.ZERO) <= 0
                || discountAmount.compareTo(BigDecimal.ZERO) < 0
                || totalAmount == null
                || totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
        }

        BigDecimal expectedTotal = subtotal.subtract(discountAmount);
        if (expectedTotal.compareTo(totalAmount) != 0) {
            throw new ApplicationException(ApplicationError.INVALID_INVOICE_TOTAL);
        }
    }

    private record LockedPaymentContext(Order order, Invoice invoice) {}
}
