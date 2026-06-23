package com.rms.restaurant.module.order.controller;

import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Order management là nghiệp vụ của CASHIER và MANAGER.
// WAITER không tham gia vào luồng order — khách tự gọi qua QR.
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CASHIER','MANAGER')")
public class OrderController {
    private final OrderService orderService;
}
