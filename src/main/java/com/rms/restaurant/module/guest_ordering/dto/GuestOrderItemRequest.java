package com.rms.restaurant.module.guest_ordering.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record GuestOrderItemRequest(
        @NotBlank String menuItemId,
        @Min(1) int quantity,
        String note
) {}
