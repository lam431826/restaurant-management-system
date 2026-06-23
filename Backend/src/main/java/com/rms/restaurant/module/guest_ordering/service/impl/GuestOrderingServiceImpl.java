package com.rms.restaurant.module.guest_ordering.service.impl;

import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest;
import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GuestOrderingServiceImpl implements GuestOrderingService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;

    // ── GO-03: Khách quét QR → gọi món ──────────────────────────────────────

    @Override
    public OrderStatusResponse placeOrder(GuestOrderRequest request) {
        RestaurantTable table = resolveTable(request.tableToken());

        // BILLING = đang chờ thanh toán; CLEANING = đang dọn — không thể gọi thêm
        if (table.getStatus() == TableStatus.BILLING || table.getStatus() == TableStatus.CLEANING) {
            throw new ApplicationException(ApplicationError.TABLE_NOT_AVAILABLE);
        }

        Order order = new Order();
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(request.note());
        order.setItems(new ArrayList<>());

        for (var itemReq : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.menuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setMenuItemName(menuItem.getName());
            orderItem.setQuantity(itemReq.quantity());
            orderItem.setUnitPrice(menuItem.getPrice());
            orderItem.setNote(itemReq.note());
            order.getItems().add(orderItem);
        }

        Order saved = orderRepository.save(order);

        // Bàn chuyển sang OCCUPIED khi có đơn gọi món
        if (table.getStatus() != TableStatus.OCCUPIED) {
            table.setStatus(TableStatus.OCCUPIED);
            tableRepository.save(table);
        }

        log.info("GO-03 order {} placed for table '{}' (token={})",
                saved.getId(), table.getName(), request.tableToken());
        return new OrderStatusResponse(saved.getId(), saved.getStatus(), null);
    }

    // ── GO-02: Khách cập nhật items (chỉ khi order còn PENDING) ─────────────

    @Override
    public OrderStatusResponse updateOrderItems(String orderId, UpdateOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION,
                    "Chỉ có thể cập nhật món khi đơn chưa được xác nhận.");
        }

        order.getItems().clear();
        for (var itemReq : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.menuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItemId(menuItem.getId());
            orderItem.setMenuItemName(menuItem.getName());
            orderItem.setQuantity(itemReq.quantity());
            orderItem.setUnitPrice(menuItem.getPrice());
            orderItem.setNote(itemReq.note());
            order.getItems().add(orderItem);
        }

        Order saved = orderRepository.save(order);
        return new OrderStatusResponse(saved.getId(), saved.getStatus(), null);
    }

    @Override
    public OrderStatusResponse getOrderStatus(String tableToken) {
        RestaurantTable table = resolveTable(tableToken);
        return orderRepository.findTopByTableIdAndStatusOrderByCreatedAtDesc(
                        table.getId(), OrderStatus.PENDING)
                .map(o -> new OrderStatusResponse(o.getId(), o.getStatus(), null))
                .orElse(null);
    }

    @Override
    public void requestAssistance(AssistanceRequest request) {
        // GO-05: stub — implement khi cần
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private RestaurantTable resolveTable(String tableToken) {
        return tableRepository.findByQrToken(tableToken)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));
    }
}
