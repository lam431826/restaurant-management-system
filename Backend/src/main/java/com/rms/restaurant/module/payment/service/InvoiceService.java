package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.*;

import java.util.List;

public interface InvoiceService {
    InvoiceResponse generate(GenerateInvoiceRequest request);
    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);
    InvoiceResponse getByOrderId(String orderId);
    InvoiceResponse[] split(SplitBillRequest request);
    InvoiceResponse merge(MergeBillRequest request);

    // PM-06 / PM-07 — manager read-only views
    List<InvoiceListItem> listInvoices();
    InvoiceDetailResponse getDetail(String invoiceId);
}
