package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CashMovementRequest(
        @NotBlank String type,
        @NotNull @Positive BigDecimal amount,
        String reason
) {}
