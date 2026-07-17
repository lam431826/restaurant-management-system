package com.rms.restaurant.module.guest_ordering.service.impl;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.guest_ordering.dto.TableInfoResponse;
import com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest;
import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.mapper.OrderMapper;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.AssistanceRequestRepository;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GuestOrderingServiceImpl implements GuestOrderingService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;
    private final AssistanceRequestRepository assistanceRequestRepository;
    private final OrderMapper orderMapper;
    private final InvoiceRepository invoiceRepository;

    // ── GO-03: Khách quét QR → gọi món ──────────────────────────────────────

    @Override
    public OrderStatusResponse placeOrder(GuestOrderRequest request) {
        RestaurantTable table = resolveTable(request.tableToken());

        Order order = new Order();
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(request.note());
        order.setItems(new ArrayList<>());

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

        table.setStatus(TableStatus.OCCUPIED);
        tableRepository.save(table);

        Order savedOrder = orderRepository.save(order);
        return toStatusResponse(savedOrder, null);
    }

    // ── GO-02: Khách cập nhật items (chỉ khi order còn PENDING) ─────────────

    @Override
    public OrderStatusResponse updateOrderItems(String orderId, UpdateOrderItemsRequest request) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION,
                    "Chỉ có thể cập nhật món khi đơn chưa được xác nhận.");
        }

        removePendingItemsFromLockedOrder(order);
        appendItems(order, request);

        Order savedOrder = orderRepository.save(order);
        return toStatusResponse(savedOrder, null);
    }

    // ── Khách gọi thêm món vào đơn đã có ─────────────────────────────────────

    @Override
    public OrderStatusResponse addOrderItems(String orderId, UpdateOrderItemsRequest request) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        appendItems(order, request);

        Order savedOrder = orderRepository.save(order);
        return toStatusResponse(savedOrder, null);
    }

    @Override
    public OrderStatusResponse getOrderStatus(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        return toStatusResponse(order, "15 minutes");
    }

    @Override
    public void requestAssistance(AssistanceRequest request) {
        RestaurantTable table = resolveTable(request.tableToken());

        com.rms.restaurant.module.order.model.AssistanceRequest entity =
                com.rms.restaurant.module.order.model.AssistanceRequest.builder()
                        .tableId(table.getId())
                        .tableName(table.getName())
                        .message(request.message())
                        .resolved(false)
                        .build();

        assistanceRequestRepository.save(entity);
    }

    @Override
    public TableInfoResponse getTableInfo(String token) {
        RestaurantTable table = resolveTable(token);
        
        String activeOrderId = null;
        java.util.Optional<Order> recentOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId());
        if (recentOrder.isPresent()) {
            Order order = recentOrder.get();
            if (order.getStatus() != OrderStatus.CLOSED && order.getStatus() != OrderStatus.CANCELLED) {
                activeOrderId = order.getId();
            }
        }
        
        return new TableInfoResponse(table.getId(), table.getName(), activeOrderId);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private RestaurantTable resolveTable(String tableToken) {
        return tableRepository.findByQrToken(tableToken)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));
    }

    private void appendItems(Order order, UpdateOrderItemsRequest request) {
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

    private void removePendingItemsFromLockedOrder(Order order) {
        List<OrderItem> lockedItems = orderItemRepository.findAllByOrderIdForUpdate(order.getId());
        Set<String> pendingItemIds = new HashSet<>();
        for (OrderItem item : lockedItems) {
            if (item.getCookingStatus() == com.rms.restaurant.common.utils.enums.CookingStatus.PENDING) {
                pendingItemIds.add(item.getId());
            }
        }
        order.getItems().removeIf(item -> pendingItemIds.contains(item.getId()));
    }

    private void ensureOrderItemsCanBeModified(Order order) {
        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Closed or cancelled order cannot be modified"
            );
        }

        if (invoiceRepository.existsByOrderId(order.getId())) {
            throw new ApplicationException(ApplicationError.ORDER_ALREADY_INVOICED);
        }
    }

    private String normalizeOrderId(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND);
        }
        return orderId.trim();
    }

    private OrderStatusResponse toStatusResponse(Order order, String estimatedTime) {
        return new OrderStatusResponse(
                order.getId(),
                order.getStatus(),
                estimatedTime,
                orderMapper.toResponse(order).items()
        );
    }
}
