    package com.rms.restaurant.module.order.controller;

import com.rms.restaurant.module.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.order.dto.OrderResponse;
import com.rms.restaurant.module.order.dto.AssistanceRespondRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CASHIER')")
public class OrderController {
    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getOrders(Pageable pageable) {
        return ResponseEntity.ok(orderService.list(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getById(id));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<OrderResponse> acceptOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.accept(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(@PathVariable String id, @RequestBody com.rms.restaurant.module.order.dto.UpdateOrderStatusRequest request) {
        return ResponseEntity.ok(orderService.updateStatus(id, request.status()));
    }
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody com.rms.restaurant.module.order.dto.CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(orderService.create(request, principal.getUsername()));
    }

    /** Customer contact for the receipt and the invoice email. Descriptive data only. */
    @PutMapping("/{id}/customer")
    public ResponseEntity<OrderResponse> updateCustomer(
            @PathVariable String id,
            @Valid @RequestBody com.rms.restaurant.module.order.dto.UpdateOrderCustomerRequest request) {
        return ResponseEntity.ok(orderService.updateCustomer(id, request));
    }

    @PutMapping("/{id}/items")
    public ResponseEntity<OrderResponse> addItems(@PathVariable String id, @Valid @RequestBody com.rms.restaurant.module.order.dto.AddOrderItemsRequest request) {
        return ResponseEntity.ok(orderService.addItems(id, request));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<OrderResponse> postItems(@PathVariable String id, @Valid @RequestBody com.rms.restaurant.module.order.dto.AddOrderItemsRequest request) {
        return ResponseEntity.ok(orderService.addItems(id, request));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<OrderResponse> removeItem(@PathVariable String id, @PathVariable String itemId) {
        return ResponseEntity.ok(orderService.removeItem(id, itemId));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}/items/{itemId}/purge")
    public ResponseEntity<OrderResponse> purgeItem(@PathVariable String id, @PathVariable String itemId) {
        return ResponseEntity.ok(orderService.purgeItem(id, itemId));
    }

    @PutMapping("/{id}/items/{itemId}/note")
    public ResponseEntity<OrderResponse> updateItemNote(@PathVariable String id, @PathVariable String itemId, @RequestBody com.rms.restaurant.module.order.dto.UpdateOrderItemNoteRequest request) {
        return ResponseEntity.ok(orderService.updateItemNote(id, itemId, request));
    }

    @PutMapping("/{id}/items/{itemId}/status")
    public ResponseEntity<OrderResponse> updateItemStatus(@PathVariable String id, @PathVariable String itemId, @RequestBody com.rms.restaurant.module.order.dto.UpdateOrderItemStatusRequest request) {
        return ResponseEntity.ok(orderService.updateItemStatus(id, itemId, request));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable String id, @RequestBody com.rms.restaurant.module.order.dto.CancelOrderRequest request) {
        return ResponseEntity.ok(orderService.cancel(id, request));
    }

    @PutMapping("/assistance/{id}/respond")
    public ResponseEntity<Void> respondAssistance(@PathVariable String id) {
        AssistanceRespondRequest req = new AssistanceRespondRequest(id);
        orderService.respondAssistance(req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/assistance/pending")
    public ResponseEntity<java.util.List<com.rms.restaurant.module.order.model.AssistanceRequest>> getPendingAssistanceRequests() {
        return ResponseEntity.ok(orderService.getPendingAssistanceRequests());
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<OrderResponse> closeOrder(@PathVariable String id) {
        return ResponseEntity.ok(orderService.closeOrder(id));
    }
}
