package com.rms.restaurant.module.attendance.controller;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.attendance.dto.ShiftRequest;
import com.rms.restaurant.module.attendance.dto.ShiftResponse;
import com.rms.restaurant.module.attendance.service.WorkShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** UC-AT-01: shift template CRUD. */
@RestController
@RequestMapping("/api/attendance/shifts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class WorkShiftController {

    private final WorkShiftService workShiftService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShiftResponse>>> list(
            @RequestParam(required = false) WorkShiftStatus status) {
        return ResponseEntity.ok(ApiResponse.success(workShiftService.list(status)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShiftResponse>> create(@Valid @RequestBody ShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(workShiftService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShiftResponse>> update(@PathVariable String id,
                                                              @Valid @RequestBody ShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(workShiftService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        workShiftService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa ca làm việc"));
    }
}
