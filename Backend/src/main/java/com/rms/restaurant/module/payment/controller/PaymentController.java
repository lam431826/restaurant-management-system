package com.rms.restaurant.module.payment.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payment.dto.PaymentResponse;
import com.rms.restaurant.module.payment.dto.ProcessPaymentRequest;
import com.rms.restaurant.module.payment.dto.QrInitiateRequest;
import com.rms.restaurant.module.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    // CASH only — immediate PAID. QR uses the /qr/* endpoints below.
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

    @PostMapping("/qr/initiate")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> initiateQr(
            @Valid @RequestBody QrInitiateRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        PaymentResponse created = paymentService.initiateQrPayment(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PostMapping("/qr/{paymentId}/simulate-success")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> simulateQrSuccess(
            @PathVariable String paymentId,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.simulateQrSuccess(paymentId, principal.getUsername())));
    }

    @PostMapping("/qr/{paymentId}/cancel")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> cancelQr(
            @PathVariable String paymentId,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.cancelQrPayment(paymentId, principal.getUsername())));
    }
}
