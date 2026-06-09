package com.rms.restaurant.module.guest_ordering.service.impl;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class GuestOrderingServiceImpl implements GuestOrderingService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;

    @Override
    public OrderStatusResponse placeOrder(GuestOrderRequest request) {
        Order order = new Order();
        order.setTableId(request.tableId());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(request.note());
        order.setItems(new java.util.ArrayList<>());

        if (request.items() != null) {
            request.items().forEach(itemRequest -> {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new com.rms.restaurant.common.utils.exception.ResourceNotFoundException(com.rms.restaurant.common.utils.exception.ApplicationError.MENU_ITEM_NOT_FOUND));
            
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setMenuItemName(menuItem.getName());
            orderItem.setQuantity(itemRequest.quantity());
            orderItem.setUnitPrice(menuItem.getPrice());
            orderItem.setNote(itemRequest.note());
            
            order.getItems().add(orderItem);
        });
        }

        Order savedOrder = orderRepository.save(order);
        return new OrderStatusResponse(savedOrder.getId(), savedOrder.getStatus(), null);
    }

    @Override
    public OrderStatusResponse updateOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new com.rms.restaurant.common.utils.exception.ResourceNotFoundException(com.rms.restaurant.common.utils.exception.ApplicationError.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new com.rms.restaurant.common.utils.exception.ApplicationException(com.rms.restaurant.common.utils.exception.ApplicationError.INVALID_STATUS_TRANSITION, "Can only update items for pending orders.");
        }

        order.getItems().clear();

        request.items().forEach(itemRequest -> {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new com.rms.restaurant.common.utils.exception.ResourceNotFoundException(com.rms.restaurant.common.utils.exception.ApplicationError.MENU_ITEM_NOT_FOUND));
            
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setMenuItemName(menuItem.getName());
            orderItem.setQuantity(itemRequest.quantity());
            orderItem.setUnitPrice(menuItem.getPrice());
            orderItem.setNote(itemRequest.note());
            
            order.getItems().add(orderItem);
        });

        Order savedOrder = orderRepository.save(order);
        return new OrderStatusResponse(savedOrder.getId(), savedOrder.getStatus(), null);
    }

    @Override public OrderStatusResponse getOrderStatus(String tableToken) { return null; }
    @Override public void requestAssistance(AssistanceRequest request) {}
}
