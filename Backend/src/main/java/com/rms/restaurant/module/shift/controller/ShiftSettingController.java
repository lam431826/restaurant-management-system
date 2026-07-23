package com.rms.restaurant.module.shift.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.shift.dto.ShiftSettingRequest;
import com.rms.restaurant.module.shift.dto.ShiftSettingResponse;
import com.rms.restaurant.module.shift.service.ShiftSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * "Kết ca" configuration singleton. GET is open to any authenticated staff — the cashier
 * POS screen needs it to gate its own Mở ca/Đóng ca UI. Only PUT is manager/admin-only.
 */
@RestController
@RequestMapping("/api/shifts/settings")
@RequiredArgsConstructor
public class ShiftSettingController {

    private final ShiftSettingService shiftSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<ShiftSettingResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(shiftSettingService.get()));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ShiftSettingResponse>> update(
            @Valid @RequestBody ShiftSettingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(shiftSettingService.update(request)));
    }
}
