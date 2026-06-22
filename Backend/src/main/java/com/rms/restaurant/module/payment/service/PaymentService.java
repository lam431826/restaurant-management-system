package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;

import java.util.List;

public interface PaymentService {
    PaymentResponse process(ProcessPaymentRequest request);
    List<PaymentResponse> getHistory(String invoiceId);
    void handleWebhook(PaymentWebhookPayload payload, String signature);
}
