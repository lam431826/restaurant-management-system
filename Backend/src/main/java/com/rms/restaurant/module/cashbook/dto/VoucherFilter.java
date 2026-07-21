package com.rms.restaurant.module.cashbook.dto;

import com.rms.restaurant.common.utils.enums.CashFlowMethod;
import com.rms.restaurant.common.utils.enums.CashFlowType;
import com.rms.restaurant.common.utils.enums.CashbookPartnerGroup;

import java.time.LocalDateTime;
import java.util.List;

/** Built by the controller from query params — not a validated request body. */
public record VoucherFilter(
        String search,
        CashFlowMethod fund,
        LocalDateTime from,
        LocalDateTime to,
        List<CashFlowType> types,
        List<String> categoryIds,
        Boolean voided,
        Boolean accountingToIncome,
        String createdBy,
        CashbookPartnerGroup partnerScope,
        String partnerQuery
) {}
