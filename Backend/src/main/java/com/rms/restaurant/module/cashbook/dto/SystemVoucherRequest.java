package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Internal entry point for other modules (payroll, payment) to auto-generate a voucher —
 * not a REST DTO. {@code categoryCode} resolves against a CashbookCategory's reserved code
 * (e.g. "SALARY_PAYMENT", "SALES_RECEIPT"); the voucher code is minted server-side by the
 * cashbook module, same PT/PC numbering sequence as manual vouchers.
 */
public record SystemVoucherRequest(
        CashFlowType type,
        String categoryCode,
        LocalDateTime occurredAt,
        CashFlowMethod method,
        CashbookPartnerGroup partnerGroup,
        String partnerId,
        String partnerName,
        BigDecimal amount,
        String note,
        boolean accountingToIncome,
        CashbookSourceType sourceType,
        String sourceReferenceId,
        String createdBy
) {}
