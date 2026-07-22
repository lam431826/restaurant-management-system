package com.rms.restaurant.module.payment.service.internal;

import java.util.Map;

/**
 * A verified QueryDR response. {@code signatureValid} is computed by the client before the
 * result ever reaches business code, so callers cannot forget to check it.
 *
 * @param queryResponseCode  vnp_ResponseCode — whether the QUERY itself succeeded ("00"),
 *                           not the payment outcome.
 * @param transactionStatus  vnp_TransactionStatus — the payment outcome ("00" paid,
 *                           "01" still pending, anything else failed).
 */
public record VnpayQueryResult(
        boolean signatureValid,
        String queryResponseCode,
        String transactionStatus,
        String tmnCode,
        String txnRef,
        String amount,
        String transactionNo,
        String bankCode,
        String payDate,
        String message,
        Map<String, String> raw
) {
    public boolean querySucceeded() {
        return "00".equals(queryResponseCode);
    }

    public boolean paid() {
        return querySucceeded() && "00".equals(transactionStatus);
    }

    public boolean stillPending() {
        return "01".equals(transactionStatus);
    }
}
