package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.dto.QrInitiateRequest;
import com.rms.restaurant.module.payment.dto.VnpayCreateRequest;
import com.rms.restaurant.module.payment.dto.VnpayCreateResponse;
import com.rms.restaurant.module.payment.dto.VnpayStatusResponse;

import java.util.List;
import java.util.Map;

public interface PaymentService {
    // BR-CS-08: the payment is attributed to the processing cashier's OPEN shift.
    // CASH only — immediate PAID. QR goes through the qr* methods below.
    PaymentResponse process(ProcessPaymentRequest request, String cashierUsername);

    /** Creates (or returns the existing) PENDING simulated QR payment for the invoice. */
    PaymentResponse initiateQrPayment(QrInitiateRequest request, String cashierUsername);

    /** Simulated external gateway callback: PENDING -> PAID, invoice.paid = true. */
    PaymentResponse simulateQrSuccess(String paymentId, String cashierUsername);

    /** Cancels a PENDING QR payment; invoice stays unpaid, cashier may retry. */
    PaymentResponse cancelQrPayment(String paymentId, String cashierUsername);

    List<PaymentResponse> getHistory(String invoiceId);
    void handleWebhook(PaymentWebhookPayload payload, String signature);

    // ── VNPAY Sandbox ────────────────────────────────────────────────────────

    /** Creates (or, if an unexpired one already exists, reuses) a PENDING VNPAY attempt
     *  and returns a freshly signed redirect URL. Amount always comes from the invoice. */
    VnpayCreateResponse createVnpayPayment(VnpayCreateRequest request, String cashierUsername, String clientIp);

    /** Verifies the Return signature only; never mutates invoice/payment state — IPN is
     *  authoritative. Returns the frontend result-page URL to redirect the browser to. */
    String buildVnpayReturnRedirect(Map<String, String> params);

    /** Authoritative gateway callback: verifies checksum/amount/TmnCode, finalizes the
     *  payment exactly once, and returns the {RspCode, Message} body VNPAY expects. */
    Map<String, String> handleVnpayIpn(Map<String, String> params);

    VnpayStatusResponse getVnpayStatus(String txnRef);

    /**
     * Server-side fallback for when IPN never arrived (the normal case on localhost):
     * asks VNPAY QueryDR what actually happened and settles the attempt idempotently.
     * Returns the resulting status. A still-genuinely-pending transaction stays PENDING.
     */
    VnpayStatusResponse reconcileVnpayPayment(String txnRef, String clientIp);
}
