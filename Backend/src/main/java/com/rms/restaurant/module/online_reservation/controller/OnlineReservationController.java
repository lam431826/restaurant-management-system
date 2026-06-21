package com.rms.restaurant.module.online_reservation.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
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

    // ORM-02: Đặt bàn trực tuyến — Public (no auth), gửi NM-01 tự động
    @PostMapping
    public ResponseEntity<ApiResponse<ReservationResponse>> create(
            @Valid @RequestBody OnlineReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(onlineReservationService.create(request)));
    }

    // ORM-03: Hủy đặt bàn trực tuyến — xác thực bằng phone
    @DeleteMapping("/{ref}")
    public ResponseEntity<Void> cancel(
            @PathVariable String ref,
            @RequestParam String phone) {
        onlineReservationService.cancel(ref, phone);
        return ResponseEntity.noContent().build();
    }
}
