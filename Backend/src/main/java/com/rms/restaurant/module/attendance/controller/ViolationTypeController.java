package com.rms.restaurant.module.attendance.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.attendance.dto.ViolationTypeRequest;
import com.rms.restaurant.module.attendance.dto.ViolationTypeResponse;
import com.rms.restaurant.module.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** UC-AT-06: violation type CRUD. */
@RestController
@RequestMapping("/api/attendance/violation-types")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class ViolationTypeController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ViolationTypeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.listViolationTypes()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ViolationTypeResponse>> create(
            @Valid @RequestBody ViolationTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.createViolationType(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ViolationTypeResponse>> update(@PathVariable String id,
                                                                     @Valid @RequestBody ViolationTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(attendanceService.updateViolationType(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        attendanceService.deleteViolationType(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa loại vi phạm"));
    }
}
