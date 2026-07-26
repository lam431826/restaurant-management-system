package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.VnpayCreateRequest;
import com.rms.restaurant.module.payment.dto.VnpayCreateResponse;
import com.rms.restaurant.module.payment.dto.VnpayStatusResponse;

import java.util.Map;

/**
 * VNPAY-specific lifecycle. The gateway owns its return, IPN, and reconciliation contracts.
 */
public interface VnpayPaymentService {

    VnpayCreateResponse createVnpayPayment(
            VnpayCreateRequest request,
            String cashierUsername,
            String clientIp
    );

    /** Verifies the browser return without settling the invoice. */
    String buildVnpayReturnRedirect(Map<String, String> params);

    /** Verifies and applies the authoritative gateway callback idempotently. */
    Map<String, String> handleVnpayIpn(Map<String, String> params);

    VnpayStatusResponse getVnpayStatus(String txnRef);

    /** Queries VNPAY when an IPN did not arrive and applies the verified result. */
    VnpayStatusResponse reconcileVnpayPayment(String txnRef, String clientIp);
}
