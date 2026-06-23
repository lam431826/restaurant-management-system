package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.*;

import java.util.List;

public interface InvoiceService {
    List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId);
    InvoiceResponse generate(GenerateInvoiceRequest request);
    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);
    InvoiceDetailResponse getById(String invoiceId);
    SendInvoiceResponse sendInvoice(String invoiceId);
    InvoiceResponse getByOrderId(String orderId);
    InvoiceResponse[] split(SplitBillRequest request);
    InvoiceResponse merge(MergeBillRequest request);
}
