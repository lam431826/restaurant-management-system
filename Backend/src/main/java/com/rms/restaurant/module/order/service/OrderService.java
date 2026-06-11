package com.rms.restaurant.module.order.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.*;
import org.springframework.data.domain.Pageable;

public interface OrderService {
    PageResponse<OrderResponse> list(Pageable pageable);
    OrderResponse getById(String id);
    OrderResponse accept(String id);
    OrderResponse addItem(String id, AddOrderItemRequest request);
    OrderResponse cancel(String id, CancelOrderRequest request);
    void respondAssistance(AssistanceRespondRequest request);
}
