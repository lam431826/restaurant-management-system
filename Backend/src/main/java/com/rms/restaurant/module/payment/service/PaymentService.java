package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;

public interface PaymentService {
    String process(ProcessPaymentRequest request);
    void handleWebhook(PaymentWebhookPayload payload, String signature);
}
