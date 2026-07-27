package com.rms.restaurant.module.notification.controller;

import com.rms.restaurant.module.notification.dto.PaymentNotificationRequest;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // ── NM-01: Gửi thông báo đặt bàn ────────────────────────────────────────
    // Dùng để trigger thủ công hoặc retry; auto-trigger xảy ra trong ReservationService
    @PostMapping("/reservation")
    @PreAuthorize("hasAnyRole('WAITER','MANAGER')")
    public ResponseEntity<Void> sendReservationNotification(
            @Valid @RequestBody ReservationNotificationRequest request) {
        notificationService.sendReservationNotification(request);
        return ResponseEntity.noContent().build();
    }

    // ── NM-02: Gửi xác nhận thanh toán ──────────────────────────────────────
    // Auto-trigger sẽ được wire từ PM-03; endpoint này cho phép retry thủ công
    @PostMapping("/payment")
    @PreAuthorize("hasAnyRole('CASHIER','MANAGER')")
    public ResponseEntity<Void> sendPaymentNotification(
            @Valid @RequestBody PaymentNotificationRequest request) {
        notificationService.sendPaymentNotification(request);
        return ResponseEntity.noContent().build();
    }

}
