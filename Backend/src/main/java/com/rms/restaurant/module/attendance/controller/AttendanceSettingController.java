package com.rms.restaurant.module.attendance.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingRequest;
import com.rms.restaurant.module.attendance.dto.AttendanceSettingResponse;
import com.rms.restaurant.module.attendance.service.AttendanceSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** UC-AT-05: attendance configuration singleton. */
@RestController
@RequestMapping("/api/attendance/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class AttendanceSettingController {

    private final AttendanceSettingService attendanceSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<AttendanceSettingResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(attendanceSettingService.get()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AttendanceSettingResponse>> update(
            @Valid @RequestBody AttendanceSettingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(attendanceSettingService.update(request)));
    }
}
