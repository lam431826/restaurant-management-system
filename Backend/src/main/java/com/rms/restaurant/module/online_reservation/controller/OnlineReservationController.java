package com.rms.restaurant.module.online_reservation.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelConfirmInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/online/reservations")
@RequiredArgsConstructor
public class OnlineReservationController {

    private final OnlineReservationService onlineReservationService;

    // ORM-01: Xem slot bàn trống — Public (no auth)
    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<AvailabilityResponse>> checkAvailability(
            @Valid AvailabilityRequest request) {
        return ResponseEntity.ok(ApiResponse.success(onlineReservationService.checkAvailability(request)));
    }

    // ORM-02: Khách tạo đặt bàn — Public, status=PENDING, gửi email "đang chờ xác nhận"
    @PostMapping
    public ResponseEntity<ApiResponse<ReservationResponse>> create(
            @Valid @RequestBody OnlineReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(onlineReservationService.create(request)));
    }

    // ORM-03 Bước 1: Yêu cầu huỷ — xác thực SĐT, gửi OTP về email
    @PostMapping("/{id}/cancel-request")
    public ResponseEntity<ApiResponse<OnlineCancelRequestResponse>> requestCancellation(
            @PathVariable String id,
            @Valid @RequestBody OnlineCancelRequestInput input) {
        return ResponseEntity.ok(
                ApiResponse.success(onlineReservationService.requestCancellation(id, input)));
    }

    // ORM-03 Bước 2: Xác nhận OTP → huỷ đặt bàn
    @PostMapping("/{id}/cancel-confirm")
    public ResponseEntity<Void> confirmCancellation(
            @PathVariable String id,
            @Valid @RequestBody OnlineCancelConfirmInput input) {
        onlineReservationService.confirmCancellation(id, input);
        return ResponseEntity.noContent().build();
    }
}
