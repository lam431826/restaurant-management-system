package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;

/** One period row of "Báo cáo kết quả hoạt động kinh doanh" (P&L). Mirrors the frontend's
 * FinLineKey/FIN_LINES schema (financialReportMockData.ts) field-for-field. Sub-lines with no
 * domain counterpart yet (returnedGoods, expCCDC, expDepreciation, expDeliveryFee, expQRFee,
 * expWriteOff, expPointRedeem, incReturnFee, incSalaryAdvanceReturn, otherExpense) are always
 * zero — there is no tracked concept for them anywhere else in this app. */
public record FinancialPeriodResponse(
        String key,
        String label,
        BigDecimal salesRevenue,
        BigDecimal discountReduction,
        BigDecimal invoiceDiscount,
        BigDecimal returnedGoods,
        BigDecimal netRevenue,
        BigDecimal cogs,
        BigDecimal grossProfit,
        BigDecimal expenses,
        BigDecimal expCCDC,
        BigDecimal expDepreciation,
        BigDecimal expDeliveryFee,
        BigDecimal expQRFee,
        BigDecimal expWriteOff,
        BigDecimal expPointRedeem,
        BigDecimal expPayroll,
        BigDecimal operatingProfit,
        BigDecimal otherIncome,
        BigDecimal incReturnFee,
        BigDecimal incSalaryAdvanceReturn,
        BigDecimal otherExpense,
        BigDecimal netProfit
) {}
