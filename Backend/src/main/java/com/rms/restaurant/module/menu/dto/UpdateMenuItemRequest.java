package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateMenuItemRequest(
        String categoryId,
        String name,
        @PositiveOrZero BigDecimal price,
        String code,
        @PositiveOrZero BigDecimal costPrice,
        String description,
        String imageUrl,
        String menuType,
        String itemType,
        String tag,
        Boolean trackStock,
        Boolean available
) {}
