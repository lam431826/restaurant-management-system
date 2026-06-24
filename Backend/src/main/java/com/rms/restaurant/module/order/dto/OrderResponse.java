package com.rms.restaurant.module.order.dto;

import com.rms.restaurant.common.utils.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        String id,
        String tableId,
        String tableName,
        OrderStatus status,
        List<ItemLine> items,
        BigDecimal totalAmount,
        LocalDateTime createdAt
) {
    public record ItemLine(String orderItemId, String menuItemId, String menuItemName, int quantity, BigDecimal unitPrice, String note, com.rms.restaurant.common.utils.enums.CookingStatus cookingStatus, String rejectionNote) {}
}
