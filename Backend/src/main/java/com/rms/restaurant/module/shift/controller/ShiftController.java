package com.rms.restaurant.module.shift.controller;

import com.rms.restaurant.module.shift.dto.*;
import com.rms.restaurant.module.shift.service.ShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    // CS-01: Open a new shift – POST /api/shifts
    @PostMapping
    public ResponseEntity<ShiftSummaryResponse> open(
            @Valid @RequestBody OpenShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.open(request, principal.getUsername()));
    }

    // CS-02: Record cash in/out – POST /api/shifts/{id}/cash
    @PostMapping("/{id}/cash")
    public ResponseEntity<Void> recordCashMovement(
            @PathVariable String id,
            @Valid @RequestBody CashMovementRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        shiftService.addCashMovement(id, request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // CS-04: Close shift – PUT /api/shifts/{id}/close
    @PutMapping("/{id}/close")
    public ResponseEntity<ShiftSummaryResponse> close(
            @PathVariable String id,
            @Valid @RequestBody CloseShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.close(id, request, principal.getUsername()));
    }

    // CS-03: Get summary of a specific shift – GET /api/shifts/{id}/summary
    @GetMapping("/{id}/summary")
    public ResponseEntity<ShiftSummaryResponse> getSummary(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.getSummary(id, principal.getUsername()));
    }

    // CS-03: Get the calling cashier's own open shift – GET /api/shifts/current
    @GetMapping("/current")
    public ResponseEntity<ShiftSummaryResponse> getCurrent(
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.getMyOpenShift(principal.getUsername()));
    }

    // CS-05: Manager daily summary – GET /api/shifts/daily-summary?date=YYYY-MM-DD
    @GetMapping("/daily-summary")
    public ResponseEntity<DailySummaryResponse> dailySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal UserDetails principal) {

        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(shiftService.dailySummary(target, principal.getUsername()));
    }

    // CS-06: List all shifts (manager only) – GET /api/shifts
    @GetMapping
    public ResponseEntity<Page<ShiftSummaryResponse>> listAll(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.listAll(pageable, principal.getUsername()));
    }
}
