package com.rms.restaurant.module.reporting.controller;

import com.rms.restaurant.common.utils.enums.PaymentMethod;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.reporting.dto.EndOfDaySalesRow;
import com.rms.restaurant.module.reporting.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    // Báo cáo cuối ngày về bán hàng — from/to are full datetime bounds computed by the caller,
    // covering both a single day's time-of-day window and an arbitrary custom date range.
    @GetMapping("/end-of-day")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<EndOfDaySalesRow>>> getEndOfDaySales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) List<String> staffIds,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(required = false) String areaName,
            @RequestParam(required = false) String tableName) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getEndOfDaySales(from, to, staffIds, paymentMethod, areaName, tableName)));
    }
}
