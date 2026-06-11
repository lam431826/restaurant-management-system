package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.module.payment.dto.PaymentWebhookPayload;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    @Override public String process(ProcessPaymentRequest request) { return null; }
    @Override public void handleWebhook(PaymentWebhookPayload payload, String signature) {}
}
