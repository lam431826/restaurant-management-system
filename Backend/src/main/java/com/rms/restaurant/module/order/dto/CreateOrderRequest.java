package com.rms.restaurant.module.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank String tableId,
        @NotEmpty List<com.rms.restaurant.module.guest_ordering.dto.GuestOrderItemRequest> items,
        String note,
        // Optional customer contact captured in the order panel before the order exists.
        // Descriptive only — these never take part in table/reservation validation.
        @jakarta.validation.constraints.Size(max = 150) String customerName,
        @jakarta.validation.constraints.Size(max = 20) String customerPhone,
        @jakarta.validation.constraints.Email
        @jakarta.validation.constraints.Size(max = 150) String customerEmail
) {}
