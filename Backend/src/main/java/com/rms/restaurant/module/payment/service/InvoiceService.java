package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.*;

import java.util.List;

public interface InvoiceService {
    List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId);
    InvoiceResponse generate(GenerateInvoiceRequest request);
    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);
    InvoiceDetailResponse getById(String invoiceId);
    SplitInvoiceResponse split(String invoiceId, SplitInvoiceRequest request);
    SendInvoiceResponse sendInvoice(String invoiceId);
    InvoiceResponse getByOrderId(String orderId);
    InvoiceResponse merge(MergeBillRequest request);

    // PM-06 / PM-07 — manager read-only views
    List<InvoiceListItem> listInvoices();
    InvoiceDetailItem getDetail(String invoiceId);
}
