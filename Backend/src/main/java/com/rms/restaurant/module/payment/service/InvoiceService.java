package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.common.utils.wrapper.PageResponse;
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
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface InvoiceService {

    /**
     * Lists invoices, optionally scoped to a lifecycle status set.
     * A null or empty {@code statuses} returns every lifecycle status.
     * When {@code orderId} is set, the result is a single unpaged page containing every
     * invoice for that order (the Cashier checkout flow needs all of them, never a slice).
     */
    PageResponse<InvoiceSummaryResponse> getAll(Boolean paid, String orderId, List<InvoiceStatus> statuses, Pageable pageable);

    InvoiceResponse generate(GenerateInvoiceRequest request, String username);

    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);

    InvoiceDetailResponse getById(String invoiceId);

    SplitInvoiceResponse split(String invoiceId, SplitInvoiceRequest request, String username);

    MergeInvoiceResponse merge(MergeInvoiceRequest request, String username);

    SendInvoiceResponse sendInvoice(String invoiceId);
}
