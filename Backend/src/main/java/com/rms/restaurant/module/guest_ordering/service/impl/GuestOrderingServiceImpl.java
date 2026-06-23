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
import com.rms.restaurant.module.order.repository.AssistanceRequestRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class GuestOrderingServiceImpl implements GuestOrderingService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;
    private final AssistanceRequestRepository assistanceRequestRepository;

    @Override
    public OrderStatusResponse placeOrder(GuestOrderRequest request) {
        RestaurantTable table = tableRepository.findByQrToken(request.tableToken())
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));

        Order order = new Order();
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(request.note());
        order.setItems(new java.util.ArrayList<>());

        if (request.items() != null) {
            request.items().forEach(itemRequest -> {
                MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                        .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));
                
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

        table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.OCCUPIED);
        tableRepository.save(table);

        Order savedOrder = orderRepository.save(order);
        java.util.List<com.rms.restaurant.module.order.dto.OrderResponse.ItemLine> itemLines = savedOrder.getItems().stream()
            .map(item -> new com.rms.restaurant.module.order.dto.OrderResponse.ItemLine(
                item.getId(), item.getMenuItemId(), item.getMenuItemName(), item.getQuantity(), item.getUnitPrice(), item.getNote(), item.getCookingStatus()
            )).toList();
        return new OrderStatusResponse(savedOrder.getId(), savedOrder.getStatus(), null, itemLines);
    }

    @Override
    public OrderStatusResponse updateOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION, "Can only update items for pending orders.");
        }

        order.getItems().clear();

        if (request.items() != null) {
            request.items().forEach(itemRequest -> {
                MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                        .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));
                
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
        java.util.List<com.rms.restaurant.module.order.dto.OrderResponse.ItemLine> itemLines = savedOrder.getItems().stream()
            .map(item -> new com.rms.restaurant.module.order.dto.OrderResponse.ItemLine(
                item.getId(), item.getMenuItemId(), item.getMenuItemName(), item.getQuantity(), item.getUnitPrice(), item.getNote(), item.getCookingStatus()
            )).toList();
        return new OrderStatusResponse(savedOrder.getId(), savedOrder.getStatus(), null, itemLines);
    }

    @Override
    public OrderStatusResponse addOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.ACCEPTED && order.getStatus() != OrderStatus.PREPARING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION, "Can only add items to active orders.");
        }

        if (request.items() != null) {
            request.items().forEach(itemRequest -> {
                MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                        .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));
                
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
        java.util.List<com.rms.restaurant.module.order.dto.OrderResponse.ItemLine> itemLines = savedOrder.getItems().stream()
            .map(item -> new com.rms.restaurant.module.order.dto.OrderResponse.ItemLine(
                item.getId(), item.getMenuItemId(), item.getMenuItemName(), item.getQuantity(), item.getUnitPrice(), item.getNote(), item.getCookingStatus()
            )).toList();
        return new OrderStatusResponse(savedOrder.getId(), savedOrder.getStatus(), null, itemLines);
    }

    @Override 
    public OrderStatusResponse getOrderStatus(String orderId) { 
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        java.util.List<com.rms.restaurant.module.order.dto.OrderResponse.ItemLine> itemLines = order.getItems().stream()
            .map(item -> new com.rms.restaurant.module.order.dto.OrderResponse.ItemLine(
                item.getId(), item.getMenuItemId(), item.getMenuItemName(), item.getQuantity(), item.getUnitPrice(), item.getNote(), item.getCookingStatus()
            )).toList();
        return new OrderStatusResponse(order.getId(), order.getStatus(), "15 minutes", itemLines); 
    }
    
    @Override
    public void requestAssistance(AssistanceRequest request) {
        RestaurantTable table = tableRepository.findByQrToken(request.tableToken())
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));

        com.rms.restaurant.module.order.model.AssistanceRequest entity = new com.rms.restaurant.module.order.model.AssistanceRequest();
        entity.setTableId(table.getId());
        entity.setTableName(table.getName());
        entity.setMessage(request.message());
        entity.setResolved(false);
        assistanceRequestRepository.save(entity);
    }
    
    @Override
    public com.rms.restaurant.module.guest_ordering.dto.TableInfoResponse getTableInfo(String token) {
        RestaurantTable table = tableRepository.findByQrToken(token)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));
        return new com.rms.restaurant.module.guest_ordering.dto.TableInfoResponse(table.getId(), table.getName());
    }
}
