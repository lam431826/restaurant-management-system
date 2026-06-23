package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank String tableId,
        @NotEmpty List<com.rms.restaurant.module.guest_ordering.dto.GuestOrderItemRequest> items,
        String note
) {}
