package com.rms.restaurant.module.reporting.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineDto;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineRequest;
import com.rms.restaurant.module.reporting.dto.FinancialCustomLineValueRequest;
import com.rms.restaurant.module.reporting.service.FinancialCustomLineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** User-managed Chi phí / Thu nhập khác line items on Báo cáo tài chính. */
@RestController
@RequestMapping("/api/reports/financial/custom-lines")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER')")
public class FinancialCustomLineController {

    private final FinancialCustomLineService financialCustomLineService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FinancialCustomLineDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(financialCustomLineService.list()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FinancialCustomLineDto>> create(@Valid @RequestBody FinancialCustomLineRequest request) {
        return ResponseEntity.ok(ApiResponse.success(financialCustomLineService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FinancialCustomLineDto>> update(
            @PathVariable String id, @Valid @RequestBody FinancialCustomLineRequest request) {
        return ResponseEntity.ok(ApiResponse.success(financialCustomLineService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        financialCustomLineService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa danh mục"));
    }

    @PutMapping("/{id}/values")
    public ResponseEntity<ApiResponse<Void>> upsertValue(
            @PathVariable String id, @Valid @RequestBody FinancialCustomLineValueRequest request) {
        financialCustomLineService.upsertValue(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Đã lưu"));
    }
}
