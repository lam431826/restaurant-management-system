package com.rms.restaurant.module.payment.controller;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.exception.ApplicationError;
import com.rms.restaurant.common.utils.exception.ApplicationException;
import com.rms.restaurant.common.utils.wrapper.ApiResponse;
import com.rms.restaurant.module.payment.dto.ApplyDiscountRequest;
import com.rms.restaurant.module.payment.dto.GenerateInvoiceRequest;
import com.rms.restaurant.module.payment.dto.InvoiceDetailResponse;
import com.rms.restaurant.module.payment.dto.InvoiceResponse;
import com.rms.restaurant.module.payment.dto.InvoiceSummaryResponse;
import com.rms.restaurant.module.payment.dto.MergeInvoiceRequest;
import com.rms.restaurant.module.payment.dto.MergeInvoiceResponse;
import com.rms.restaurant.module.payment.dto.SendInvoiceResponse;
import com.rms.restaurant.module.payment.dto.SplitInvoiceRequest;
import com.rms.restaurant.module.payment.dto.SplitInvoiceResponse;
import com.rms.restaurant.module.payment.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {
    private final InvoiceService invoiceService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<InvoiceSummaryResponse>>> getAll(
            @RequestParam(required = false) Boolean paid,
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) List<String> status) {
        return ResponseEntity.ok(ApiResponse.success(
                invoiceService.getAll(paid, orderId, parseStatusFilter(status))
        ));
    }

    /**
     * Parses the optional lifecycle filter. Values are accepted as repeated or
     * comma-separated parameters. Binding to the enum directly would surface an invalid
     * value as HTTP 500 through the generic handler, so it is parsed here to return a
     * clean business error instead.
     */
    private List<InvoiceStatus> parseStatusFilter(List<String> status) {
        if (status == null || status.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<InvoiceStatus> parsed = new LinkedHashSet<>();
        for (String rawValue : status) {
            if (rawValue == null || rawValue.isBlank()) {
                throw new ApplicationException(ApplicationError.INVALID_INVOICE_STATUS_FILTER);
            }
            for (String candidate : rawValue.split(",")) {
                String normalized = candidate.trim();
                if (normalized.isEmpty()) {
                    throw new ApplicationException(ApplicationError.INVALID_INVOICE_STATUS_FILTER);
                }
                try {
                    parsed.add(InvoiceStatus.valueOf(normalized.toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException invalidStatus) {
                    throw new ApplicationException(ApplicationError.INVALID_INVOICE_STATUS_FILTER);
                }
            }
        }
        return List.copyOf(parsed);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<InvoiceDetailResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getById(id)));
    }

    @PostMapping("/{invoiceId}/split")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<SplitInvoiceResponse>> split(
            @PathVariable String invoiceId,
            @Valid @RequestBody SplitInvoiceRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.split(invoiceId, request, principal.getUsername())));
    }

    @PostMapping("/merge")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<MergeInvoiceResponse>> merge(
            @Valid @RequestBody MergeInvoiceRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.merge(request, principal.getUsername())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> generate(
            @Valid @RequestBody GenerateInvoiceRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        InvoiceResponse created = invoiceService.generate(request, principal.getUsername());
        return ResponseEntity
                .created(URI.create("/api/invoices/" + created.id()))
                .body(ApiResponse.success(created));
    }

    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<SendInvoiceResponse>> send(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(
                invoiceService.sendInvoice(id),
                "Invoice sent successfully"
        ));
    }

    @PutMapping("/{id}/discount")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> applyDiscount(@PathVariable String id,
                                                                      @Valid @RequestBody ApplyDiscountRequest request) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.applyDiscount(id, request)));
    }
}
