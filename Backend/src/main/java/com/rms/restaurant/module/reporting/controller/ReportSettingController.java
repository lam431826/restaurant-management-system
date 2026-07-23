package com.rms.restaurant.module.reporting.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.reporting.dto.ReportSettingRequest;
import com.rms.restaurant.module.reporting.dto.ReportSettingResponse;
import com.rms.restaurant.module.reporting.service.ReportSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Reports configuration singleton (Thiết lập báo cáo). */
@RestController
@RequestMapping("/api/reports/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class ReportSettingController {

    private final ReportSettingService reportSettingService;

    @GetMapping
    public ResponseEntity<ApiResponse<ReportSettingResponse>> get() {
        return ResponseEntity.ok(ApiResponse.success(reportSettingService.get()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ReportSettingResponse>> update(
            @Valid @RequestBody ReportSettingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reportSettingService.update(request)));
    }
}
