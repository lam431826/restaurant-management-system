package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;
import com.rms.restaurant.common.utils.enums.CashbookSourceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VoucherResponse(
        String id,
        String code,
        CashFlowType type,
        LocalDateTime occurredAt,
        String categoryId,
        String categoryName,
        CashFlowMethod method,
        CashbookPartnerGroup partnerGroup,
        String partnerId,
        String partnerName,
        BigDecimal amount,
        String note,
        boolean accountingToIncome,
        CashbookSourceType sourceType,
        String sourceReferenceId,
        String createdBy,
        boolean voided,
        LocalDateTime createdAt
) {}
