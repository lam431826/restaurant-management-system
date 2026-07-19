package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;

import java.util.List;

public interface PaymentService {
    // BR-CS-08: the payment is attributed to the processing cashier's OPEN shift
    PaymentResponse process(ProcessPaymentRequest request, String cashierUsername);
    List<PaymentResponse> getHistory(String invoiceId);
    void handleWebhook(PaymentWebhookPayload payload, String signature);
}
