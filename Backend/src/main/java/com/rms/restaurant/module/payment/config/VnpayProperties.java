package com.rms.restaurant.module.payment.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * VNPAY Sandbox configuration, read directly from OS environment variables (never from
 * application.properties, which is off-limits — Spring's {@code ${...}} placeholder
 * resolution already checks the process environment on its own, so no property-file entry
 * is needed). Mirrors {@code GmailService}'s "absent env var leaves the app running, just
 * unable to use the feature" posture rather than failing startup.
 */
@Getter
@Component
public class VnpayProperties {

    @Value("${VNPAY_TMN_CODE:}")
    private String tmnCode;

    @Value("${VNPAY_HASH_SECRET:}")
    private String hashSecret;

    @Value("${VNPAY_PAY_URL:}")
    private String payUrl;

    // Server-to-server QueryDR endpoint used to reconcile an attempt whose IPN never
    // arrived. Defaults to the sandbox URL so reconciliation still works on a developer
    // machine that only has the pay-URL configured.
    @Value("${VNPAY_QUERY_URL:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String queryUrl;

    @Value("${VNPAY_FRONTEND_RESULT_URL:}")
    private String frontendResultUrl;

    // Public HTTPS callback endpoints VNPAY's servers/browser redirect must reach. Left
    // blank until a real tunnel (ngrok or similar) is configured; requests fall back to
    // the incoming request's own scheme/host rather than a fabricated public URL — see
    // PaymentServiceImpl.resolveCallbackUrl.
    @Value("${VNPAY_RETURN_URL:}")
    private String returnUrl;

    @Value("${VNPAY_IPN_URL:}")
    private String ipnUrl;

    /** True only when everything required to build a signed payment URL is present. */
    public boolean isConfigured() {
        return isResolved(tmnCode) && isResolved(hashSecret) && isResolved(payUrl) && isResolved(frontendResultUrl);
    }

    private static boolean isResolved(String value) {
        return value != null && !value.isBlank() && !value.startsWith("${");
    }
}
