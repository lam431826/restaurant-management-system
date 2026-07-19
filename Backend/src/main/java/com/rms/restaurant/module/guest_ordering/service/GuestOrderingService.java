package com.rms.restaurant.module.guest_ordering.service;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;

public interface GuestOrderingService {
    OrderStatusResponse placeOrder(GuestOrderRequest request);
    // BE-TBL-02 fix: tableToken is now required and verified against the order's own table,
    // closing an IDOR where any orderId alone was accepted with no proof of table ownership.
    OrderStatusResponse updateOrderItems(String orderId, String tableToken, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request);
    OrderStatusResponse addOrderItems(String orderId, String tableToken, com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest request);
    OrderStatusResponse getOrderStatus(String orderId, String tableToken);
    void requestAssistance(AssistanceRequest request);
    com.rms.restaurant.module.guest_ordering.dto.TableInfoResponse getTableInfo(String token);
}
