package com.rms.restaurant.module.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record ViolationTypeRequest(
        @NotBlank(message = "Vui lòng nhập tên vi phạm") String name,
        @NotNull @PositiveOrZero BigDecimal penaltyAmount) {
}
