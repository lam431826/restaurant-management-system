package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** CASH-only immediate payment. VNPAY uses the dedicated redirect flow. */
public record ProcessPaymentRequest(
        @NotBlank String invoiceId,
        @NotNull PaymentMethod method,
        // Required for CASH; ignored/validated away for any other method.
        BigDecimal receivedAmount
) {}
