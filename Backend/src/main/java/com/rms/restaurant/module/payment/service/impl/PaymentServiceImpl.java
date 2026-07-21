package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.cashbook.dto.SystemVoucherRequest;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.dto.QrInitiateRequest;
import com.rms.restaurant.module.payment.mapper.PaymentMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.service.PaymentService;
import com.rms.restaurant.module.payment.service.internal.MockQrPaymentGateway;
import com.rms.restaurant.module.user.service.AuditService;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final String STATUS_PAID      = "PAID";
    private static final String STATUS_PENDING   = "PENDING";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String SHIFT_OPEN  = "OPEN";
    // BR-PM-02: a simulated QR payment window; informational only, not enforced.
    private static final long QR_EXPIRY_MINUTES = 15;

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentMapper paymentMapper;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final MockQrPaymentGateway qrGateway;
    private final CashbookService cashbookService;

    // ── BR-PM-01: CASH — immediate payment ─────────────────────────────────────

    @Override
    public PaymentResponse process(ProcessPaymentRequest request, String cashierUsername) {
        if (request.method() != PaymentMethod.CASH) {
            throw new ApplicationException(
                    ApplicationError.PAYMENT_METHOD_NOT_SUPPORTED,
                    request.method() == PaymentMethod.QR
                            ? "Use /api/payments/qr/initiate for QR payments"
                            : "Only CASH and QR payment methods are supported"
            );
        }

        CashierShiftContext cashierShift = requireCashierWithOpenShift(cashierUsername);

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

        BigDecimal receivedAmount = request.receivedAmount();
        if (receivedAmount == null || receivedAmount.compareTo(invoice.getTotalAmount()) < 0) {
            throw new ApplicationException(ApplicationError.PAYMENT_RECEIVED_AMOUNT_INVALID);
        }
        BigDecimal changeAmount = receivedAmount.subtract(invoice.getTotalAmount());

        Payment payment = Payment.builder()
                .invoiceId(invoice.getId())
                .method(PaymentMethod.CASH)
                .amount(invoice.getTotalAmount())
                .status(STATUS_PAID)
                .receivedAmount(receivedAmount)
                .changeAmount(changeAmount)
                .paidAt(LocalDateTime.now())
                .shiftId(cashierShift.shift().getId())     // BR-CS-08
                .cashierId(cashierShift.cashier().getId()) // BR-CS-08
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        invoice.setPaid(true);
        invoiceRepository.save(invoice);
        createReceiptVoucher(order, savedPayment, cashierUsername);

        audit("PAYMENT_PROCESS", savedPayment.getId(),
                "{\"invoiceId\":\"" + esc(invoice.getId()) + "\",\"amount\":" + savedPayment.getAmount()
                        + ",\"method\":\"" + esc(String.valueOf(savedPayment.getMethod())) + "\"}");

        return paymentMapper.toResponse(savedPayment);
    }

    // ── BR-PM-02: QR — simulated external payment gateway ───────────────────────

    @Override
    public PaymentResponse initiateQrPayment(QrInitiateRequest request, String cashierUsername) {
        CashierShiftContext cashierShift = requireCashierWithOpenShift(cashierUsername);

        LockedPaymentContext lockContext = lockOrderAndInvoice(request.invoiceId());
        Order order = lockContext.order();
        Invoice invoice = lockContext.invoice();

        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_PAYABLE);
        }
        if (invoice.isPaid() || hasPaidPayment(invoice.getId())) {
            throw new ApplicationException(
                    ApplicationError.INVOICE_ALREADY_PAID,
                    "Invoice has already been paid"
            );
        }
        validateOrderCanBePaid(order);
        validateInvoiceTotalBeforePayment(invoice);

        // Idempotent: reuse an already-open PENDING QR transaction for this invoice
        // instead of creating unlimited duplicates.
        Payment existingPending = paymentRepository
                .findFirstByInvoiceIdAndMethodAndStatus(invoice.getId(), PaymentMethod.QR, STATUS_PENDING)
                .orElse(null);
        if (existingPending != null) {
            return paymentMapper.toResponse(existingPending);
        }

        String transactionRef = qrGateway.generateTransactionReference();
        Payment payment = Payment.builder()
                .invoiceId(invoice.getId())
                .method(PaymentMethod.QR)
                .amount(invoice.getTotalAmount())
                .status(STATUS_PENDING)
                .gatewayRef(transactionRef)
                .expiresAt(LocalDateTime.now().plusMinutes(QR_EXPIRY_MINUTES))
                .shiftId(cashierShift.shift().getId())     // BR-CS-08
                .cashierId(cashierShift.cashier().getId()) // BR-CS-08
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        audit("PAYMENT_QR_INITIATE", savedPayment.getId(),
                "{\"invoiceId\":\"" + esc(invoice.getId()) + "\",\"amount\":" + savedPayment.getAmount()
                        + ",\"transactionRef\":\"" + esc(transactionRef) + "\"}");

        return paymentMapper.toResponse(savedPayment);
    }

    @Override
    public PaymentResponse simulateQrSuccess(String paymentId, String cashierUsername) {
        requireCashierWithOpenShift(cashierUsername);

        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND));

        if (payment.getMethod() != PaymentMethod.QR) {
            throw new ApplicationException(
                    ApplicationError.PAYMENT_METHOD_MISMATCH,
                    "Only QR payments can be confirmed through the simulated gateway callback"
            );
        }
        if (!STATUS_PENDING.equals(payment.getStatus())) {
            throw new ApplicationException(
                    ApplicationError.PAYMENT_NOT_PENDING,
                    "QR payment is not pending and cannot be confirmed"
            );
        }

        LockedPaymentContext lockContext = lockOrderAndInvoice(payment.getInvoiceId());
        Order order = lockContext.order();
        Invoice invoice = lockContext.invoice();

        if (invoice.getStatus() != InvoiceStatus.ACTIVE) {
            throw new ApplicationException(ApplicationError.INVOICE_NOT_PAYABLE);
        }
        if (invoice.isPaid() || hasPaidPayment(invoice.getId())) {
            throw new ApplicationException(
                    ApplicationError.INVOICE_ALREADY_PAID,
                    "Invoice has already been paid"
            );
        }
        validateOrderCanBePaid(order);

        payment.setStatus(STATUS_PAID);
        payment.setPaidAt(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);
        invoice.setPaid(true);
        invoiceRepository.save(invoice);
        createReceiptVoucher(order, savedPayment, cashierUsername);

        audit("PAYMENT_QR_CONFIRM", savedPayment.getId(),
                "{\"invoiceId\":\"" + esc(invoice.getId()) + "\",\"amount\":" + savedPayment.getAmount()
                        + ",\"transactionRef\":\"" + esc(savedPayment.getGatewayRef()) + "\"}");

        return paymentMapper.toResponse(savedPayment);
    }

    @Override
    public PaymentResponse cancelQrPayment(String paymentId, String cashierUsername) {
        requireCashierWithOpenShift(cashierUsername);

        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND));

        if (payment.getMethod() != PaymentMethod.QR) {
            throw new ApplicationException(
                    ApplicationError.PAYMENT_METHOD_MISMATCH,
                    "Only QR payments can be cancelled through this action"
            );
        }
        if (!STATUS_PENDING.equals(payment.getStatus())) {
            throw new ApplicationException(
                    ApplicationError.PAYMENT_NOT_PENDING,
                    "QR payment is not pending and cannot be cancelled"
            );
        }

        payment.setStatus(STATUS_CANCELLED);
        Payment savedPayment = paymentRepository.save(payment);

        audit("PAYMENT_QR_CANCEL", savedPayment.getId(),
                "{\"invoiceId\":\"" + esc(savedPayment.getInvoiceId()) + "\"}");

        return paymentMapper.toResponse(savedPayment);
    }

    /** Auto-generates a Cash Book (Sổ quỹ) RECEIPT voucher against the SALES_RECEIPT system
     * category whenever an invoice gets paid — no dedicated customer table exists (V36 adds
     * customer_name directly on orders), so the partner is CUSTOMER with free-text name only. */
    private void createReceiptVoucher(Order order, Payment payment, String username) {
        String partnerName = (order.getCustomerName() == null || order.getCustomerName().isBlank())
                ? "Khách lẻ" : order.getCustomerName();
        cashbookService.createSystemVoucher(new SystemVoucherRequest(
                CashFlowType.RECEIPT, "SALES_RECEIPT", payment.getPaidAt(),
                payment.getMethod() == PaymentMethod.QR ? CashFlowMethod.BANK : CashFlowMethod.CASH,
                CashbookPartnerGroup.CUSTOMER, null, partnerName,
                payment.getAmount(), null, true,
                CashbookSourceType.INVOICE_PAYMENT, payment.getInvoiceId(), username));
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private CashierShiftContext requireCashierWithOpenShift(String cashierUsername) {
        // BR-CS-08: a payment action must be attributed to the processing cashier's
        // OPEN shift; if they have none, the action is blocked.
        User cashier = userRepository.findByUsername(cashierUsername)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND));
        Shift shift = shiftRepository.findByCashierIdAndStatus(cashier.getId(), SHIFT_OPEN)
                .orElseThrow(() -> new ApplicationException(ApplicationError.PAYMENT_NO_OPEN_SHIFT));
        return new CashierShiftContext(cashier, shift);
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

    private record CashierShiftContext(User cashier, Shift shift) {}

    private void audit(String action, String id, String detail) {
        try { auditService.log(action, "Payment", id, detail); }
        catch (Exception e) { log.warn("Audit log failed: {}", e.getMessage()); }
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
