package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank String tableId,
        List<com.rms.restaurant.module.guest_ordering.dto.GuestOrderItemRequest> items,
        String note
) {}
