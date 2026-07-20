package com.rms.restaurant.module.order.repository;

import com.rms.restaurant.module.order.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, String> {
    List<OrderItem> findByOrderId(String orderId);
    List<OrderItem> findByOrderIdIn(List<String> orderIds);
    boolean existsByMenuItemId(String menuItemId);
}
