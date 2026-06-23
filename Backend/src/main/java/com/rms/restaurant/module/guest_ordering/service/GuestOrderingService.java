package com.rms.restaurant.module.guest_ordering.service;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;

public interface GuestOrderingService {
    OrderStatusResponse placeOrder(GuestOrderRequest request);
    OrderStatusResponse updateOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request);
    OrderStatusResponse addOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request);
    OrderStatusResponse getOrderStatus(String orderId);
    void requestAssistance(AssistanceRequest request);
    com.rms.restaurant.module.guest_ordering.dto.TableInfoResponse getTableInfo(String token);
}
