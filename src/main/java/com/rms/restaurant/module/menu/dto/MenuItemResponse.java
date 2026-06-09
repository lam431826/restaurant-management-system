package com.rms.restaurant.module.menu.dto;

import java.math.BigDecimal;

public record MenuItemResponse(String id, String categoryId, String name, BigDecimal price, String description, String imageUrl, boolean available) {}
