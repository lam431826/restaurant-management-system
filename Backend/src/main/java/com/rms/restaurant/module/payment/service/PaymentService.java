package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.dto.QrInitiateRequest;

import java.util.List;

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
}
