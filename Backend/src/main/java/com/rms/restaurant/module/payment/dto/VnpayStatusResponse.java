package com.rms.restaurant.module.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * status: PENDING, PAID, FAILED, CANCELLED, or EXPIRED.
 *
 * <p>Carries enough UUID context (invoiceId/orderId/tableId) for the frontend to restore
 * the exact table/order the cashier was on after the VNPAY redirect round-trip, without
 * ever deriving a UUID from a business code (HDxxxxxx/DHxxxxxx are display-only).
 */
public record VnpayStatusResponse(
        String txnRef,
        String invoiceId,
        String invoiceCode,
        String orderId,
        String orderCode,
        String tableId,
        String status,
        BigDecimal amount,
        LocalDateTime paidAt
) {}
