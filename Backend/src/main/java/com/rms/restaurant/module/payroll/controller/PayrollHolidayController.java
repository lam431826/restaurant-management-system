package com.rms.restaurant.module.payroll.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payroll.dto.PayrollHolidayRequest;
import com.rms.restaurant.module.payroll.dto.PayrollHolidayResponse;
import com.rms.restaurant.module.payroll.service.PayrollHolidayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** BR-PAY-04: "Ngày lễ, Tết" holiday calendar — feeds SalaryCalculator's holiday-rate classification. */
@RestController
@RequestMapping("/api/payroll/holidays")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class PayrollHolidayController {

    private final PayrollHolidayService holidayService;

    @GetMapping
    public ApiResponse<List<PayrollHolidayResponse>> list() {
        return ApiResponse.success(holidayService.list());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PayrollHolidayResponse>> create(@Valid @RequestBody PayrollHolidayRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(holidayService.create(request)));
    }

    @PutMapping("/{id}")
    public ApiResponse<PayrollHolidayResponse> update(@PathVariable String id, @Valid @RequestBody PayrollHolidayRequest request) {
        return ApiResponse.success(holidayService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        holidayService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
