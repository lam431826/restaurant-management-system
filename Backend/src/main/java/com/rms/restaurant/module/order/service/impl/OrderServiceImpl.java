package com.rms.restaurant.module.order.service.impl;

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

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderMapper orderMapper;
    private final com.rms.restaurant.module.order.repository.AssistanceRequestRepository assistanceRequestRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemAllocationRepository invoiceItemAllocationRepository;
    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

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
                tableRepository.save(table);
                realtimeEventPublisher.publishTableStatus(table);
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

        if (!lockedOrderIds.equals(currentOrderIds)
                || !lockedOrders.isEmpty()
                || !table.isActive()
                || table.getStatus() != TableStatus.AVAILABLE) {
            throw new ApplicationException(
                    ApplicationError.TABLE_NOT_AVAILABLE,
                    "Table already has an active order or is no longer available"
            );
        }

        LocalDateTime now = LocalDateTime.now();
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

        table.setStatus(TableStatus.OCCUPIED);
        tableRepository.save(table);
        realtimeEventPublisher.publishTableStatus(table);

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
                tableRepository.save(table);
                realtimeEventPublisher.publishTableStatus(table);
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
        Map<String, Integer> allocationCountByItemId = new HashMap<>();
        for (OrderItem item : payableItems) {
            if (!payableItemIds.add(item.getId())) {
                throw invalidAllocationData();
            }
            allocationCountByItemId.put(item.getId(), 0);
        }

        List<InvoiceItemAllocation> allocations = invoiceItemAllocationRepository
                .findActiveByOrderItemIdsForUpdate(payableItemIds);
        for (InvoiceItemAllocation allocation : allocations) {
            validateCloseAllocation(allocation, payableItemIds, activeInvoiceIds);
            int allocationCount = allocationCountByItemId.merge(allocation.getOrderItemId(), 1, Integer::sum);
            if (allocationCount > 1) {
                throw invalidAllocationData();
            }
        }

        if (allocationCountByItemId.values().stream().anyMatch(count -> count != 1)) {
            throw new ApplicationException(
                    ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close order before every payable item is invoiced"
            );
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
