package com.rms.restaurant.module.attendance.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.attendance.dto.*;
import com.rms.restaurant.module.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** UC-AT-03/04/06/07: manual attendance marking, violations and period summary. */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/timesheet")
    public ResponseEntity<ApiResponse<List<TimesheetCellResponse>>> timesheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.timesheet(start, end)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<AttendanceSummaryRow>>> summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.summary(start, end)));
    }

    // ── Self-service ("Lịch làm việc") — method-level override, same pattern as
    // EmployeeController's /employees/me, since the class-level annotation is MANAGER/ADMIN only. ──

    @GetMapping("/timesheet/me")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<TimesheetCellResponse>>> myTimesheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.myTimesheet(principal.getUsername(), start, end)));
    }

    @PostMapping("/schedules/{scheduleId}/check-in")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> checkIn(
            @PathVariable String scheduleId, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.checkIn(scheduleId, principal.getUsername())));
    }

    @PostMapping("/schedules/{scheduleId}/check-out")
    @PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> checkOut(
            @PathVariable String scheduleId, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.checkOut(scheduleId, principal.getUsername())));
    }

    @PutMapping("/schedules/{scheduleId}/record")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> upsert(
            @PathVariable String scheduleId,
            @Valid @RequestBody AttendanceUpsertRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.upsert(scheduleId, request, principal.getUsername())));
    }

    @PostMapping("/records/bulk")
    public ResponseEntity<ApiResponse<List<AttendanceRecordResponse>>> bulkMark(
            @Valid @RequestBody BulkAttendanceRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.bulkMark(request, principal.getUsername())));
    }

    @GetMapping("/records/{id}")
    public ResponseEntity<ApiResponse<AttendanceRecordResponse>> getRecord(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.getRecord(id)));
    }

    @DeleteMapping("/records/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecord(@PathVariable String id) {
        attendanceService.deleteRecord(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy chấm công"));
    }

    @GetMapping("/records/{id}/violations")
    public ResponseEntity<ApiResponse<List<ViolationResponse>>> listViolations(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.listViolations(id)));
    }

    @PutMapping("/records/{id}/violations")
    public ResponseEntity<ApiResponse<List<ViolationResponse>>> replaceViolations(
            @PathVariable String id, @Valid @RequestBody List<ViolationRequest> rows) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.replaceViolations(id, rows)));
    }
}
