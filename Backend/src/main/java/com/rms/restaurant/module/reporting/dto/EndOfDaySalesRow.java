package com.rms.restaurant.module.reporting.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One invoice line in the "Báo cáo cuối ngày" (end-of-day sales) report. tax/otherRevenue are
 * always zero — neither concept exists anywhere in the domain (no VAT/surcharge model).
 * staffId/staffName are null when the order has no attributable cashier (e.g. guest QR orders).
 */
public record EndOfDaySalesRow(
        String id,
        String code, // invoice.code, e.g. "HD000001" — the persisted human-readable business code
        LocalDateTime time,
        String tableName,
        String areaName,
        int quantity,
        BigDecimal grossAmount,
        BigDecimal invoiceDiscount,
        BigDecimal revenue,
        BigDecimal otherRevenue,
        BigDecimal tax,
        BigDecimal payment,
        String staffId,
        String staffName,
        PaymentMethod paymentMethod) {
}
