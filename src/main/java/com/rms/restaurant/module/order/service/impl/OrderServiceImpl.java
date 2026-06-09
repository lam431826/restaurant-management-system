package com.rms.restaurant.module.order.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.*;
import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    @Override public PageResponse<OrderResponse> list(Pageable pageable) { return null; }
    @Override public OrderResponse getById(String id) { return null; }
    @Override public OrderResponse accept(String id) { return null; }
    @Override public OrderResponse addItem(String id, AddOrderItemRequest request) { return null; }
    @Override public OrderResponse cancel(String id, CancelOrderRequest request) { return null; }
    @Override public void respondAssistance(AssistanceRespondRequest request) {}
}
