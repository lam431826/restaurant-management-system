package com.rms.restaurant.module.guest_ordering.dto;

import com.rms.restaurant.common.utils.enums.OrderStatus;

import com.rms.restaurant.module.order.dto.OrderResponse.ItemLine;
import java.util.List;

public record OrderStatusResponse(String orderId, OrderStatus status, String estimatedTime, List<ItemLine> items) {}
