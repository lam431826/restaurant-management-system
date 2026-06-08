package com.rms.restaurant.module.shift.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record CloseShiftRequest(@NotNull @PositiveOrZero BigDecimal closingCash) {}
