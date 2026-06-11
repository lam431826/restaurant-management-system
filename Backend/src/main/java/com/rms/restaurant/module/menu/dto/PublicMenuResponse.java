package com.rms.restaurant.module.menu.dto;

import java.util.List;

public record PublicMenuResponse(String categoryId, String categoryName, List<MenuItemResponse> items) {}
