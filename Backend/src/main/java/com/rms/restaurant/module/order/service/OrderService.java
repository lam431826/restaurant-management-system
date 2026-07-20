package com.rms.restaurant.module.order.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.*;
import org.springframework.data.domain.Pageable;

public interface OrderService {
    PageResponse<OrderResponse> list(Pageable pageable);
    OrderResponse getById(String id);
    OrderResponse accept(String id);
    OrderResponse updateStatus(String id, com.rms.restaurant.common.utils.enums.OrderStatus status);
    OrderResponse closeOrder(String id);
    OrderResponse addItem(String id, com.rms.restaurant.module.order.dto.AddOrderItemRequest request);
    OrderResponse removeItem(String orderId, String itemId);
    OrderResponse updateItemStatus(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemStatusRequest request);
    OrderResponse updateItemNote(String orderId, String itemId, com.rms.restaurant.module.order.dto.UpdateOrderItemNoteRequest request);
    OrderResponse addItems(String id, AddOrderItemsRequest request);
    OrderResponse create(CreateOrderRequest request);
    OrderResponse updateCustomer(String id, UpdateOrderCustomerRequest request);
    OrderResponse cancel(String id, CancelOrderRequest request);
    void respondAssistance(AssistanceRespondRequest request);
    java.util.List<com.rms.restaurant.module.order.model.AssistanceRequest> getPendingAssistanceRequests();
}
