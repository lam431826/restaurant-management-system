package com.rms.restaurant.module.guest_ordering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record GuestOrderRequest(
        @NotBlank String tableToken,
        @NotEmpty List<GuestOrderItemRequest> items,
        String note
) {}
