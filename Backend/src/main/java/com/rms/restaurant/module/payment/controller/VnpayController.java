package com.rms.restaurant.module.payment.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payment.dto.VnpayCreateRequest;
import com.rms.restaurant.module.payment.dto.VnpayCreateResponse;
import com.rms.restaurant.module.payment.dto.VnpayStatusResponse;
import com.rms.restaurant.module.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

import java.util.Map;

/**
 * VNPAY Sandbox redirect flow. Split from {@link PaymentController} because Return/IPN have
 * gateway-dictated response contracts (a 302 redirect, and a bare {"RspCode","Message"} JSON
 * body) that do not fit the rest of the API's {@link ApiResponse} envelope, and because they
 * must stay unauthenticated — see SecurityConfig — since VNPAY's own servers call them
 * directly with no JWT.
 */
@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
public class VnpayController {
    private final PaymentService paymentService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VnpayCreateResponse>> create(
            @Valid @RequestBody VnpayCreateRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest) {
        VnpayCreateResponse created = paymentService.createVnpayPayment(
                request, principal.getUsername(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    // Public — the customer's browser lands here after VNPAY. Never settles anything;
    // only verifies the signature and forwards to the frontend result page, which polls
    // /status/{txnRef} rather than trusting these query parameters.
    @GetMapping("/return")
    public ResponseEntity<Void> handleReturn(@RequestParam Map<String, String> params) {
        String redirectUrl = paymentService.buildVnpayReturnRedirect(params);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, redirectUrl)
                .build();
    }

    // Public — VNPAY's server calls this directly (no JWT). Authoritative: this is the
    // only place a VNPAY payment is ever marked PAID.
    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> handleIpn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(paymentService.handleVnpayIpn(params));
    }

    @GetMapping("/status/{txnRef}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VnpayStatusResponse>> status(@PathVariable String txnRef) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getVnpayStatus(txnRef)));
    }

    /**
     * Server-side QueryDR fallback for a transaction whose IPN never arrived — the normal
     * case when VNPAY cannot reach this machine. Staff-triggered, so it is authenticated
     * (unlike /return and /ipn, which VNPAY itself calls).
     */
    @PostMapping("/reconcile/{txnRef}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VnpayStatusResponse>> reconcile(
            @PathVariable String txnRef,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentService.reconcileVnpayPayment(txnRef, httpRequest.getRemoteAddr())));
    }
}
