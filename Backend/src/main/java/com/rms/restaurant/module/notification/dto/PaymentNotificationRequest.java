package com.rms.restaurant.module.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentNotificationRequest(
        @NotBlank String invoiceId
) {}
