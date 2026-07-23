package com.rms.restaurant.module.payment.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payment.dto.CreatePromotionRequest;
import com.rms.restaurant.module.payment.dto.PromotionResponse;
import com.rms.restaurant.module.payment.dto.UpdatePromotionRequest;
import com.rms.restaurant.module.payment.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {
    private final PromotionService promotionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER')")
    public ResponseEntity<ApiResponse<PromotionResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<PromotionResponse>> create(@Valid @RequestBody CreatePromotionRequest request) {
        PromotionResponse created = promotionService.create(request);
        return ResponseEntity
                .created(URI.create("/api/promotions/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<PromotionResponse>> update(@PathVariable String id,
                                                                 @Valid @RequestBody UpdatePromotionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        promotionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Promotion deleted"));
    }
}
