package com.rms.restaurant.module.payment.service.impl;

import com.rms.restaurant.module.payment.dto.*;
import com.rms.restaurant.module.payment.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    @Override public InvoiceResponse generate(GenerateInvoiceRequest request) { return null; }
    @Override public InvoiceResponse getByOrderId(String orderId) { return null; }
    @Override public InvoiceResponse[] split(SplitBillRequest request) { return null; }
    @Override public InvoiceResponse merge(MergeBillRequest request) { return null; }
}
