package com.rms.restaurant.module.payroll.controller;

import com.rms.restaurant.common.utils.enums.PayrollSheetStatus;
import com.rms.restaurant.common.utils.enums.PayrollTerm;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.payroll.dto.*;
import com.rms.restaurant.module.payroll.service.PayrollService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class PayrollController {

    private final PayrollService payrollService;

    @GetMapping("/sheets")
    public ResponseEntity<PageResponse<PayrollSheetResponse>> listSheets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PayrollTerm term,
            @RequestParam(required = false) List<PayrollSheetStatus> statuses,
            Pageable pageable) {
        return ResponseEntity.ok(payrollService.listSheets(search, term, statuses, pageable));
    }

    @PostMapping("/sheets")
    public ResponseEntity<ApiResponse<PayrollSheetResponse>> createSheet(
            @Valid @RequestBody CreatePayrollSheetRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        PayrollSheetResponse created = payrollService.createSheet(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/payroll/sheets/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @GetMapping("/sheets/{id}")
    public ResponseEntity<ApiResponse<PayrollSheetResponse>> getSheet(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.getSheet(id)));
    }

    @GetMapping("/sheets/{id}/payslips")
    public ResponseEntity<ApiResponse<List<PayslipRowResponse>>> listPayslips(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPayslips(id)));
    }

    @PutMapping("/sheets/{id}/payslips")
    public ResponseEntity<ApiResponse<List<PayslipRowResponse>>> saveDraft(
            @PathVariable String id, @Valid @RequestBody SaveDraftRequest request) {
        payrollService.saveDraft(id, request);
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPayslips(id)));
    }

    @PostMapping("/sheets/{id}/reload")
    public ResponseEntity<ApiResponse<PayrollSheetResponse>> reload(
            @PathVariable String id, @Valid @RequestBody ReloadRequest request) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.reload(id, request.mode())));
    }

    @PostMapping("/sheets/{id}/finalize")
    public ResponseEntity<ApiResponse<PayrollSheetResponse>> finalizeSheet(
            @PathVariable String id, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.finalizeSheet(id, principal.getUsername())));
    }

    @PostMapping("/sheets/{id}/cancel")
    public ResponseEntity<Void> cancelSheet(@PathVariable String id) {
        payrollService.cancelSheet(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sheets/{id}/payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> pay(
            @PathVariable String id,
            @Valid @RequestBody PayRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.pay(id, request, principal.getUsername())));
    }

    @GetMapping("/sheets/{id}/payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> listPayments(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listPayments(id)));
    }

    @GetMapping("/payslips/{id}")
    public ResponseEntity<ApiResponse<PayslipDetailResponse>> getPayslip(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.getPayslip(id)));
    }

    @PostMapping("/payslips/{id}/cancel")
    public ResponseEntity<Void> cancelPayslip(@PathVariable String id) {
        payrollService.cancelPayslip(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/employees/{employeeId}/payslips")
    public ResponseEntity<ApiResponse<List<PayslipDetailResponse>>> listEmployeePayslips(
            @PathVariable String employeeId) {
        return ResponseEntity.ok(ApiResponse.success(payrollService.listEmployeePayslips(employeeId)));
    }
}
