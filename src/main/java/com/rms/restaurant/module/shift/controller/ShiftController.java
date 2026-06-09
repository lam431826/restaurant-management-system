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

<<<<<<< HEAD
    // SM-01: Open a new shift – POST /api/shifts
=======
    // SM-01: Open shift
>>>>>>> origin/develop
    @PostMapping
    public ResponseEntity<ShiftSummaryResponse> open(
            @Valid @RequestBody OpenShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {
<<<<<<< HEAD

        ShiftSummaryResponse response = shiftService.open(request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // SM-02: Record cash in/out – POST /api/shifts/{id}/cash
=======
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shiftService.open(request, principal.getUsername()));
    }

    // SM-02: Record cash in / out
>>>>>>> origin/develop
    @PostMapping("/{id}/cash")
    public ResponseEntity<Void> recordCashMovement(
            @PathVariable String id,
            @Valid @RequestBody CashMovementRequest request,
            @AuthenticationPrincipal UserDetails principal) {
<<<<<<< HEAD

=======
>>>>>>> origin/develop
        shiftService.addCashMovement(id, request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

<<<<<<< HEAD
    // SM-03: Close shift – PUT /api/shifts/{id}/close
=======
    // SM-03: Close shift & reconcile
>>>>>>> origin/develop
    @PutMapping("/{id}/close")
    public ResponseEntity<ShiftSummaryResponse> close(
            @PathVariable String id,
            @Valid @RequestBody CloseShiftRequest request,
            @AuthenticationPrincipal UserDetails principal) {
<<<<<<< HEAD

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
=======
        return ResponseEntity.ok(shiftService.close(id, request, principal.getUsername()));
    }

    // SM-04: Live summary of the currently open shift
>>>>>>> origin/develop
    @GetMapping("/current")
    public ResponseEntity<ShiftSummaryResponse> getCurrent() {
        return ResponseEntity.ok(shiftService.getOpenShiftSummary());
    }

<<<<<<< HEAD
    // SM-04: List all shifts (manager only) – GET /api/shifts
    @GetMapping
    public ResponseEntity<Page<ShiftSummaryResponse>> listAll(
            @PageableDefault(size = 20, sort = "openedAt") Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

=======
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
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {
>>>>>>> origin/develop
        return ResponseEntity.ok(shiftService.listAll(pageable, principal.getUsername()));
    }
}
