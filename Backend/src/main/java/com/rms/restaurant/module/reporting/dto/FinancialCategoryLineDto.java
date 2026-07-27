package com.rms.restaurant.module.reporting.dto;

import com.rms.restaurant.common.utils.enums.FinancialLineGroup;

/** A Cashbook category eligible to appear as a dynamic Chi phí(6)/Thu nhập khác(8) sub-line
 * on the financial report — group is derived from the category's CashFlowType (PAYMENT ->
 * EXPENSE, RECEIPT -> OTHER_INCOME). Read-only: managed in Sổ quỹ, not here. */
public record FinancialCategoryLineDto(
        String id,
        FinancialLineGroup group,
        String name
) {}
