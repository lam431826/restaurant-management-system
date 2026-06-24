package com.rms.restaurant.module.menu.dto;

import java.math.BigDecimal;

/** Guest-facing menu item — excludes internal fields such as cost price and stock tracking. */
public record PublicMenuItemResponse(
        String id,
        String categoryId,
        String name,
        BigDecimal price,
        String description,
        String imageUrl
) {}
