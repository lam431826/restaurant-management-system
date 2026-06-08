package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.module.payment.dto.*;

public interface InvoiceService {
    InvoiceResponse generate(GenerateInvoiceRequest request);
    InvoiceResponse getByOrderId(String orderId);
    InvoiceResponse[] split(SplitBillRequest request);
    InvoiceResponse merge(MergeBillRequest request);
}
