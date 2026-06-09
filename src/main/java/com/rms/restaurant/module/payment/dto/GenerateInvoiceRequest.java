package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record GenerateInvoiceRequest(@NotBlank String orderId, String promotionCode) {}
