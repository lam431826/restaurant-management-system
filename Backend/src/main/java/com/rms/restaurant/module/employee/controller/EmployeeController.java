package com.rms.restaurant.module.employee.controller;

import com.rms.restaurant.common.storage.FileStorageService;
import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.employee.dto.*;
import com.rms.restaurant.module.employee.service.EmployeeService;
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
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<PageResponse<EmployeeResponse>> list(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) EmployeeStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(employeeService.list(code, name, phone, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse created = employeeService.create(request);
        return ResponseEntity
                .created(URI.create("/api/employees/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(@PathVariable String id,
                                                                @Valid @RequestBody UpdateEmployeeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.update(id, request)));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable String id) {
        employeeService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/salary-setting")
    public ResponseEntity<ApiResponse<SalarySettingResponse>> getSalarySetting(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getSalarySetting(id)));
    }

    @PutMapping("/{id}/salary-setting")
    public ResponseEntity<ApiResponse<SalarySettingResponse>> upsertSalarySetting(
            @PathVariable String id, @Valid @RequestBody SalarySettingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.upsertSalarySetting(id, request)));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) EmployeeStatus status,
            @RequestParam(required = false) List<String> ids) {
        byte[] csv = employeeService.exportCsv(code, name, phone, status, ids);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"employees-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EmployeeImportResultResponse>> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam("strategy") ImportStrategy strategy) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.importCsv(file, strategy)));
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResponse>> uploadAvatar(@PathVariable String id,
                                                                    @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeImage(file, "employees");
        employeeService.update(id, new UpdateEmployeeRequest(
                null,   // name
                null,   // phone
                null,   // status
                null,   // startDate
                null,   // timekeepCode
                null,   // note
                null,   // idNumber
                null,   // birthday
                null,   // gender
                null,   // address
                null,   // email
                url,    // avatarUrl
                null    // userId
        ));
        return ResponseEntity.ok(ApiResponse.success(new UploadResponse(url)));
    }
}
