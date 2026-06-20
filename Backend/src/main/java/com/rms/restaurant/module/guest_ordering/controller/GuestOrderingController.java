package com.rms.restaurant.module.guest_ordering.controller;

import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rms.restaurant.module.guest_ordering.dto.GuestOrderRequest;
import com.rms.restaurant.module.guest_ordering.dto.OrderStatusResponse;
import com.rms.restaurant.module.guest_ordering.dto.UpdateOrderItemsRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/guest/orders")
@RequiredArgsConstructor
public class GuestOrderingController {
    private final GuestOrderingService guestOrderingService;

    @PostMapping
    public ResponseEntity<OrderStatusResponse> submitOrder(@jakarta.validation.Valid @RequestBody GuestOrderRequest request) {
        return ResponseEntity.ok(guestOrderingService.placeOrder(request));
    }

    @PutMapping("/{id}/items")
    public ResponseEntity<OrderStatusResponse> updateOrderItems(
            @PathVariable String id,
            @jakarta.validation.Valid @RequestBody UpdateOrderItemsRequest request) {
        return ResponseEntity.ok(guestOrderingService.updateOrderItems(id, request));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<OrderStatusResponse> getOrderStatus(@PathVariable String id) {
        return ResponseEntity.ok(guestOrderingService.getOrderStatus(id));
    }
}
