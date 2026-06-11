package com.rms.restaurant.module.payment.dto;

public record PaymentWebhookPayload(String provider, String orderRef, String status, long amount) {}
