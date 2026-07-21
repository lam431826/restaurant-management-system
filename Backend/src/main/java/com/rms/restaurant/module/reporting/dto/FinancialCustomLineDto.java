package com.rms.restaurant.module.reporting.dto;

import com.rms.restaurant.common.utils.enums.FinancialLineGroup;

public record FinancialCustomLineDto(
        String id,
        FinancialLineGroup group,
        String name,
        int sortOrder
) {}
