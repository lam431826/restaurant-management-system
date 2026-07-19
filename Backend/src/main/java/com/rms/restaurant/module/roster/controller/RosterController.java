package com.rms.restaurant.module.roster.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.roster.dto.*;
import com.rms.restaurant.module.roster.service.RosterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/roster")
@RequiredArgsConstructor
public class RosterController {

    private final RosterService rosterService;

    // ── Staff picker (WS-03; also used by staff for the swap-colleague picker) ─
    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ApiResponse<List<StaffSummaryResponse>> listStaff() {
        return ApiResponse.success(rosterService.listStaff());
    }

    // ── Shift templates (WS-01; read access needed by staff to render their own schedule) ─
    @GetMapping("/templates")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ApiResponse<List<ShiftTemplateResponse>> listTemplates() {
        return ApiResponse.success(rosterService.listTemplates());
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ShiftTemplateResponse>> createTemplate(@Valid @RequestBody ShiftTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(rosterService.createTemplate(request)));
    }

    @PutMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<ShiftTemplateResponse> updateTemplate(@PathVariable String id, @Valid @RequestBody ShiftTemplateRequest request) {
        return ApiResponse.success(rosterService.updateTemplate(id, request));
    }

    @DeleteMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String id) {
        rosterService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    // ── Assignments (WS-03, BR-WS-02/05) ──────────────────────────────────
    @GetMapping("/assignments")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<List<AssignmentResponse>> listAssignments() {
        return ApiResponse.success(rosterService.listAssignments());
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> createAssignments(@Valid @RequestBody AssignmentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(rosterService.createAssignments(request)));
    }

    @PutMapping("/assignments/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<AssignmentResponse> updateAssignment(@PathVariable String id, @Valid @RequestBody AssignmentUpdateRequest request) {
        return ApiResponse.success(rosterService.updateAssignment(id, request));
    }

    @DeleteMapping("/assignments/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<Void> deleteAssignment(@PathVariable String id) {
        rosterService.deleteAssignment(id);
        return ResponseEntity.noContent().build();
    }

    // ── Publish workflow (WS-02, BR-WS-03/04; read access needed by staff too) ─
    @GetMapping("/weeks/{weekStart}/status")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ApiResponse<WeekStatusResponse> getWeekStatus(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ApiResponse.success(rosterService.getWeekStatus(weekStart));
    }

    @PostMapping("/weeks/{weekStart}/publish")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<WeekStatusResponse> publishWeek(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        return ApiResponse.success(rosterService.publishWeek(weekStart));
    }

    // ── Attendance / clock in-out (WS-04/07/08/09) — self-service ────────
    @GetMapping("/attendance/me")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
    public ApiResponse<List<AttendanceResponse>> listMyAttendance(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.success(rosterService.listMyAttendance(principal.getUsername(), from, to));
    }

    @PostMapping("/attendance/clock-in")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
    public ApiResponse<AttendanceResponse> clockIn(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody ClockActionRequest request) {
        return ApiResponse.success(rosterService.clockIn(principal.getUsername(), request));
    }

    @PostMapping("/attendance/clock-out")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
    public ApiResponse<AttendanceResponse> clockOut(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody ClockActionRequest request) {
        return ApiResponse.success(rosterService.clockOut(principal.getUsername(), request));
    }

    // ── Swap / Leave requests (WS-05/06, BR-WS-06) ────────────────────────
    @PostMapping("/requests")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
    public ResponseEntity<ApiResponse<RequestResponse>> createRequest(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody RequestCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(rosterService.createRequest(principal.getUsername(), request)));
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<List<RequestResponse>> listRequests() {
        return ApiResponse.success(rosterService.listRequests());
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<RequestResponse> approveRequest(@PathVariable String id, @RequestBody RequestDecisionRequest request) {
        return ApiResponse.success(rosterService.approveRequest(id, request));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<RequestResponse> rejectRequest(@PathVariable String id, @RequestBody RequestDecisionRequest request) {
        return ApiResponse.success(rosterService.rejectRequest(id, request));
    }

    // ── Attendance / labor report (WS-09, BR-WS-10) ───────────────────────
    @GetMapping("/reports/attendance")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<List<AttendanceReportRow>> getAttendanceReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.success(rosterService.getAttendanceReport(from, to));
    }

    // ── Missing clock-out inbox & resolve (BR-WS-14) ──────────────────────
    @GetMapping("/attendance/missing-clockout")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<List<AttendanceResponse>> listMissingClockouts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.success(rosterService.listMissingClockouts(from, to));
    }

    @PostMapping("/attendance/{id}/resolve-clockout")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ApiResponse<AttendanceResponse> resolveMissingClockout(
            @PathVariable String id,
            @Valid @RequestBody ResolveClockoutRequest request) {
        return ApiResponse.success(rosterService.resolveMissingClockout(id, request));
    }
}
