package com.rms.restaurant.module.notification.controller;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.notification.dto.ManualNotificationRequest;
import com.rms.restaurant.module.notification.dto.NotificationLogResponse;
import com.rms.restaurant.module.notification.dto.PaymentNotificationRequest;
import com.rms.restaurant.module.notification.dto.ReservationNotificationRequest;
import com.rms.restaurant.module.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    // ── NM-03: Xem lịch sử thông báo ─────────────────────────────────────────
    // WAITER/CASHIER chỉ truy vấn theo referenceId cụ thể; MANAGER/ADMIN xem toàn bộ
    @GetMapping("/log")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
    public PageResponse<NotificationLogResponse> getLogs(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String referenceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationService.getLogs(type, status, referenceId, from, to, pageable);
    }

    // ── NM-04: Gửi thông báo thủ công ────────────────────────────────────────
    @PostMapping("/manual")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> sendManual(
            @Valid @RequestBody ManualNotificationRequest request) {
        notificationService.sendManual(request);
        return ResponseEntity.noContent().build();
    }
}
