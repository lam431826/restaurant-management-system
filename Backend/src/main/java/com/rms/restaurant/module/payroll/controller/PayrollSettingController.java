package com.rms.restaurant.module.payroll.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payroll.dto.PayrollSettingRequest;
import com.rms.restaurant.module.payroll.dto.PayrollSettingResponse;
import com.rms.restaurant.module.payroll.service.PayrollSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Payroll configuration singleton (Thiết lập tính lương). */
@RestController
@RequestMapping("/api/payroll/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class PayrollSettingController {

    private final PayrollSettingService payrollSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<PayrollSettingResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(payrollSettingService.get()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<PayrollSettingResponse>> update(
            @Valid @RequestBody PayrollSettingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(payrollSettingService.update(request)));
    }
}
