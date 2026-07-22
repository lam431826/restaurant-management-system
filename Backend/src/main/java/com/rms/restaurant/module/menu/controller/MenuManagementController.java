package com.rms.restaurant.module.menu.controller;

import com.rms.restaurant.common.storage.FileStorageService;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.menu.dto.*;
import com.rms.restaurant.module.menu.service.MenuService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class MenuManagementController {

    private final MenuService menuService;
    private final FileStorageService fileStorageService;

    // ── Image upload ─────────────────────────────────────────────────────

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResponse>> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeImage(file, "menu");
        return ResponseEntity.ok(ApiResponse.success(new UploadResponse(url)));
    }

    // ── Items ────────────────────────────────────────────────────────────

    @GetMapping("/items")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<PageResponse<MenuItemResponse>> searchItems(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) Boolean available,
            @RequestParam(required = false) String menuType,
            Pageable pageable) {
        return ResponseEntity.ok(menuService.searchItems(q, categoryId, available, menuType, pageable));
    }

    @GetMapping("/items/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> getItem(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getItem(id)));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<MenuItemResponse>> createItem(@Valid @RequestBody CreateMenuItemRequest request) {
        MenuItemResponse created = menuService.createItem(request);
        return ResponseEntity
                .created(URI.create("/api/menu/items/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<MenuItemResponse>> updateItem(@PathVariable String id,
                                                                    @Valid @RequestBody UpdateMenuItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateItem(id, request)));
    }

    @PatchMapping("/items/{id}/availability")
    public ResponseEntity<Void> setAvailability(@PathVariable String id,
                                                @Valid @RequestBody AvailabilityRequest request) {
        menuService.setAvailability(id, request.available());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable String id) {
        menuService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/bulk-availability")
    public ResponseEntity<Void> bulkSetAvailability(@Valid @RequestBody BulkAvailabilityRequest request) {
        menuService.bulkSetAvailability(request.ids(), request.available());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/items/bulk-delete")
    public ResponseEntity<Void> bulkDelete(@Valid @RequestBody BulkIdsRequest request) {
        menuService.bulkDeleteItems(request.ids());
        return ResponseEntity.noContent().build();
    }

    // ── Categories ───────────────────────────────────────────────────────

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','WAITER','CASHIER')")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> listCategories() {
        return ResponseEntity.ok(ApiResponse.success(menuService.listCategories()));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = menuService.createCategory(request);
        return ResponseEntity
                .created(URI.create("/api/menu/categories/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/categories/reorder")
    public ResponseEntity<Void> reorderCategories(@Valid @RequestBody ReorderCategoriesRequest request) {
        menuService.reorderCategories(request.orderedCategoryIds());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(@PathVariable String id,
                                                                        @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable String id) {
        menuService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ── Import / Export ──────────────────────────────────────────────────

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv() {
        byte[] csv = menuService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"menu-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImportResultResponse>> importCsv(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(menuService.importCsv(file)));
    }
}
