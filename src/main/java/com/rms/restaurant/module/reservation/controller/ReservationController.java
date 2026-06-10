package com.rms.restaurant.module.reservation.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReservationResponse>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.list(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReservationResponse>> create(
            @Valid @RequestBody CreateReservationRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        ReservationResponse response = reservationService.create(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/reservations/" + response.id()))
                .body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable String id) {
        reservationService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/check-in")
    public ResponseEntity<ApiResponse<ReservationResponse>> checkIn(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(reservationService.checkIn(id)));
    }
}
