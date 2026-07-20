package com.rms.restaurant.module.payment.service.internal;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Simulated external QR payment gateway boundary (SRS: the system must be able to work
 * with an external payment system). No real bank/VietQR integration — this generates a
 * transaction reference and a mock QR payload only. The actual PENDING-&gt;PAID transition
 * is triggered by a cashier action standing in for the gateway's callback/webhook.
 */
@Service
public class MockQrPaymentGateway {

    private static final String PROVIDER = "MOCK_QR";

    public String generateTransactionReference() {
        return PROVIDER + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    /** Mock QR payload string; not a real VietQR/EMV payload, display-only. */
    public String buildQrPayload(String invoiceId, BigDecimal amount, String transactionReference) {
        return "MOCKQR|invoiceId=" + invoiceId + "|amount=" + amount.toPlainString()
                + "|ref=" + transactionReference;
    }
}
