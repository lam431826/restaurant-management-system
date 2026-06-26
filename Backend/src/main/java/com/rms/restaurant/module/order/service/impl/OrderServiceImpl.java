package com.rms.restaurant.module.order.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.*;
import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.order.mapper.OrderMapper;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final com.rms.restaurant.module.order.repository.AssistanceRequestRepository assistanceRequestRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;

    @Override 
    public PageResponse<OrderResponse> list(Pageable pageable) { 
        Page<OrderResponse> page = orderRepository.findAll(pageable).map(orderMapper::toResponse);
        return PageResponse.of(page);
    }
    @Override 
    public OrderResponse getById(String id) { 
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        return orderMapper.toResponse(order);
    }
    @Override
    public OrderResponse updateStatus(String id, OrderStatus status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        order.setStatus(status);
        if (status == OrderStatus.CLOSED || status == OrderStatus.CANCELLED) {
            RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
            if (table != null) {
                // If this is the only active order, set table to available. We can just check if findTopBy returns this one
                Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                        .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                        .orElse(null);
                if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                    table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                    tableRepository.save(table);
                }
            }
        }
        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override public OrderResponse accept(String id) { 
        return updateStatus(id, OrderStatus.ACCEPTED);
    }
    
    @Override public OrderResponse addItem(String id, com.rms.restaurant.module.order.dto.AddOrderItemRequest request) { return null; }

    @Override
    public OrderResponse removeItem(String orderId, String itemId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        if (order.getItems() != null) {
            order.getItems().removeIf(item -> item.getId().equals(itemId));
        }
        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse create(CreateOrderRequest request) {
        RestaurantTable table = tableRepository.findById(request.tableId())
                .orElseThrow(() -> new ApplicationException(ApplicationError.TABLE_NOT_FOUND));

        Order order = new Order();
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.ACCEPTED); // Cashier creates order, it's already accepted
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
        return orderMapper.toResponse(savedOrder);
    }

    @Override
    public OrderResponse addItems(String id, AddOrderItemsRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

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
        return orderMapper.toResponse(savedOrder);
    }

    @Override
    public OrderResponse updateItemStatus(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemStatusRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        
        boolean found = false;
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getId().equals(itemId)) {
                    item.setCookingStatus(request.status());
                    if (request.status() == com.rms.restaurant.common.utils.enums.CookingStatus.REJECTED) {
                        item.setRejectionNote(request.rejectionNote());
                    }
                    found = true;
                    break;
                }
            }
        }
        
        if (!found) {
            throw new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND); // Reusing error
        }
        
        // Optional: auto-update order status based on items? We'll keep it simple for now or implement if needed.
        Order savedOrder = orderRepository.save(order);
        return orderMapper.toResponse(savedOrder);
    }

    @Override 
    public OrderResponse cancel(String id, CancelOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        
        // If the reason is NOT "Khách không đến", we must check item statuses
        if (!"Khách không đến".equalsIgnoreCase(request.reason().trim()) && !"Khách bỏ về".equalsIgnoreCase(request.reason().trim())) {
            boolean hasNonPending = order.getItems().stream()
                    .anyMatch(item -> item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.PENDING 
                                   && item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.REJECTED);
            if (hasNonPending) {
                throw new ApplicationException(ApplicationError.CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING);
            }
        }
        
        return updateStatus(id, OrderStatus.CANCELLED);
    }
    @Override public void respondAssistance(AssistanceRespondRequest request) {
        com.rms.restaurant.module.order.model.AssistanceRequest entity = assistanceRequestRepository.findById(request.assistanceRequestId()).orElse(null);
        if (entity != null) {
            entity.setResolved(true);
            assistanceRequestRepository.save(entity);
        }
    }
    
    @Override 
    public java.util.List<com.rms.restaurant.module.order.model.AssistanceRequest> getPendingAssistanceRequests() {
        return assistanceRequestRepository.findByResolvedFalse();
    }
}
