package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AddOrderItemRequest(@NotBlank String menuItemId, @Min(1) int quantity, String note) {}
