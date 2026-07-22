package com.rms.restaurant.module.reporting.dto;

import java.math.BigDecimal;
import java.util.List;

/** One period row of "Báo cáo kết quả hoạt động kinh doanh" (P&L). Mirrors the frontend's
 * FinLineKey/FIN_LINES schema (financialReportMockData.ts) field-for-field. returnedGoods and
 * otherExpense are always zero — no tracked concept for them anywhere else in this app. The
 * expense/other-income sub-lines that used to be fixed zero placeholders (expCCDC,
 * expDepreciation, expDeliveryFee, expQRFee, expWriteOff, expPointRedeem, incReturnFee,
 * incSalaryAdvanceReturn) are now user-managed via FinancialCustomLine — see customLineValues.
 * expPayroll stays fixed since it has a real data source (payroll module). */
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
        BigDecimal expPayroll,
        BigDecimal operatingProfit,
        BigDecimal otherIncome,
        BigDecimal otherExpense,
        BigDecimal netProfit,
        List<FinancialCustomLineAmountDto> customLineValues
) {}
