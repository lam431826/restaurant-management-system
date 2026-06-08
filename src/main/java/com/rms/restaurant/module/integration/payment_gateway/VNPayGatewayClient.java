package com.rms.restaurant.module.integration.payment_gateway;

import com.rms.restaurant.module.integration.payment_gateway.dto.PaymentSessionRequest;
import com.rms.restaurant.module.integration.payment_gateway.dto.PaymentSessionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Profile("vnpay")
@RequiredArgsConstructor
public class VNPayGatewayClient implements PaymentGatewayClient {

    @Override
    public PaymentSessionResponse createSession(PaymentSessionRequest request) {
        // TODO: implement VNPay create payment session
        return null;
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        // TODO: implement HMAC-SHA256 signature verification
        return false;
    }

    @Override
    public Map<String, Object> parseWebhookPayload(String payload) {
        // TODO: implement VNPay webhook payload parsing
        return null;
    }
}
