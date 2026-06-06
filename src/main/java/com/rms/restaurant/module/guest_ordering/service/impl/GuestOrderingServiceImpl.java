package com.rms.restaurant.module.guest_ordering.service.impl;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GuestOrderingServiceImpl implements GuestOrderingService {

    @Override public OrderStatusResponse placeOrder(GuestOrderRequest request) { return null; }
    @Override public OrderStatusResponse getOrderStatus(String tableToken) { return null; }
    @Override public void requestAssistance(AssistanceRequest request) {}
}
