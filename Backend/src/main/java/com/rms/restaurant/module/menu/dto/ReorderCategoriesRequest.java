package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ReorderCategoriesRequest(@NotEmpty List<String> orderedCategoryIds) {}
