package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;

public record InvoiceItemResponse(
        String menuItemId,
        String menuItemName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String note,
        String orderItemId
) {}
