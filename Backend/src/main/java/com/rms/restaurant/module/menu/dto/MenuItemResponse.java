package com.rms.restaurant.module.menu.dto;

import java.math.BigDecimal;

public record MenuItemResponse(
        String id,
        String code,
        String categoryId,
        String name,
        BigDecimal price,
        BigDecimal costPrice,
        String description,
        String imageUrl,
        String menuType,
        String itemType,
        String tag,
        boolean trackStock,
        boolean available
) {}
