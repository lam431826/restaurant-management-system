package com.rms.restaurant.module.order.mapper;

import com.rms.restaurant.module.order.dto.OrderResponse;
import com.rms.restaurant.module.order.model.Order;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {
    public OrderResponse toResponse(Order order) {
        if (order == null) return null;
        
        java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
        java.util.List<OrderResponse.ItemLine> itemLines = new java.util.ArrayList<>();
        
        if (order.getItems() != null) {
            for (com.rms.restaurant.module.order.model.OrderItem item : order.getItems()) {
                itemLines.add(new OrderResponse.ItemLine(
                        item.getMenuItemId(),
                        item.getMenuItemName(),
                        item.getQuantity(),
                        item.getUnitPrice()
                ));
                totalAmount = totalAmount.add(item.getUnitPrice().multiply(java.math.BigDecimal.valueOf(item.getQuantity())));
            }
        }
        
        return new OrderResponse(
                order.getId(),
                order.getTableId(),
                order.getStatus(),
                itemLines,
                totalAmount,
                order.getCreatedAt()
        );
    }
}
