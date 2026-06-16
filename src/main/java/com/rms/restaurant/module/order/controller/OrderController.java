package com.rms.restaurant.module.order.controller;

import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.OrderResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(Pageable pageable) {
        return ResponseEntity.ok(orderService.list(pageable));
    }
}
