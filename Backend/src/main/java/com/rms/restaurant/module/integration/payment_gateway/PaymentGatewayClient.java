package com.rms.restaurant.module.integration.payment_gateway;

import com.rms.restaurant.module.integration.payment_gateway.dto.PaymentSessionRequest;
import com.rms.restaurant.module.integration.payment_gateway.dto.PaymentSessionResponse;

import java.util.Map;

public interface PaymentGatewayClient {

    PaymentSessionResponse createSession(PaymentSessionRequest request);

    boolean verifyWebhookSignature(String payload, String signature);

    Map<String, Object> parseWebhookPayload(String payload);
}
