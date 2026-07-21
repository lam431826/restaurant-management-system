package com.rms.restaurant.module.guest_ordering.service.impl;

import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
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
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
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
    private final ReservationRepository reservationRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    // ── GO-03: Khách quét QR → gọi món ──────────────────────────────────────

    @Override
    public OrderStatusResponse placeOrder(GuestOrderRequest request) {
        RestaurantTable table = resolveTable(request.tableToken());

        // BE-TBL-01 fix: BR-07 (a table cannot have two PENDING orders simultaneously) was
        // never checked on the guest-facing create path.
        if (!orderRepository.findByTableIdAndStatus(table.getId(), OrderStatus.PENDING).isEmpty()) {
            throw new ApplicationException(ApplicationError.TABLE_HAS_PENDING_ORDER);
        }

        // If this table is already occupied by a checked-in reservation, link the order/invoice
        // back to the guest who booked it (same as the staff order-create path).
        Reservation activeReservation = reservationRepository
                .findFirstByTableIdAndStatusOrderByDatetimeDesc(table.getId(), ReservationStatus.CHECKED_IN)
                .orElse(null);

        Order order = new Order();
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(request.note());
        if (activeReservation != null) {
            order.setCustomerName(activeReservation.getGuestName());
            order.setCustomerPhone(activeReservation.getPhone());
            order.setCustomerEmail(activeReservation.getGuestEmail());
        }
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
                orderItem.setQrOrder(true);

                order.getItems().add(orderItem);
            });
        }

        // Table may already be OCCUPIED (checked-in reservation) — only flip status/stamp
        // occupiedSince when this QR order is itself seating a fresh walk-in.
        if (table.getStatus() == TableStatus.AVAILABLE) {
            table.setStatus(TableStatus.OCCUPIED);
            table.setOccupiedSince(java.time.LocalDateTime.now());
            tableRepository.save(table);
            realtimeEventPublisher.publishTableStatus(table);
        }

        Order savedOrder = orderRepository.save(order);
        realtimeEventPublisher.publishOrderEvent("ORDER_CREATED", orderMapper.toResponse(savedOrder));
        OrderStatusResponse status = toStatusResponse(savedOrder, null);
        realtimeEventPublisher.publishGuestOrderStatus(status);
        return status;
    }

    // ── GO-02: Khách cập nhật items (chỉ khi order còn PENDING) ─────────────

    @Override
    public OrderStatusResponse updateOrderItems(String orderId, String tableToken, UpdateOrderItemsRequest request) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        verifyOrderBelongsToTable(order, tableToken);
        ensureOrderItemsCanBeModified(order);

        // Allow updates if the order is not closed/cancelled. We will only modify PENDING QR items.
        if (order.getStatus() == OrderStatus.CLOSED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION,
                    "Không thể cập nhật đơn đã đóng hoặc đã hủy.");
        }

        removePendingItemsFromLockedOrder(order);
        appendItems(order, request);

        Order savedOrder = orderRepository.save(order);
        realtimeEventPublisher.publishOrderEvent("ORDER_UPDATED", orderMapper.toResponse(savedOrder));
        OrderStatusResponse status = toStatusResponse(savedOrder, null);
        realtimeEventPublisher.publishGuestOrderStatus(status);
        return status;
    }

    // ── Khách gọi thêm món vào đơn đã có ─────────────────────────────────────

    @Override
    public OrderStatusResponse addOrderItems(String orderId, String tableToken, UpdateOrderItemsRequest request) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        verifyOrderBelongsToTable(order, tableToken);
        ensureOrderItemsCanBeModified(order);

        appendItems(order, request);

        Order savedOrder = orderRepository.save(order);
        realtimeEventPublisher.publishOrderEvent("ORDER_UPDATED", orderMapper.toResponse(savedOrder));
        OrderStatusResponse status = toStatusResponse(savedOrder, null);
        realtimeEventPublisher.publishGuestOrderStatus(status);
        return status;
    }

    @Override
    public OrderStatusResponse getOrderStatus(String orderId, String tableToken) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        verifyOrderBelongsToTable(order, tableToken);
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
        realtimeEventPublisher.publishAssistanceEvent("CREATED", entity);
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
        RestaurantTable table = tableRepository.findByQrToken(tableToken)
                .orElseThrow(() -> new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN));
        // BE-TBL-04 fix: a deactivated table's QR token still resolved successfully, letting
        // guests order/request assistance on a table that's out of service.
        if (!table.isActive()) {
            throw new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN);
        }
        return table;
    }

    /**
     * BE-TBL-02 fix: confirms the presented table token actually resolves to the table that
     * owns this order, before returning/modifying it — previously orderId alone was trusted
     * with no proof of table ownership (IDOR: any guest could act on any other table's order).
     */
    private void verifyOrderBelongsToTable(Order order, String tableToken) {
        RestaurantTable table = resolveTable(tableToken);
        if (!table.getId().equals(order.getTableId())) {
            throw new ApplicationException(ApplicationError.INVALID_TABLE_TOKEN);
        }
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
            orderItem.setQrOrder(true);

            order.getItems().add(orderItem);
        });
    }

    private void removePendingItemsFromLockedOrder(Order order) {
        List<OrderItem> lockedItems = orderItemRepository.findAllByOrderIdForUpdate(order.getId());
        Set<String> pendingItemIds = new HashSet<>();
        for (OrderItem item : lockedItems) {
            if (item.getCookingStatus() == com.rms.restaurant.common.utils.enums.CookingStatus.PENDING && item.isQrOrder()) {
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
