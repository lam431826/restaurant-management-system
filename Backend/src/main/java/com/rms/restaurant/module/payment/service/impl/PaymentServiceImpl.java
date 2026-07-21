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
import com.rms.restaurant.module.payment.dto.VnpayCreateRequest;
import com.rms.restaurant.module.payment.dto.VnpayCreateResponse;
import com.rms.restaurant.module.payment.dto.VnpayStatusResponse;
import com.rms.restaurant.module.payment.mapper.PaymentMapper;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.Payment;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.payment.config.VnpayProperties;
import com.rms.restaurant.module.payment.service.PaymentService;
import com.rms.restaurant.module.payment.service.internal.MockQrPaymentGateway;
import com.rms.restaurant.module.payment.service.internal.VnpayQueryClient;
import com.rms.restaurant.module.payment.service.internal.VnpayQueryResult;
import com.rms.restaurant.module.payment.service.internal.VnpayService;
import com.rms.restaurant.module.user.service.AuditService;
import com.rms.restaurant.module.shift.model.Shift;
import com.rms.restaurant.module.shift.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final String STATUS_PAID      = "PAID";
    private static final String STATUS_PENDING   = "PENDING";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_FAILED    = "FAILED";
    private static final String STATUS_EXPIRED   = "EXPIRED";
    private static final String SHIFT_OPEN  = "OPEN";
    // BR-PM-02: a simulated QR payment window; informational only, not enforced.
    private static final long QR_EXPIRY_MINUTES = 15;
    // VNPAY Sandbox payment window. A still-PENDING attempt past this point is reported
    // as EXPIRED to the frontend (computed at read time, not persisted) and no longer
    // counts as "unexpired" for the conflicting-attempt guard below.
    private static final long VNPAY_EXPIRY_MINUTES = 15;
    private static final String VNPAY_LOCAL_CALLBACK_BASE = "http://localhost:8080";

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentMapper paymentMapper;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;
    private final MockQrPaymentGateway qrGateway;
    private final CashbookService cashbookService;
    private final VnpayService vnpayService;
    private final VnpayQueryClient vnpayQueryClient;
    private final VnpayProperties vnpayProperties;

    /**
     * This bean seen through its own Spring proxy. Reconciliation must commit in its OWN
     * transaction: when it is triggered from the CASH / VNPAY-create paths, those callers
     * often go on to fail (e.g. "invoice already paid" once reconciliation settles it), and
     * a plain {@code this.reconcile...()} call would join their transaction and have the
     * settlement rolled back with them — silently losing a payment VNPAY already took.
     */
    @Autowired
    @Lazy
    private PaymentService self;

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

        // Before taking any lock: settle/expire stale PENDING attempts so a dead VNPAY
        // attempt (IPN never delivered, customer cancelled, window lapsed) cannot block
        // CASH forever. Deliberately placed ahead of lockOrderAndInvoice so the QueryDR
        // HTTP call never runs while holding pessimistic row locks.
        resolveStalePendingAttempts(request.invoiceId());

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
        rejectIfConflictingPendingAttempt(invoice.getId());

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

    // ── VNPAY Sandbox — real redirect gateway ────────────────────────────────────

    @Override
    public VnpayCreateResponse createVnpayPayment(VnpayCreateRequest request, String cashierUsername, String clientIp) {
        if (!vnpayProperties.isConfigured()) {
            throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_NOT_CONFIGURED);
        }

        CashierShiftContext cashierShift = requireCashierWithOpenShift(cashierUsername);

        // Same pre-lock cleanup as the CASH path: a stale PENDING attempt must not block a
        // fresh one, and the QueryDR HTTP call must not run under pessimistic row locks.
        resolveStalePendingAttempts(request.invoiceId());

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

        LocalDateTime now = LocalDateTime.now();
        ZonedDateTime nowVn = vnpayService.nowInVietnam();
        ZonedDateTime expireVn = nowVn.plusMinutes(VNPAY_EXPIRY_MINUTES);
        LocalDateTime expiresAt = expireVn.toLocalDateTime();

        // Idempotent: reuse an already-open, unexpired VNPAY attempt instead of minting a
        // new vnp_TxnRef every time the cashier reopens the payment panel.
        Payment payment = paymentRepository
                .findFirstByInvoiceIdAndMethodAndStatus(invoice.getId(), PaymentMethod.VNPAY, STATUS_PENDING)
                .filter(existing -> existing.getExpiresAt() != null && existing.getExpiresAt().isAfter(now))
                .orElse(null);

        if (payment == null) {
            rejectIfConflictingPendingAttempt(invoice.getId());

            payment = Payment.builder()
                    .invoiceId(invoice.getId())
                    .method(PaymentMethod.VNPAY)
                    .amount(invoice.getTotalAmount())
                    .status(STATUS_PENDING)
                    .gatewayRef(vnpayService.generateTxnRef())
                    .vnpCreateDate(nowVn.format(VnpayService.VNP_DATE_FORMAT))
                    .expiresAt(expiresAt)
                    .shiftId(cashierShift.shift().getId())     // BR-CS-08
                    .cashierId(cashierShift.cashier().getId()) // BR-CS-08
                    .build();
            payment = paymentRepository.save(payment);
        } else {
            // Refresh the expiry to match the freshly signed URL's vnp_ExpireDate so the
            // DB and the gateway never disagree about when this attempt lapses. The
            // create-date is deliberately NOT refreshed: QueryDR matches on the original
            // vnp_CreateDate, so re-signing must replay the stored one (see V47).
            payment.setExpiresAt(expiresAt);
            payment = paymentRepository.save(payment);
        }

        String paymentUrl = buildSignedVnpayUrl(payment, invoice, expireVn, clientIp);

        audit("PAYMENT_VNPAY_CREATE", payment.getId(),
                "{\"invoiceId\":\"" + esc(invoice.getId()) + "\",\"amount\":" + payment.getAmount()
                        + ",\"txnRef\":\"" + esc(payment.getGatewayRef()) + "\"}");

        return new VnpayCreateResponse(
                payment.getId(), payment.getGatewayRef(), paymentUrl, payment.getAmount(), expiresAt);
    }

    /** Rejects when a different, still-unexpired PENDING attempt already exists for this
     *  invoice (legacy QR or another VNPAY attempt) — CASH and VNPAY must not race. */
    private void rejectIfConflictingPendingAttempt(String invoiceId) {
        paymentRepository
                .findFirstByInvoiceIdAndStatusAndExpiresAtAfter(invoiceId, STATUS_PENDING, LocalDateTime.now())
                .ifPresent(existing -> {
                    throw new ApplicationException(ApplicationError.PAYMENT_ATTEMPT_PENDING);
                });
    }

    private String buildSignedVnpayUrl(
            Payment payment, Invoice invoice, ZonedDateTime expireVn, String clientIp
    ) {
        // vnp_Amount is the smallest-unit representation VNPAY requires (VND has no
        // subunit in practice, so this is always *100). Sourced only from the invoice's
        // own total — never from anything the frontend could have sent.
        long vnpAmount = payment.getAmount().longValueExact() * 100;

        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnpayProperties.getTmnCode());
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", payment.getGatewayRef());
        params.put("vnp_OrderInfo", vnpayOrderInfo(invoice.getCode()));
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", resolveCallbackUrl(vnpayProperties.getReturnUrl(), "/api/payments/vnpay/return"));
        params.put("vnp_IpAddr", (clientIp == null || clientIp.isBlank()) ? "127.0.0.1" : clientIp);
        // Exactly the value persisted on the row, so QueryDR can replay it byte-for-byte.
        params.put("vnp_CreateDate", payment.getVnpCreateDate());
        params.put("vnp_ExpireDate", expireVn.format(VnpayService.VNP_DATE_FORMAT));

        return vnpayService.buildPaymentUrl(vnpayProperties.getPayUrl(), params, vnpayProperties.getHashSecret());
    }

    /** vnp_OrderInfo must be identical in the pay request and in any later QueryDR call,
     *  because it participates in both checksums. Derived from the invoice code only. */
    private String vnpayOrderInfo(String invoiceCode) {
        return "Thanh toan hoa don " + invoiceCode;
    }

    /** Prefers the explicitly configured public callback URL (a real tunnel); falls back to
     *  the local backend address rather than inventing a public one. VNPAY's sandbox simply
     *  cannot reach the fallback until VNPAY_RETURN_URL/VNPAY_IPN_URL point at a real tunnel. */
    private String resolveCallbackUrl(String configured, String path) {
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        return VNPAY_LOCAL_CALLBACK_BASE + path;
    }

    @Override
    public String buildVnpayReturnRedirect(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        applyVerifiedReturnOutcome(txnRef, params);

        // A success on Return is deliberately NOT settled here: the browser's query string
        // is not an authoritative confirmation. The result page reconciles it via QueryDR
        // (or IPN gets there first).
        String base = (vnpayProperties.getFrontendResultUrl() == null || vnpayProperties.getFrontendResultUrl().isBlank())
                ? "/payment/vnpay-result"
                : vnpayProperties.getFrontendResultUrl();
        String separator = base.contains("?") ? "&" : "?";
        String encodedTxnRef = URLEncoder.encode(txnRef == null ? "" : txnRef, StandardCharsets.UTF_8);
        return base + separator + "txnRef=" + encodedTxnRef;
    }

    /**
     * Return-URL handling. A *verified* terminal failure is applied immediately so a
     * cancelled/expired attempt stops blocking the invoice the moment the customer comes
     * back — but a reported success is never trusted for settlement. Best-effort: any
     * problem leaves state untouched and still lets the redirect happen.
     */
    private void applyVerifiedReturnOutcome(String txnRef, Map<String, String> params) {
        if (txnRef == null || txnRef.isBlank()) return;

        boolean validSignature = vnpayProperties.isConfigured()
                && vnpayService.verifySignature(params, vnpayProperties.getHashSecret(), params.get("vnp_SecureHash"));
        String responseCode = params.get("vnp_ResponseCode");

        audit("PAYMENT_VNPAY_RETURN", txnRef,
                "{\"validSignature\":" + validSignature + ",\"responseCode\":\"" + esc(responseCode) + "\"}");

        if (!validSignature) return;

        String receivedTmnCode = params.get("vnp_TmnCode");
        if (receivedTmnCode == null || !receivedTmnCode.equals(vnpayProperties.getTmnCode())) return;

        Payment payment = paymentRepository.findByGatewayRefForUpdate(txnRef).orElse(null);
        if (payment == null || payment.getMethod() != PaymentMethod.VNPAY) return;

        // Never downgrade an already-settled attempt.
        if (!STATUS_PENDING.equals(payment.getStatus())) return;

        if (!amountMatches(payment, params.get("vnp_Amount"))) {
            audit("PAYMENT_VNPAY_RETURN_AMOUNT_MISMATCH", payment.getId(), "{}");
            return;
        }

        String transactionStatus = params.get("vnp_TransactionStatus");
        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            // Success claimed — leave PENDING for IPN/QueryDR to confirm authoritatively.
            return;
        }

        recordGatewayFields(payment, responseCode, transactionStatus,
                params.get("vnp_TransactionNo"), params.get("vnp_BankCode"), params.get("vnp_CardType"));
        payment.setStatus(terminalFailureStatus(responseCode));
        paymentRepository.save(payment);
        audit("PAYMENT_VNPAY_RETURN_TERMINAL", payment.getId(),
                "{\"status\":\"" + payment.getStatus() + "\",\"responseCode\":\"" + esc(responseCode) + "\"}");
    }

    /** VNPAY's own codes: 24 = customer cancelled, 11 = payment window expired. */
    private String terminalFailureStatus(String responseCode) {
        if ("24".equals(responseCode)) return STATUS_CANCELLED;
        if ("11".equals(responseCode)) return STATUS_EXPIRED;
        return STATUS_FAILED;
    }

    private boolean amountMatches(Payment payment, String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) return false;
        try {
            return Long.parseLong(rawAmount.trim()) == payment.getAmount().longValueExact() * 100;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private void recordGatewayFields(Payment payment, String responseCode, String transactionStatus,
                                     String transactionNo, String bankCode, String cardType) {
        payment.setVnpResponseCode(responseCode);
        payment.setVnpTransactionStatus(transactionStatus);
        if (transactionNo != null) payment.setVnpTransactionNo(transactionNo);
        if (bankCode != null) payment.setVnpBankCode(bankCode);
        if (cardType != null) payment.setVnpCardType(cardType);
    }

    @Override
    public Map<String, String> handleVnpayIpn(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return ipnResponse("01", "Order not found");
        }

        if (!vnpayProperties.isConfigured()
                || !vnpayService.verifySignature(params, vnpayProperties.getHashSecret(), params.get("vnp_SecureHash"))) {
            audit("PAYMENT_VNPAY_IPN_INVALID_SIGNATURE", txnRef, "{}");
            return ipnResponse("97", "Invalid signature");
        }

        String receivedTmnCode = params.get("vnp_TmnCode");
        if (receivedTmnCode == null || !receivedTmnCode.equals(vnpayProperties.getTmnCode())) {
            audit("PAYMENT_VNPAY_IPN_INVALID_TMNCODE", txnRef, "{}");
            return ipnResponse("97", "Invalid TmnCode");
        }

        Payment payment = paymentRepository.findByGatewayRefForUpdate(txnRef).orElse(null);
        if (payment == null || payment.getMethod() != PaymentMethod.VNPAY) {
            return ipnResponse("01", "Order not found");
        }

        long expectedAmount = payment.getAmount().longValueExact() * 100;
        long receivedAmount;
        try {
            receivedAmount = Long.parseLong(params.getOrDefault("vnp_Amount", ""));
        } catch (NumberFormatException e) {
            return ipnResponse("04", "Invalid amount");
        }
        if (receivedAmount != expectedAmount) {
            audit("PAYMENT_VNPAY_IPN_AMOUNT_MISMATCH", payment.getId(),
                    "{\"expected\":" + expectedAmount + ",\"received\":" + receivedAmount + "}");
            return ipnResponse("04", "Invalid amount");
        }

        if (!STATUS_PENDING.equals(payment.getStatus())) {
            // Already finalized by an earlier Return/IPN call — duplicate delivery.
            // Idempotent: acknowledge without mutating anything again.
            return ipnResponse("02", "Order already confirmed");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);

        recordGatewayFields(payment, responseCode, transactionStatus,
                params.get("vnp_TransactionNo"), params.get("vnp_BankCode"), params.get("vnp_CardType"));

        if (!success) {
            payment.setStatus(terminalFailureStatus(responseCode));
            paymentRepository.save(payment);
            audit("PAYMENT_VNPAY_IPN_FAILED", payment.getId(), "{\"responseCode\":\"" + esc(responseCode) + "\"}");
            return ipnResponse("00", "Confirm Success");
        }

        boolean settled = settleVnpaySuccess(payment, "PAYMENT_VNPAY_IPN_SUCCESS");
        return settled
                ? ipnResponse("00", "Confirm Success")
                : ipnResponse("02", "Order already confirmed");
    }

    /**
     * The single place a VNPAY attempt turns into a settled invoice — shared by IPN and
     * QueryDR reconciliation so the invoice flag, receipt voucher and paidAt stamp happen
     * exactly once no matter which path confirms first. The caller must already hold the
     * payment row lock and have verified it is still PENDING.
     *
     * <p>Deliberately does not re-check the cashier's shift: closing the shift after
     * initiation must never prevent a genuine confirmation from landing.
     *
     * @return false when the invoice had already moved on (paid another way, split, …), in
     *         which case the attempt is parked as FAILED rather than left PENDING forever.
     */
    private boolean settleVnpaySuccess(Payment payment, String auditAction) {
        LockedPaymentContext lockContext = lockOrderAndInvoice(payment.getInvoiceId());
        Order order = lockContext.order();
        Invoice invoice = lockContext.invoice();

        if (invoice.getStatus() != InvoiceStatus.ACTIVE || invoice.isPaid() || hasPaidPayment(invoice.getId())) {
            payment.setStatus(STATUS_FAILED);
            paymentRepository.save(payment);
            audit(auditAction + "_STALE_INVOICE", payment.getId(),
                    "{\"invoiceId\":\"" + esc(invoice.getId()) + "\"}");
            return false;
        }

        payment.setStatus(STATUS_PAID);
        payment.setPaidAt(LocalDateTime.now());
        Payment savedPayment = paymentRepository.save(payment);
        invoice.setPaid(true);
        invoiceRepository.save(invoice);
        createReceiptVoucher(order, savedPayment, resolveCashierUsername(savedPayment.getCashierId()));

        audit(auditAction, savedPayment.getId(),
                "{\"invoiceId\":\"" + esc(invoice.getId()) + "\",\"amount\":" + savedPayment.getAmount() + "}");
        return true;
    }

    private Map<String, String> ipnResponse(String rspCode, String message) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("RspCode", rspCode);
        body.put("Message", message);
        return body;
    }

    /** IPN has no authenticated caller — resolves the username of the cashier who
     *  initiated the attempt (captured on the Payment row at creation, BR-CS-08). */
    private String resolveCashierUsername(String cashierId) {
        if (cashierId == null) return "system";
        return userRepository.findById(cashierId).map(User::getUsername).orElse("system");
    }

    @Override
    @Transactional(readOnly = true)
    public VnpayStatusResponse getVnpayStatus(String txnRef) {
        Payment payment = paymentRepository.findByGatewayRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND));
        if (payment.getMethod() != PaymentMethod.VNPAY) {
            throw new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND);
        }

        String status = payment.getStatus();
        if (STATUS_PENDING.equals(status)
                && payment.getExpiresAt() != null
                && payment.getExpiresAt().isBefore(LocalDateTime.now())) {
            status = "EXPIRED";
        }

        Invoice invoice = invoiceRepository.findById(payment.getInvoiceId()).orElse(null);
        String invoiceCode = invoice != null ? invoice.getCode() : null;
        String orderId = invoice != null ? invoice.getOrderId() : null;
        Order order = orderId != null ? orderRepository.findById(orderId).orElse(null) : null;
        String orderCode = order != null ? order.getCode() : null;
        String tableId = order != null ? order.getTableId() : null;

        return new VnpayStatusResponse(
                txnRef, payment.getInvoiceId(), invoiceCode, orderId, orderCode, tableId,
                status, payment.getAmount(), payment.getPaidAt()
        );
    }

    // REQUIRES_NEW so a confirmed settlement survives even when the caller that triggered
    // the reconciliation subsequently fails and rolls back (see the `self` field).
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public VnpayStatusResponse reconcileVnpayPayment(String txnRef, String clientIp) {
        Payment snapshot = paymentRepository.findByGatewayRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND));
        if (snapshot.getMethod() != PaymentMethod.VNPAY) {
            throw new ResourceNotFoundException(ApplicationError.PAYMENT_NOT_FOUND);
        }
        // Already terminal — nothing to ask VNPAY about.
        if (!STATUS_PENDING.equals(snapshot.getStatus())) {
            return getVnpayStatus(txnRef);
        }
        if (!vnpayProperties.isConfigured()) {
            throw new ApplicationException(ApplicationError.PAYMENT_GATEWAY_NOT_CONFIGURED);
        }
        if (snapshot.getVnpCreateDate() == null || snapshot.getVnpCreateDate().isBlank()) {
            // Pre-V47 attempt: the original vnp_CreateDate was never recorded, and QueryDR
            // matches on it exactly, so guessing would only produce a misleading answer.
            throw new ApplicationException(ApplicationError.PAYMENT_NOT_RECONCILABLE);
        }

        Invoice invoice = invoiceRepository.findById(snapshot.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        // The HTTP call runs before any row is locked (see resolveStalePendingAttempts for
        // the callers that matter) so a slow gateway can never hold pessimistic locks.
        VnpayQueryResult result = vnpayQueryClient.query(
                txnRef, snapshot.getVnpCreateDate(), vnpayOrderInfo(invoice.getCode()), clientIp);

        applyQueryResult(txnRef, result);
        return getVnpayStatus(txnRef);
    }

    /**
     * Applies a QueryDR answer under the payment row lock. Every rejection path leaves the
     * attempt exactly as it was — an unverifiable answer must never be turned into a state
     * change in either direction.
     */
    private void applyQueryResult(String txnRef, VnpayQueryResult result) {
        Payment payment = paymentRepository.findByGatewayRefForUpdate(txnRef).orElse(null);
        if (payment == null || payment.getMethod() != PaymentMethod.VNPAY) return;
        // Another caller (IPN, or a concurrent reconcile) already finalized it.
        if (!STATUS_PENDING.equals(payment.getStatus())) return;

        if (!result.signatureValid()) {
            audit("PAYMENT_VNPAY_QUERYDR_INVALID_SIGNATURE", payment.getId(), "{}");
            return;
        }
        if (result.tmnCode() == null || !result.tmnCode().equals(vnpayProperties.getTmnCode())) {
            audit("PAYMENT_VNPAY_QUERYDR_INVALID_TMNCODE", payment.getId(), "{}");
            return;
        }
        if (result.txnRef() == null || !result.txnRef().equals(txnRef)) {
            audit("PAYMENT_VNPAY_QUERYDR_TXNREF_MISMATCH", payment.getId(), "{}");
            return;
        }
        if (!result.querySucceeded()) {
            // e.g. 91 "transaction not found" — the customer may simply not have paid yet.
            // Stay PENDING; lazy expiry closes it out once the window lapses.
            audit("PAYMENT_VNPAY_QUERYDR_NO_RESULT", payment.getId(),
                    "{\"queryResponseCode\":\"" + esc(result.queryResponseCode()) + "\"}");
            return;
        }
        if (!amountMatches(payment, result.amount())) {
            audit("PAYMENT_VNPAY_QUERYDR_AMOUNT_MISMATCH", payment.getId(),
                    "{\"received\":\"" + esc(result.amount()) + "\"}");
            return;
        }
        if (result.stillPending()) {
            // vnp_TransactionStatus 01 — genuinely in flight at VNPAY.
            return;
        }

        recordGatewayFields(payment, payment.getVnpResponseCode(), result.transactionStatus(),
                result.transactionNo(), result.bankCode(), null);

        if (result.paid()) {
            settleVnpaySuccess(payment, "PAYMENT_VNPAY_QUERYDR_SUCCESS");
            return;
        }

        // Failed at VNPAY. Prefer a more specific state if the Return leg already told us
        // the customer cancelled (24) or the window expired (11).
        payment.setStatus(terminalFailureStatus(payment.getVnpResponseCode()));
        paymentRepository.save(payment);
        audit("PAYMENT_VNPAY_QUERYDR_FAILED", payment.getId(),
                "{\"status\":\"" + payment.getStatus()
                        + "\",\"transactionStatus\":\"" + esc(result.transactionStatus()) + "\"}");
    }

    /**
     * Called before any lock is taken on the CASH and VNPAY-create paths: reconciles VNPAY
     * attempts whose IPN never arrived, then normalizes anything still PENDING past its
     * window to EXPIRED. Without this, a dead local PENDING row blocks the invoice forever.
     *
     * <p>A gateway outage is swallowed on purpose — the attempt simply stays PENDING and
     * the caller's normal conflict check reports it, which is the safe outcome (we must not
     * open a second payment on an attempt that might have succeeded).
     */
    private void resolveStalePendingAttempts(String invoiceId) {
        for (Payment pending : paymentRepository.findByInvoiceIdAndStatus(invoiceId, STATUS_PENDING)) {
            if (pending.getMethod() != PaymentMethod.VNPAY) continue;
            if (pending.getGatewayRef() == null || pending.getVnpCreateDate() == null) continue;
            if (!vnpayProperties.isConfigured()) continue;
            try {
                // Through the proxy on purpose — see the `self` field: this must commit
                // independently of the caller's transaction.
                self.reconcileVnpayPayment(pending.getGatewayRef(), null);
            } catch (RuntimeException e) {
                log.warn("VNPAY reconciliation skipped for txnRef {}: {}",
                        pending.getGatewayRef(), e.getMessage());
            }
        }

        LocalDateTime now = LocalDateTime.now();
        for (Payment pending : paymentRepository.findByInvoiceIdAndStatus(invoiceId, STATUS_PENDING)) {
            if (pending.getExpiresAt() != null && pending.getExpiresAt().isBefore(now)) {
                pending.setStatus(STATUS_EXPIRED);
                paymentRepository.save(pending);
                audit("PAYMENT_ATTEMPT_EXPIRED", pending.getId(),
                        "{\"invoiceId\":\"" + esc(invoiceId) + "\"}");
            }
        }
    }

    /** Auto-generates a Cash Book (Sổ quỹ) RECEIPT voucher against the SALES_RECEIPT system
     * category whenever an invoice gets paid — no dedicated customer table exists (V36 adds
     * customer_name directly on orders), so the partner is CUSTOMER with free-text name only. */
    private void createReceiptVoucher(Order order, Payment payment, String username) {
        String partnerName = (order.getCustomerName() == null || order.getCustomerName().isBlank())
                ? "Khách lẻ" : order.getCustomerName();
        cashbookService.createSystemVoucher(new SystemVoucherRequest(
                CashFlowType.RECEIPT, "SALES_RECEIPT", payment.getPaidAt(),
                (payment.getMethod() == PaymentMethod.QR || payment.getMethod() == PaymentMethod.VNPAY)
                        ? CashFlowMethod.BANK : CashFlowMethod.CASH,
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
