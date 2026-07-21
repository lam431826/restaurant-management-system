package com.rms.restaurant.module.order.service.impl;

import com.rms.restaurant.common.codegen.BusinessCodeGenerator;
import com.rms.restaurant.common.realtime.RealtimeEventPublisher;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.*;
import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.order.repository.OrderItemRepository;
import com.rms.restaurant.module.order.mapper.OrderMapper;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.table.repository.TableRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.model.InvoiceItemAllocation;
import com.rms.restaurant.module.payment.repository.InvoiceItemAllocationRepository;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.ReservationStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.exception.ResourceNotFoundException;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.reservation.model.Reservation;
import com.rms.restaurant.module.reservation.repository.ReservationRepository;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final List<OrderStatus> TERMINAL_ORDER_STATUSES =
            List.of(OrderStatus.CLOSED, OrderStatus.CANCELLED);
    private static final List<ReservationStatus> SCHEDULED_BLOCKING_RESERVATION_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
    private static final int RESERVATION_WINDOW_BEFORE_MINUTES = 60;
    private static final int RESERVATION_WINDOW_AFTER_MINUTES = 120;
    private static final int WALK_IN_ON_RESERVED_MIN_GAP_MINUTES = 120;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderMapper orderMapper;
    private final com.rms.restaurant.module.order.repository.AssistanceRequestRepository assistanceRequestRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final com.rms.restaurant.module.reservation.service.ReservationService reservationService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final BusinessCodeGenerator businessCodeGenerator;

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

    /**
     * Stores the customer contact a cashier captured for this order. Contact details are
     * descriptive only — they never affect order status, pricing or payment validation.
     * A blank value clears the field so a mistyped entry can be removed.
     */
    @Override
    @Transactional
    public OrderResponse updateCustomer(String id, UpdateOrderCustomerRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        order.setCustomerName(trimToNull(request.customerName()));
        order.setCustomerPhone(trimToNull(request.customerPhone()));
        order.setCustomerEmail(trimToNull(request.customerEmail()));

        return orderMapper.toResponse(orderRepository.save(order));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null ? preferred : fallback;
    }

    @Override
    public OrderResponse updateStatus(String id, OrderStatus status) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        if (status == null) {
            throw new ApplicationException(ApplicationError.INVALID_STATUS_TRANSITION);
        }

        OrderStatus currentStatus = order.getStatus();
        if (currentStatus == status) {
            return orderMapper.toResponse(order);
        }

        if (status == OrderStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Use /api/orders/{id}/cancel to cancel an order"
            );
        }
        if (status == OrderStatus.CLOSED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Use /api/orders/{id}/close to close an order"
            );
        }

        validateGenericStatusTransition(currentStatus, status);
        order.setStatus(status);
        return orderMapper.toResponse(orderRepository.save(order));
    }

    private void validateGenericStatusTransition(OrderStatus currentStatus, OrderStatus requestedStatus) {
        if (currentStatus == OrderStatus.CLOSED || currentStatus == OrderStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Closed and cancelled orders are terminal"
            );
        }

        boolean allowed = (currentStatus == OrderStatus.PENDING && requestedStatus == OrderStatus.ACCEPTED)
                || (currentStatus == OrderStatus.ACCEPTED && requestedStatus == OrderStatus.PREPARING)
                || (currentStatus == OrderStatus.PREPARING && requestedStatus == OrderStatus.SERVED);

        if (!allowed) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Order status transition from " + currentStatus + " to " + requestedStatus + " is not allowed"
            );
        }
    }

    @Override
    public OrderResponse closeOrder(String id) {
        String orderId = normalizeOrderId(id);
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));

        if (order.getStatus() == OrderStatus.CLOSED) {
            return orderMapper.toResponse(order);
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cancelled order cannot be closed"
            );
        }

        List<OrderItem> orderItems = orderItemRepository.findAllByOrderIdForUpdate(orderId);
        List<OrderItem> payableItems = validateOrderItemsForClose(order, orderItems);

        List<Invoice> activeInvoices = invoiceRepository
                .findByOrderIdAndStatusOrderByCreatedAtAscIdAsc(orderId, InvoiceStatus.ACTIVE);
        if (activeInvoices.isEmpty()) {
            throw new ApplicationException(
                    ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close order without an active invoice"
            );
        }

        Set<String> activeInvoiceIds = validateActiveInvoices(order, activeInvoices);

        if (activeInvoices.stream().anyMatch(invoice -> !invoice.isPaid())) {
            throw new ApplicationException(
                    ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close order before all active invoices are paid"
            );
        }

        validateCloseAllocationCoverage(payableItems, activeInvoiceIds);

        order.setStatus(OrderStatus.CLOSED);
        RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
        if (table != null) {
            Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                    .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                    .orElse(null);
            if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                table.setOccupiedSince(null);
                tableRepository.save(table);
                realtimeEventPublisher.publishTableStatus(table);
                // Bug: a reservation's stay was left CHECKED_IN forever after payment, which
                // permanently blocked the table for future orders/reservations (see
                // ReservationRepository.findBlockingForTablesForUpdate — it treats any
                // CHECKED_IN row as blocking with no time window).
                reservationService.completeStayForTable(table.getId());
            }
        }
        // Auto-cancel any remaining PENDING orders for this table (BR-QR-09)
        List<Order> pendingOrdersForTable = orderRepository.findByTableIdAndStatus(order.getTableId(), OrderStatus.PENDING);
        for (Order po : pendingOrdersForTable) {
            po.setStatus(OrderStatus.CANCELLED);
            if (po.getItems() != null) {
                for (OrderItem item : po.getItems()) {
                    if (item.getCookingStatus() == CookingStatus.PENDING) {
                        item.setCookingStatus(CookingStatus.REJECTED);
                        item.setRejectionNote("Hệ thống tự động hủy do bàn thanh toán");
                    }
                }
            }
            orderRepository.save(po);
        }

        OrderResponse response = orderMapper.toResponse(orderRepository.save(order));
        realtimeEventPublisher.publishOrderEvent("ORDER_CLOSED", response);
        realtimeEventPublisher.publishGuestOrderStatus(response);
        return response;
    }

    @Override
    public OrderResponse accept(String id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.ACCEPTED);
        }
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getCookingStatus() == CookingStatus.PENDING) {
                    item.setCookingStatus(CookingStatus.COOKING);
                }
            }
        }
        OrderResponse response = orderMapper.toResponse(orderRepository.save(order));
        realtimeEventPublisher.publishOrderEvent("ORDER_ACCEPTED", response);
        realtimeEventPublisher.publishGuestOrderStatus(response);
        return response;
    }

    @Override public OrderResponse addItem(String id, com.rms.restaurant.module.order.dto.AddOrderItemRequest request) { return null; }

    @Override
    public OrderResponse removeItem(String orderId, String itemId) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        OrderItem itemToRemove = findOwnedOrderItemForUpdate(order, itemId);
        if (itemToRemove != null) {
            validateItemCanBeRemoved(itemToRemove);
            if (itemToRemove.getQuantity() > 1) {
                itemToRemove.setQuantity(itemToRemove.getQuantity() - 1);
            } else {
                order.getItems().remove(itemToRemove);
            }
        }
        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse purgeItem(String orderId, String itemId) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        OrderItem itemToRemove = findOwnedOrderItemForUpdate(order, itemId);
        if (itemToRemove != null) {
            validateItemCanBeRemoved(itemToRemove);
            order.getItems().remove(itemToRemove);
        }

        if (order.getItems().isEmpty() && order.getStatus() == com.rms.restaurant.common.utils.enums.OrderStatus.PENDING) {
            order.setStatus(com.rms.restaurant.common.utils.enums.OrderStatus.CANCELLED);

            RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
            if (table != null) {
                Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                        .filter(o -> o.getStatus() != com.rms.restaurant.common.utils.enums.OrderStatus.CLOSED && o.getStatus() != com.rms.restaurant.common.utils.enums.OrderStatus.CANCELLED)
                        .orElse(null);
                if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                    table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                    tableRepository.save(table);
                    realtimeEventPublisher.publishTableStatus(table);
                }
            }
        }

        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse create(CreateOrderRequest request) {
        String tableId = request.tableId().trim();
        List<String> tableIds = List.of(tableId);

        List<Order> lockedOrders = orderRepository.findActiveByTableIdsForUpdate(
                tableIds,
                TERMINAL_ORDER_STATUSES
        );
        List<RestaurantTable> lockedTables = tableRepository.findAllByIdInForUpdate(tableIds);
        RestaurantTable table = lockedTables.stream()
                .filter(candidate -> candidate.getId().equals(tableId))
                .findFirst()
                .orElseThrow(() -> new ApplicationException(ApplicationError.TABLE_NOT_FOUND));

        List<String> revalidatedOrderIds = orderRepository.findActiveIdsByTableIds(
                tableIds,
                TERMINAL_ORDER_STATUSES
        );
        List<String> lockedOrderIds = lockedOrders.stream().map(Order::getId).sorted().toList();
        List<String> currentOrderIds = revalidatedOrderIds.stream().distinct().sorted().toList();

        // A table can start an order from AVAILABLE (fresh walk-in), OCCUPIED (already checked
        // in — reservation guest, or a walk-in check-in via PATCH /api/tables/{id}/status), or
        // RESERVED (seating a walk-in ahead of an upcoming reservation, only if that reservation
        // is far enough out — checked below). BILLING/CLEANING still block: the previous
        // occupancy hasn't been fully wound down.
        if (!lockedOrderIds.equals(currentOrderIds)
                || !lockedOrders.isEmpty()
                || !table.isActive()
                || (table.getStatus() != TableStatus.AVAILABLE
                    && table.getStatus() != TableStatus.OCCUPIED
                    && table.getStatus() != TableStatus.RESERVED)) {
            throw new ApplicationException(
                    ApplicationError.TABLE_NOT_AVAILABLE,
                    "Table already has an active order or is no longer available"
            );
        }

        LocalDateTime now = LocalDateTime.now();
        // Seating a walk-in on a RESERVED table is only safe if the walk-in's dining (90 min) +
        // cleanup (30 min) window fully clears before the reservation is due — mirrors
        // ReservationServiceImpl.validateWalkInCooldown()'s cooldown, applied in reverse.
        if (table.getStatus() == TableStatus.RESERVED) {
            Reservation nextReservation = reservationRepository
                    .findFirstByTableIdAndStatusOrderByDatetimeAsc(tableId, ReservationStatus.CONFIRMED)
                    .orElse(null);
            if (nextReservation == null
                    || nextReservation.getDatetime().isBefore(now.plusMinutes(WALK_IN_ON_RESERVED_MIN_GAP_MINUTES))) {
                throw new ApplicationException(
                        ApplicationError.TABLE_NOT_AVAILABLE,
                        "Table's next reservation is too soon to seat a walk-in"
                );
            }
        }
        // Only guard against a blocking PENDING/CONFIRMED/CHECKED_IN reservation when seating a
        // fresh walk-in on an AVAILABLE table — this protects an upcoming reservation's table
        // from being taken by an unrelated walk-in order. Once the table is already OCCUPIED,
        // that occupancy already went through its own valid transition (reservation check-in or
        // walk-in check-in), so this order belongs to whoever is already seated there; re-running
        // the CHECKED_IN check here would incorrectly block a checked-in reservation's own first
        // order (it always finds its own row).
        if (table.getStatus() == TableStatus.AVAILABLE) {
            boolean hasBlockingReservation = !reservationRepository.findBlockingForTablesForUpdate(
                    tableIds,
                    ReservationStatus.CHECKED_IN,
                    SCHEDULED_BLOCKING_RESERVATION_STATUSES,
                    now.minusMinutes(RESERVATION_WINDOW_BEFORE_MINUTES),
                    now.plusMinutes(RESERVATION_WINDOW_AFTER_MINUTES)
            ).isEmpty();
            if (hasBlockingReservation) {
                throw new ApplicationException(
                        ApplicationError.TABLE_NOT_AVAILABLE,
                        "Table has a blocking reservation for the current service time"
                );
            }
        }

        // If this table is already occupied by a checked-in reservation, default the order's
        // customer contact to the reservation's guest info so the order/invoice stay linked to
        // who actually booked — the cashier's explicit input (if any) still wins.
        Reservation activeReservation = reservationRepository
                .findFirstByTableIdAndStatusOrderByDatetimeDesc(table.getId(), ReservationStatus.CHECKED_IN)
                .orElse(null);

        Order order = new Order();
        order.setCode(businessCodeGenerator.nextOrderCode());
        order.setTableId(table.getId());
        order.setStatus(OrderStatus.ACCEPTED); // Cashier creates order, it's already accepted
        order.setNote(request.note());
        // Optional contact the cashier typed before the order existed. Purely descriptive,
        // so it is applied after every table/reservation check has already passed.
        order.setCustomerName(firstNonBlank(trimToNull(request.customerName()),
                activeReservation != null ? activeReservation.getGuestName() : null));
        order.setCustomerPhone(firstNonBlank(trimToNull(request.customerPhone()),
                activeReservation != null ? activeReservation.getPhone() : null));
        order.setCustomerEmail(firstNonBlank(trimToNull(request.customerEmail()),
                activeReservation != null ? activeReservation.getGuestEmail() : null));
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

        // Table may already be OCCUPIED (checked-in reservation, or a prior walk-in check-in) —
        // only flip status/stamp occupiedSince when this order is the one seating a fresh walk-in
        // (from AVAILABLE, or from RESERVED per the far-enough-gap check above).
        if (table.getStatus() == TableStatus.AVAILABLE || table.getStatus() == TableStatus.RESERVED) {
            table.setStatus(TableStatus.OCCUPIED);
            table.setOccupiedSince(now);
            tableRepository.save(table);
            realtimeEventPublisher.publishTableStatus(table);
        }

        Order savedOrder = orderRepository.save(order);
        OrderResponse response = orderMapper.toResponse(savedOrder);
        realtimeEventPublisher.publishOrderEvent("ORDER_CREATED", response);
        return response;
    }

    @Override
    public OrderResponse addItems(String id, AddOrderItemsRequest request) {
        String orderId = normalizeOrderId(id);
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

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
    public OrderResponse updateItemNote(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemNoteRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        OrderItem item = findOrderItem(order, itemId);
        if (item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.PENDING) {
            throw new com.rms.restaurant.common.utils.exception.ApplicationException(ApplicationError.ORDER_ITEM_NOTE_NOT_ALLOWED);
        }
        item.setNote(request.note());

        Order savedOrder = orderRepository.save(order);
        return orderMapper.toResponse(savedOrder);
    }

    @Override
    public OrderResponse updateItemStatus(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemStatusRequest request) {
        String normalizedOrderId = normalizeOrderId(orderId);
        Order order = orderRepository.findByIdForUpdate(normalizedOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        OrderItem item = findOwnedOrderItemForUpdate(order, itemId);
        if (item == null) {
            throw new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND);
        }
        validateItemStatusTransition(item.getCookingStatus(), request.status());
        item.setCookingStatus(request.status());
        if (request.status() == CookingStatus.REJECTED) {
            item.setRejectionNote(request.rejectionNote());
        }

        // Optional: auto-update order status based on items? We'll keep it simple for now or implement if needed.
        Order savedOrder = orderRepository.save(order);
        OrderResponse response = orderMapper.toResponse(savedOrder);
        realtimeEventPublisher.publishOrderEvent("ITEM_STATUS_CHANGED", response);
        realtimeEventPublisher.publishGuestOrderStatus(response);
        return response;
    }

    private OrderItem findOwnedOrderItemForUpdate(Order order, String itemId) {
        OrderItem item = orderItemRepository.findByIdForUpdate(itemId).orElse(null);
        if (item == null
                || item.getOrder() == null
                || !order.getId().equals(item.getOrder().getId())) {
            return null;
        }
        return item;
    }

    private OrderItem findOrderItem(Order order, String itemId) {
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getId().equals(itemId)) {
                    return item;
                }
            }
        }
        throw new ResourceNotFoundException(ApplicationError.MENU_ITEM_NOT_FOUND); // Reusing existing project error
    }

    private void validateItemCanBeRemoved(OrderItem item) {
        if (item.getCookingStatus() != CookingStatus.PENDING) {
            throw new ApplicationException(ApplicationError.ORDER_ITEM_REMOVE_NOT_ALLOWED);
        }
    }

    private void validateItemStatusTransition(CookingStatus current, CookingStatus next) {
        if (next == null || isTerminalItemStatus(current)) {
            throw new ApplicationException(ApplicationError.ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED);
        }

        if (current == next) {
            return;
        }

        if (!isAllowedItemStatusTransition(current, next)) {
            throw new ApplicationException(ApplicationError.ORDER_ITEM_STATUS_TRANSITION_NOT_ALLOWED);
        }
    }

    private boolean isTerminalItemStatus(CookingStatus status) {
        return status == CookingStatus.SERVED || status == CookingStatus.REJECTED;
    }

    private boolean isAllowedItemStatusTransition(CookingStatus current, CookingStatus next) {
        return (current == CookingStatus.PENDING && (next == CookingStatus.COOKING || next == CookingStatus.REJECTED))
                || (current == CookingStatus.COOKING && (next == CookingStatus.READY || next == CookingStatus.REJECTED))
                || (current == CookingStatus.READY && next == CookingStatus.SERVED);
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

    @Override
    public OrderResponse cancel(String id, CancelOrderRequest request) {
        String orderId = normalizeOrderId(id);
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return orderMapper.toResponse(order);
        }
        if (order.getStatus() == OrderStatus.CLOSED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Closed order cannot be cancelled"
            );
        }
        validateOrderHasNoInvoiceOrPayment(order);

        List<OrderItem> orderItems = orderItemRepository.findAllByOrderIdForUpdate(orderId);
        boolean hasNonCancellableItem = orderItems.stream()
                .anyMatch(item -> item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.PENDING
                        && item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.REJECTED);
        if (hasNonCancellableItem) {
            throw new ApplicationException(ApplicationError.CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING);
        }

        order.setStatus(OrderStatus.CANCELLED);
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getCookingStatus() == CookingStatus.PENDING) {
                    item.setCookingStatus(CookingStatus.REJECTED);
                    item.setRejectionNote("Thu ngân hủy đơn");
                }
            }
        }
        RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
        if (table != null) {
            Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                    .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                    .orElse(null);
            if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                table.setOccupiedSince(null);
                tableRepository.save(table);
                realtimeEventPublisher.publishTableStatus(table);
                reservationService.completeStayForTable(table.getId());
            }
        }

        OrderResponse response = orderMapper.toResponse(orderRepository.save(order));
        realtimeEventPublisher.publishOrderEvent("ORDER_CANCELLED", response);
        realtimeEventPublisher.publishGuestOrderStatus(response);
        return response;
    }

    private void validateOrderHasNoInvoiceOrPayment(Order order) {
        List<Invoice> invoices = invoiceRepository.findByOrderIdOrderByCreatedAtDescIdDesc(order.getId());
        if (invoices.isEmpty()) {
            return;
        }

        boolean hasPaidInvoice = invoices.stream().anyMatch(Invoice::isPaid);
        List<String> invoiceIds = invoices.stream().map(Invoice::getId).toList();
        boolean hasPaidPayment = !invoiceIds.isEmpty()
                && paymentRepository.existsByInvoiceIdInAndStatus(invoiceIds, "PAID");
        if (hasPaidInvoice || hasPaidPayment) {
            throw new ApplicationException(
                    ApplicationError.CANNOT_CANCEL_PAID_ORDER,
                    "Cannot cancel an order with paid invoice or payment history"
            );
        }

        throw new ApplicationException(
                ApplicationError.CANNOT_CANCEL_INVOICED_ORDER,
                "Cannot cancel an order after invoice has been created"
        );
    }

    private String normalizeOrderId(String id) {
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND);
        }
        return id.trim();
    }

    private List<OrderItem> validateOrderItemsForClose(Order order, List<OrderItem> orderItems) {
        List<OrderItem> payableItems = new ArrayList<>();
        for (OrderItem item : orderItems) {
            validateCloseOrderItemIdentity(order, item);

            CookingStatus status = item.getCookingStatus();
            if (status == null) {
                throw invalidAllocationData();
            }
            if (status == CookingStatus.PENDING || status == CookingStatus.COOKING) {
                throw new ApplicationException(ApplicationError.ORDER_NOT_CLOSEABLE);
            }
            if (status == CookingStatus.READY || status == CookingStatus.SERVED) {
                payableItems.add(item);
            }
        }

        if (payableItems.isEmpty()) {
            throw new ApplicationException(ApplicationError.ORDER_NOT_CLOSEABLE);
        }
        return payableItems;
    }

    private void validateCloseOrderItemIdentity(Order order, OrderItem item) {
        if (item == null
                || item.getId() == null
                || item.getId().isBlank()
                || item.getOrder() == null
                || !order.getId().equals(item.getOrder().getId())) {
            throw invalidAllocationData();
        }
    }

    private Set<String> validateActiveInvoices(Order order, List<Invoice> activeInvoices) {
        Set<String> activeInvoiceIds = new HashSet<>();
        for (Invoice invoice : activeInvoices) {
            if (invoice == null
                    || invoice.getId() == null
                    || invoice.getId().isBlank()
                    || !order.getId().equals(invoice.getOrderId())
                    || invoice.getStatus() != InvoiceStatus.ACTIVE
                    || !activeInvoiceIds.add(invoice.getId())) {
                throw invalidAllocationData();
            }
        }
        return activeInvoiceIds;
    }

    private void validateCloseAllocationCoverage(
            List<OrderItem> payableItems,
            Set<String> activeInvoiceIds
    ) {
        Set<String> payableItemIds = new HashSet<>();
        Map<String, Integer> orderedQuantityByItemId = new HashMap<>();
        Map<String, Integer> allocatedQuantityByItemId = new HashMap<>();
        for (OrderItem item : payableItems) {
            if (!payableItemIds.add(item.getId())) {
                throw invalidAllocationData();
            }
            orderedQuantityByItemId.put(item.getId(), item.getQuantity());
            allocatedQuantityByItemId.put(item.getId(), 0);
        }

        // Coverage is counted in units, not allocation rows. Since partial-quantity split
        // (V41), one order item can legitimately be spread across several ACTIVE invoices —
        // e.g. 2 units left on the source and 1 unit on a split child — so "exactly one active
        // allocation per item" is no longer the invariant. What must hold is that every
        // ordered unit is billed exactly once across the order's ACTIVE invoices.
        //
        // Per-invoice uniqueness is still enforced by uq_iia_active_invoice_order_item, and
        // validateCloseAllocation already rejects any allocation pointing outside this order's
        // ACTIVE invoices, so summing here cannot silently absorb a foreign allocation.
        List<InvoiceItemAllocation> allocations = invoiceItemAllocationRepository
                .findActiveByOrderItemIdsForUpdate(payableItemIds);
        for (InvoiceItemAllocation allocation : allocations) {
            validateCloseAllocation(allocation, payableItemIds, activeInvoiceIds);
            allocatedQuantityByItemId.merge(
                    allocation.getOrderItemId(), allocation.getAllocatedQuantity(), Integer::sum);
        }

        for (Map.Entry<String, Integer> ordered : orderedQuantityByItemId.entrySet()) {
            int allocated = allocatedQuantityByItemId.getOrDefault(ordered.getKey(), 0);
            // Over-allocation is a data-integrity failure, not a "not ready to close" state.
            if (allocated > ordered.getValue()) {
                throw invalidAllocationData();
            }
            if (allocated < ordered.getValue()) {
                throw new ApplicationException(
                        ApplicationError.ORDER_NOT_CLOSEABLE,
                        "Cannot close order before every payable item is invoiced"
                );
            }
        }
    }

    private void validateCloseAllocation(
            InvoiceItemAllocation allocation,
            Set<String> payableItemIds,
            Set<String> activeInvoiceIds
    ) {
        if (allocation == null
                || allocation.getId() == null
                || allocation.getId().isBlank()
                || allocation.getOrderItemId() == null
                || allocation.getOrderItemId().isBlank()
                || allocation.getInvoiceId() == null
                || allocation.getInvoiceId().isBlank()
                || !allocation.isActive()
                || allocation.getAllocatedQuantity() <= 0
                || allocation.getUnitPriceSnapshot() == null
                || allocation.getUnitPriceSnapshot().compareTo(BigDecimal.ZERO) <= 0
                || !payableItemIds.contains(allocation.getOrderItemId())
                || !activeInvoiceIds.contains(allocation.getInvoiceId())) {
            throw invalidAllocationData();
        }
    }

    private ApplicationException invalidAllocationData() {
        return new ApplicationException(ApplicationError.INVOICE_ALLOCATION_DATA_INVALID);
    }

    @Override public void respondAssistance(AssistanceRespondRequest request) {
        com.rms.restaurant.module.order.model.AssistanceRequest entity = assistanceRequestRepository.findById(request.assistanceRequestId()).orElse(null);
        if (entity != null) {
            entity.setResolved(true);
            assistanceRequestRepository.save(entity);
            realtimeEventPublisher.publishAssistanceEvent("RESOLVED", entity);
        }
    }

    @Override
    public java.util.List<com.rms.restaurant.module.order.model.AssistanceRequest> getPendingAssistanceRequests() {
        return assistanceRequestRepository.findByResolvedFalse();
    }
}
