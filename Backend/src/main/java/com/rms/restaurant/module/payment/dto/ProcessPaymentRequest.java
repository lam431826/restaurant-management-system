package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProcessPaymentRequest(
        @NotBlank String invoiceId,
        @NotNull PaymentMethod method
) {}
