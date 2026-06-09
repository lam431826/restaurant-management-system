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

    // SM-01: Open shift
    @PostMapping
    public ResponseEntity<ShiftSummaryResponse> open(
            @Valid @RequestBody OpenShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.open(request, principal.getUsername()));
    }

    // SM-02: Record cash in / out
    @PostMapping("/{id}/cash")
    public ResponseEntity<Void> recordCashMovement(
            @PathVariable String id,
            @Valid @RequestBody CashMovementRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        shiftService.addCashMovement(id, request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // SM-03: Close shift & reconcile
    @PutMapping("/{id}/close")
    public ResponseEntity<ShiftSummaryResponse> close(
            @PathVariable String id,
            @Valid @RequestBody CloseShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(shiftService.close(id, request, principal.getUsername()));
    }

    // SM-04: Live summary of the currently open shift
    @GetMapping("/current")
    public ResponseEntity<ShiftSummaryResponse> getCurrent() {
        return ResponseEntity.ok(shiftService.getOpenShiftSummary());
    }

    // SM-04: Summary by shift ID
    @GetMapping("/{id}/summary")
    public ResponseEntity<ShiftSummaryResponse> getSummary(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(shiftService.getSummary(id, principal.getUsername()));
    }

    // SM-04: List all shifts (manager only)
    @GetMapping
    public ResponseEntity<Page<ShiftSummaryResponse>> listAll(
            @PageableDefault(size = 20, sort = "openedAt") Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(shiftService.listAll(pageable, principal.getUsername()));
    }
}
