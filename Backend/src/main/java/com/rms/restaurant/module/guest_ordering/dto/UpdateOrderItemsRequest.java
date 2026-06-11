package com.rms.restaurant.module.guest_ordering.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record
UpdateOrderItemsRequest(
        @NotEmpty List<GuestOrderItemRequest> items
) {}
