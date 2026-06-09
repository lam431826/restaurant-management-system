package com.rms.restaurant.module.shift.controller;

import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.service.ShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    // SM-01: Open a new shift – POST /api/shifts
    @PostMapping
    public ResponseEntity<ShiftSummaryResponse> open(
            @Valid @RequestBody OpenShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        ShiftSummaryResponse response = shiftService.open(request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // SM-02: Record cash in/out – POST /api/shifts/{id}/cash
    @PostMapping("/{id}/cash")
    public ResponseEntity<Void> recordCashMovement(
            @PathVariable String id,
            @Valid @RequestBody CashMovementRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        shiftService.addCashMovement(id, request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // SM-03: Close shift – PUT /api/shifts/{id}/close
    @PutMapping("/{id}/close")
    public ResponseEntity<ShiftSummaryResponse> close(
            @PathVariable String id,
            @Valid @RequestBody CloseShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.close(id, request, principal.getUsername()));
    }

    // SM-04: Get summary of a specific shift – GET /api/shifts/{id}/summary
    @GetMapping("/{id}/summary")
    public ResponseEntity<ShiftSummaryResponse> getSummary(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.getSummary(id, principal.getUsername()));
    }

    // SM-04: Get the current open shift summary (real-time) – GET /api/shifts/current
    @GetMapping("/current")
    public ResponseEntity<ShiftSummaryResponse> getCurrent() {
        return ResponseEntity.ok(shiftService.getOpenShiftSummary());
    }

    // SM-04: List all shifts (manager only) – GET /api/shifts
    @GetMapping
    public ResponseEntity<Page<ShiftSummaryResponse>> listAll(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.listAll(pageable, principal.getUsername()));
    }
}
