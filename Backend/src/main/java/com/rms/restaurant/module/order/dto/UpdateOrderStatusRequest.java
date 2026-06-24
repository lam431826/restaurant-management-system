package com.rms.restaurant.module.order.dto;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull(message = "Order status cannot be null")
        OrderStatus status
) {}
