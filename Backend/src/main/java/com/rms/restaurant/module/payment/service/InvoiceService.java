package com.rms.restaurant.module.payment.service;

import com.rms.restaurant.common.utils.enums.InvoiceStatus;
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

import java.util.List;

public interface InvoiceService {

    /**
     * Lists invoices, optionally scoped to a lifecycle status set.
     * A null or empty {@code statuses} returns every lifecycle status.
     */
    List<InvoiceSummaryResponse> getAll(Boolean paid, String orderId, List<InvoiceStatus> statuses);

    InvoiceResponse generate(GenerateInvoiceRequest request, String username);

    InvoiceResponse applyDiscount(String invoiceId, ApplyDiscountRequest request);

    InvoiceDetailResponse getById(String invoiceId);

    SplitInvoiceResponse split(String invoiceId, SplitInvoiceRequest request, String username);

    MergeInvoiceResponse merge(MergeInvoiceRequest request, String username);

    SendInvoiceResponse sendInvoice(String invoiceId);
}
