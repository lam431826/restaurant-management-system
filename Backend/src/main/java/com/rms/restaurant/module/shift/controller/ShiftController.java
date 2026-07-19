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

    // CS-07 / BR-CS-18: Open a floating shift – POST /api/shifts/floating
    @PostMapping("/floating")
    public ResponseEntity<ShiftSummaryResponse> openFloating(
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.openFloating(principal.getUsername()));
    }

    // CS-07 / BR-CS-19: Merge a floating shift into its main shift – POST /api/shifts/{id}/merge
    @PostMapping("/{id}/merge")
    public ResponseEntity<ShiftSummaryResponse> mergeFloating(
            @PathVariable String id,
            @Valid @RequestBody MergeFloatingRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.mergeFloating(id, request, principal.getUsername()));
    }

    // BR-CS-15: Manager force-close a stale/open shift – PUT /api/shifts/{id}/force-close
    @PutMapping("/{id}/force-close")
    public ResponseEntity<ShiftSummaryResponse> forceClose(
            @PathVariable String id,
            @Valid @RequestBody ForceCloseShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.forceClose(id, request, principal.getUsername()));
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

    // CS-07: open normal shifts a floating shift can merge into – GET /api/shifts/open-normal
    @GetMapping("/open-normal")
    public ResponseEntity<java.util.List<OpenShiftBriefResponse>> openNormalShifts(
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.listOpenNormalShifts(principal.getUsername()));
    }

    // BR-CS-09/11: suggested opening float (last handover) – GET /api/shifts/suggested-float
    @GetMapping("/suggested-float")
    public ResponseEntity<java.math.BigDecimal> suggestedFloat(
            @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(shiftService.getSuggestedOpeningFloat(principal.getUsername()));
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
