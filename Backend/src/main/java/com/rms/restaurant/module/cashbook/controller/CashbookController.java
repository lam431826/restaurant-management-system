package com.rms.restaurant.module.cashbook.controller;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.cashbook.dto.*;
import com.rms.restaurant.module.cashbook.service.CashbookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/cashbook")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
public class CashbookController {

    private final CashbookService cashbookService;

    // ── Categories ───────────────────────────────────────────────────────────

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> listCategories() {
        return ApiResponse.success(cashbookService.listCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = cashbookService.createCategory(request);
        return ResponseEntity
                .created(URI.create("/api/cashbook/categories/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable String id, @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success(cashbookService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable String id) {
        cashbookService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ── Vouchers ─────────────────────────────────────────────────────────────

    @GetMapping("/vouchers")
    public ResponseEntity<PageResponse<VoucherResponse>> listVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CashFlowMethod fund,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to,
            @RequestParam(required = false) List<CashFlowType> types,
            @RequestParam(required = false) List<String> categoryIds,
            @RequestParam(required = false) Boolean voided,
            @RequestParam(required = false) Boolean accountingToIncome,
            @RequestParam(required = false) String createdBy,
            @RequestParam(required = false) CashbookPartnerGroup partnerScope,
            @RequestParam(required = false) String partnerQuery,
            Pageable pageable) {
        VoucherFilter filter = new VoucherFilter(search, fund, from, to, types, categoryIds,
                voided, accountingToIncome, createdBy, partnerScope, partnerQuery);
        return ResponseEntity.ok(cashbookService.listVouchers(filter, pageable));
    }

    @GetMapping("/vouchers/export")
    public ApiResponse<List<VoucherResponse>> exportVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CashFlowMethod fund,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to,
            @RequestParam(required = false) List<CashFlowType> types,
            @RequestParam(required = false) List<String> categoryIds,
            @RequestParam(required = false) Boolean voided,
            @RequestParam(required = false) Boolean accountingToIncome,
            @RequestParam(required = false) String createdBy,
            @RequestParam(required = false) CashbookPartnerGroup partnerScope,
            @RequestParam(required = false) String partnerQuery) {
        VoucherFilter filter = new VoucherFilter(search, fund, from, to, types, categoryIds,
                voided, accountingToIncome, createdBy, partnerScope, partnerQuery);
        return ApiResponse.success(cashbookService.listVouchersUnpaged(filter));
    }

    @PostMapping("/vouchers")
    public ResponseEntity<ApiResponse<VoucherResponse>> createVoucher(
            @Valid @RequestBody CreateVoucherRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        VoucherResponse created = cashbookService.createVoucher(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/cashbook/vouchers/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PutMapping("/vouchers/{id}")
    public ApiResponse<VoucherResponse> updateVoucher(@PathVariable String id, @Valid @RequestBody CreateVoucherRequest request) {
        return ApiResponse.success(cashbookService.updateVoucher(id, request));
    }

    @PutMapping("/vouchers/{id}/void")
    public ApiResponse<VoucherResponse> voidVoucher(@PathVariable String id) {
        return ApiResponse.success(cashbookService.voidVoucher(id));
    }

    // ── Summary / opening balance ───────────────────────────────────────────

    @GetMapping("/summary")
    public ApiResponse<SummaryResponse> getSummary(
            @RequestParam(required = false) CashFlowMethod fund,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to) {
        VoucherFilter filter = new VoucherFilter(null, fund, from, to, null, null, null, null, null, null, null);
        return ApiResponse.success(cashbookService.getSummary(filter));
    }

    @GetMapping("/opening-balance")
    public ApiResponse<List<OpeningBalanceItem>> getOpeningBalances() {
        return ApiResponse.success(cashbookService.getOpeningBalances());
    }

    @PutMapping("/opening-balance")
    public ApiResponse<Void> updateOpeningBalance(
            @Valid @RequestBody UpdateOpeningBalanceRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        cashbookService.updateOpeningBalance(request, principal.getUsername());
        return ApiResponse.ok("Opening balance updated");
    }
}
