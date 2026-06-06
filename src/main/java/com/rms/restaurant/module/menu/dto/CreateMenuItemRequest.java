package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CreateMenuItemRequest(
        @NotBlank String categoryId,
        @NotBlank String name,
        @NotNull @Positive BigDecimal price,
        String description
) {}
