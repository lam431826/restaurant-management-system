package com.rms.restaurant.module.reservation.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    // RM-05: Danh sách tất cả reservations
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReservationResponse>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.list(pageable)));
    }

    // RM-02: Chi tiết 1 reservation
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getById(id)));
    }

    // RM-01 (staff confirm sau khi gọi điện cho khách): PENDING → CONFIRMED
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<ReservationResponse>> confirm(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.confirm(id)));
    }

    // RM-02: Cập nhật thông tin reservation (tableId, partySize, datetime, note)
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.update(id, request)));
    }

    // RM-03: Staff huỷ reservation (PENDING/CONFIRMED → CANCELLED)
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable String id) {
        reservationService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    // RM-04: Check-in khi khách đến (CONFIRMED → CHECKED_IN)
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @PutMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<ReservationResponse>> checkIn(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.checkIn(id)));
    }

    // RM-08: Đánh dấu no-show (CONFIRMED → NO_SHOW)
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    @PutMapping("/{id}/no-show")
    public ResponseEntity<Void> noShow(@PathVariable String id) {
        reservationService.markNoShow(id);
        return ResponseEntity.noContent().build();
    }
}
