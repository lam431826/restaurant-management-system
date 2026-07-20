package com.rms.restaurant.module.order.mapper;

import com.rms.restaurant.module.order.dto.OrderResponse;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderMapper {
    private final TableRepository tableRepository;

    public OrderResponse toResponse(Order order) {
        if (order == null) return null;
        
        java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
        java.util.List<OrderResponse.ItemLine> itemLines = new java.util.ArrayList<>();
        
        if (order.getItems() != null) {
            for (com.rms.restaurant.module.order.model.OrderItem item : order.getItems()) {
                itemLines.add(new OrderResponse.ItemLine(
                        item.getId(),
                        item.getMenuItemId(),
                        item.getMenuItemName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getNote(),
                        item.getCookingStatus(),
                        item.getRejectionNote()
                ));
                totalAmount = totalAmount.add(item.getUnitPrice().multiply(java.math.BigDecimal.valueOf(item.getQuantity())));
            }
        }

        String tableName = tableRepository.findById(order.getTableId())
                .map(com.rms.restaurant.module.table.model.RestaurantTable::getName)
                .orElse(order.getTableId());
        
        return new OrderResponse(
                order.getId(),
                order.getTableId(),
                tableName,
                order.getStatus(),
                itemLines,
                totalAmount,
                order.getCreatedAt(),
                order.getCustomerName(),
                order.getCustomerPhone(),
                order.getCustomerEmail()
        );
    }
}
