package com.rms.restaurant.module.guest_ordering.service;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;

public interface GuestOrderingService {
    OrderStatusResponse placeOrder(GuestOrderRequest request);
    OrderStatusResponse updateOrderItems(String orderId, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request);
    OrderStatusResponse getOrderStatus(String tableToken);
    void requestAssistance(AssistanceRequest request);
}
