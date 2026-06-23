package com.rms.restaurant.module.table.controller;

import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.table.dto.*;
import com.rms.restaurant.module.table.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class TableController {

    private final TableService tableService;

    // ── Tables ───────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<List<TableResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(tableService.listAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<TableResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TableResponse>> create(@Valid @RequestBody CreateTableRequest request) {
        TableResponse created = tableService.createTable(request);
        return ResponseEntity
                .created(URI.create("/api/tables/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TableResponse>> update(@PathVariable String id,
                                                             @Valid @RequestBody UpdateTableRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tableService.updateTable(id, request)));
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<Void> setActive(@PathVariable String id, @Valid @RequestBody SetActiveRequest request) {
        tableService.setActive(id, request.active());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<TableResponse>> updateStatus(@PathVariable String id,
                                                                   @Valid @RequestBody TableStatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(tableService.updateStatus(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        tableService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }

    // ── Import / Export ──────────────────────────────────────────────────

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv() {
        byte[] csv = tableService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"tables-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<TableImportResult>> importCsv(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(tableService.importCsv(file)));
    }

    // ── Areas ────────────────────────────────────────────────────────────

    @GetMapping("/areas")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<List<AreaResponse>>> listAreas() {
        return ResponseEntity.ok(ApiResponse.success(tableService.listAreas()));
    }

    @PostMapping("/areas")
    public ResponseEntity<ApiResponse<AreaResponse>> createArea(@Valid @RequestBody AreaRequest request) {
        AreaResponse created = tableService.createArea(request);
        return ResponseEntity
                .created(URI.create("/api/tables/areas/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @DeleteMapping("/areas/{id}")
    public ResponseEntity<Void> deleteArea(@PathVariable String id) {
        tableService.deleteArea(id);
        return ResponseEntity.noContent().build();
    }
}
