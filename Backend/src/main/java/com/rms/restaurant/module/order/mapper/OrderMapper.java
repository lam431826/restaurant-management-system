package com.rms.restaurant.module.order.mapper;

import com.rms.restaurant.module.order.dto.OrderResponse;
import com.rms.restaurant.module.order.model.Order;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {
    public OrderResponse toResponse(Order order) { return null; }
}
