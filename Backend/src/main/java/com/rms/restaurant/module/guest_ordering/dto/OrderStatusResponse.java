package com.rms.restaurant.module.guest_ordering.dto;

import com.rms.restaurant.common.utils.enums.OrderStatus;

public record OrderStatusResponse(String orderId, OrderStatus status, String estimatedTime) {}
