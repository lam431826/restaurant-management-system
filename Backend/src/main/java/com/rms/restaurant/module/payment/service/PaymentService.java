package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;

public interface PaymentService {
    PaymentResponse process(ProcessPaymentRequest request);
    void handleWebhook(PaymentWebhookPayload payload, String signature);
}
