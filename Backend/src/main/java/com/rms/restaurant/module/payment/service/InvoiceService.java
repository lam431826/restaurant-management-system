package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
import com.rms.restaurant.module.payment.dto.*;

import java.util.List;

public interface InvoiceService {
    /**
     * Lists invoices, optionally scoped to a lifecycle status set.
     * A null or empty {@code statuses} keeps the historical behaviour of returning every
     * lifecycle status, which the Cashier order view relies on.
     */
    List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId, List<InvoiceStatus> statuses);
    InvoiceResponse generate(GenerateInvoiceRequest request, String username);
    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);
    InvoiceDetailResponse getById(String invoiceId);
    SplitInvoiceResponse split(String invoiceId, SplitInvoiceRequest request, String username);
    MergeInvoiceResponse merge(MergeInvoiceRequest request, String username);
    SendInvoiceResponse sendInvoice(String invoiceId);
    InvoiceResponse getByOrderId(String orderId);

    // PM-06 / PM-07 — manager read-only views
    List<InvoiceListItem> listInvoices();
    InvoiceDetailItem getDetail(String invoiceId);
}
