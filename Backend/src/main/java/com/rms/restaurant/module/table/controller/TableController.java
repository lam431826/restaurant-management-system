package com.rms.restaurant.module.table.controller;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('WAITER','CASHIER','MANAGER')")
public class TableController {

    private final TableService tableService;

    // ── TM-01: Danh sách bàn (optionally filter by status) ───────────────────
    @GetMapping
    public ResponseEntity<ApiResponse<List<TableResponse>>> list(
            @RequestParam(required = false) TableStatus status) {
        return ResponseEntity.ok(ApiResponse.success(tableService.listAll(status)));
    }

    // ── TM-01: Xem chi tiết bàn ──────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TableResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getById(id)));
    }

    // ── TM-CRUD: Tạo bàn mới ─────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<TableResponse>> create(@Valid @RequestBody CreateTableRequest request) {
        TableResponse created = tableService.create(request);
        return ResponseEntity
                .created(URI.create("/api/tables/" + created.id()))
                .body(ApiResponse.success(created, "Tạo bàn thành công"));
    }

    // ── TM-CRUD: Cập nhật thông tin bàn ─────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<TableResponse>> update(@PathVariable String id,
                                                              @Valid @RequestBody UpdateTableRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tableService.update(id, request)));
    }

    // ── TM-CRUD: Xóa bàn ─────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        tableService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── TM-02: Cập nhật trạng thái bàn ──────────────────────────────────────
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TableResponse>> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody TableStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tableService.updateStatus(id, request)));
    }

    // ── TM-04: Làm mới QR token ──────────────────────────────────────────────
    @PostMapping("/{id}/qr-token")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<TableResponse>> regenerateQrToken(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(tableService.regenerateQrToken(id),
                "QR token đã được làm mới"));
    }

    // ── TM-03: Chuyển bàn ────────────────────────────────────────────────────
    @PostMapping("/transfer")
    public ResponseEntity<Void> transfer(@Valid @RequestBody TransferTableRequest request) {
        tableService.transfer(request);
        return ResponseEntity.noContent().build();
    }

    // ── TM-05: Ghép bàn ──────────────────────────────────────────────────────
    @PostMapping("/merge")
    public ResponseEntity<Void> merge(@Valid @RequestBody MergeTableRequest request) {
        tableService.merge(request);
        return ResponseEntity.noContent().build();
    }
}
