package com.rms.restaurant.module.attendance.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.attendance.dto.ScheduleCreateRequest;
import com.rms.restaurant.module.attendance.dto.ScheduleResponse;
import com.rms.restaurant.module.attendance.service.WorkScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** UC-AT-02: work scheduling — materialized occurrences and repeat rules (BR-AT-03/04). */
@RestController
@RequestMapping("/api/attendance/schedules")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class WorkScheduleController {

    private final WorkScheduleService workScheduleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> listRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) String employeeId) {
        return ResponseEntity.ok(ApiResponse.success(workScheduleService.listRange(start, end, employeeId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> create(
            @Valid @RequestBody ScheduleCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(workScheduleService.create(request)));
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<ApiResponse<Void>> deleteOccurrence(@PathVariable String scheduleId) {
        workScheduleService.deleteOccurrence(scheduleId);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa lịch làm việc"));
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<ApiResponse<Void>> cancelRule(
            @PathVariable String ruleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from) {
        if (from != null) {
            workScheduleService.cancelRuleFrom(ruleId, from);
        } else {
            workScheduleService.cancelRule(ruleId);
        }
        return ResponseEntity.ok(ApiResponse.ok("Đã ngừng lặp lịch"));
    }
}
