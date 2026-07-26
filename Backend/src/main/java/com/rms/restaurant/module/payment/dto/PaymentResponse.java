package com.rms.restaurant.module.payment.dto;

import com.rms.restaurant.common.utils.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        String id,
        String invoiceId,
        PaymentMethod method,
        BigDecimal amount,
        String status,
        // Transaction/reference code. CASH: unused (null). VNPAY: vnp_TxnRef.
        // Historical QR rows may still carry their former gateway reference.
        String gatewayRef,
        BigDecimal receivedAmount,
        BigDecimal changeAmount,
        LocalDateTime expiresAt,
        LocalDateTime paidAt,
        LocalDateTime createdAt,
        // VNPAY only — null for every other method.
        String vnpTransactionNo,
        String vnpResponseCode,
        String vnpTransactionStatus,
        String vnpBankCode,
        String vnpCardType
) {}
