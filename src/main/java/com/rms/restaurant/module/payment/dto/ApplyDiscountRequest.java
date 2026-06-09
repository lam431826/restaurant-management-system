package com.rms.restaurant.module.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplyDiscountRequest(@NotBlank String promotionCode) {}
