package com.rms.restaurant.module.attendance.dto;

import java.math.BigDecimal;

/** Per-employee period totals (UC-AT-07, BR-AT-13) — input to the PAY module and CSV export. */
public record AttendanceSummaryRow(
        String employeeId,
        String employeeCode,
        String employeeName,
        int scheduledCount,
        int presentCount,
        int leaveApprovedCount,
        int leaveUnapprovedCount,
        BigDecimal workCreditTotal,
        int lateMinutesTotal,
        int earlyLeaveMinutesTotal,
        int otMinutesTotal,
        BigDecimal penaltyTotal) {
}
