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
import com.rms.restaurant.module.payment.model.Invoice;
import com.rms.restaurant.module.payment.repository.InvoiceRepository;
import com.rms.restaurant.module.payment.repository.PaymentRepository;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.common.utils.enums.CookingStatus;
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
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

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
        if (status == OrderStatus.CLOSED) {
            return closeOrder(id);
        }
        if (status == OrderStatus.CANCELLED) {
            throw new ApplicationException(
                    ApplicationError.INVALID_STATUS_TRANSITION,
                    "Use /api/orders/{id}/cancel to cancel an order"
            );
        }

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

    @Override
    public OrderResponse closeOrder(String id) {
        Order order = orderRepository.findById(id)
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

        Invoice invoice = invoiceRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.INVOICE_NOT_FOUND));

        if (!invoice.isPaid()) {
            throw new ApplicationException(
                    ApplicationError.ORDER_NOT_CLOSEABLE,
                    "Cannot close order before invoice is paid"
            );
        }

        order.setStatus(OrderStatus.CLOSED);
        RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
        if (table != null) {
            Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                    .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                    .orElse(null);
            if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                tableRepository.save(table);
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
        ensureOrderItemsCanBeModified(order);
        if (order.getItems() != null) {
            OrderItem itemToRemove = null;
            for (OrderItem item : order.getItems()) {
                if (item.getId().equals(itemId)) {
                    validateItemCanBeRemoved(item);
                    itemToRemove = item;
                    break;
                }
            }
            if (itemToRemove != null) {
                order.getItems().remove(itemToRemove);
            }
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
    public OrderResponse updateItemStatus(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemStatusRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND));
        ensureOrderItemsCanBeModified(order);

        OrderItem item = findOrderItem(order, itemId);
        validateItemStatusTransition(item.getCookingStatus(), request.status());
        item.setCookingStatus(request.status());
        if (request.status() == CookingStatus.REJECTED) {
            item.setRejectionNote(request.rejectionNote());
        }
        
        // Optional: auto-update order status based on items? We'll keep it simple for now or implement if needed.
        Order savedOrder = orderRepository.save(order);
        return orderMapper.toResponse(savedOrder);
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
        return (current == CookingStatus.PENDING && next == CookingStatus.COOKING)
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

        if (invoiceRepository.findByOrderId(order.getId()).isPresent()) {
            throw new ApplicationException(ApplicationError.ORDER_ALREADY_INVOICED);
        }
    }

    @Override 
    public OrderResponse cancel(String id, CancelOrderRequest request) {
        Order order = orderRepository.findById(id)
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
        
        boolean hasNonCancellableItem = order.getItems().stream()
                .anyMatch(item -> item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.PENDING
                        && item.getCookingStatus() != com.rms.restaurant.common.utils.enums.CookingStatus.REJECTED);
        if (hasNonCancellableItem) {
            throw new ApplicationException(ApplicationError.CANNOT_CANCEL_ORDER_ITEMS_NOT_PENDING);
        }
        
        order.setStatus(OrderStatus.CANCELLED);
        RestaurantTable table = tableRepository.findById(order.getTableId()).orElse(null);
        if (table != null) {
            Order activeOrder = orderRepository.findTopByTableIdOrderByCreatedAtDesc(table.getId())
                    .filter(o -> o.getStatus() != OrderStatus.CLOSED && o.getStatus() != OrderStatus.CANCELLED)
                    .orElse(null);
            if (activeOrder == null || activeOrder.getId().equals(order.getId())) {
                table.setStatus(com.rms.restaurant.common.utils.enums.TableStatus.AVAILABLE);
                tableRepository.save(table);
            }
        }

        return orderMapper.toResponse(orderRepository.save(order));
    }

    private void validateOrderHasNoInvoiceOrPayment(Order order) {
        java.util.Optional<Invoice> invoiceOpt = invoiceRepository.findByOrderId(order.getId());
        if (invoiceOpt.isEmpty()) {
            return;
        }

        Invoice invoice = invoiceOpt.get();
        if (invoice.isPaid()) {
            throw new ApplicationException(
                    ApplicationError.CANNOT_CANCEL_PAID_ORDER,
                    "Cannot cancel an order with a paid invoice"
            );
        }

        boolean hasPaidPayment = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .anyMatch(payment -> "PAID".equals(payment.getStatus()));
        if (hasPaidPayment) {
            throw new ApplicationException(
                    ApplicationError.CANNOT_CANCEL_PAID_ORDER,
                    "Cannot cancel an order with a paid payment"
            );
        }

        throw new ApplicationException(
                ApplicationError.CANNOT_CANCEL_INVOICED_ORDER,
                "Cannot cancel an order after invoice has been created"
        );
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
