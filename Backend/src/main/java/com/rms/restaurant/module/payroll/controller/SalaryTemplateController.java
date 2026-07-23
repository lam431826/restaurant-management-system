package com.rms.restaurant.module.payroll.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payroll.dto.SalaryTemplateRequest;
import com.rms.restaurant.module.payroll.dto.SalaryTemplateResponse;
import com.rms.restaurant.module.payroll.service.SalaryTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payroll/salary-templates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class SalaryTemplateController {

    private final SalaryTemplateService templateService;

    @GetMapping
    public ApiResponse<List<SalaryTemplateResponse>> list() {
        return ApiResponse.success(templateService.list());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SalaryTemplateResponse>> create(@Valid @RequestBody SalaryTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(templateService.create(request)));
    }

    @PutMapping("/{id}")
    public ApiResponse<SalaryTemplateResponse> update(@PathVariable String id, @Valid @RequestBody SalaryTemplateRequest request) {
        return ApiResponse.success(templateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        templateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
