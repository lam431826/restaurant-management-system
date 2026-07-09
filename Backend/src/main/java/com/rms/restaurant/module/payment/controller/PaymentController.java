package com.rms.restaurant.module.payment.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getHistory(
            @RequestParam(required = false) String invoiceId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getHistory(invoiceId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> process(
            @Valid @RequestBody ProcessPaymentRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        PaymentResponse created = paymentService.process(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.id()))
                .body(ApiResponse.success(created));
    }
}
