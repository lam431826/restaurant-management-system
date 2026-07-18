package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.AttendanceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * BR-AT-13: one attendance row as consumed by the PAY module's SalaryCalculator.
 * Carries the shift's scheduled times (for wage proration) and the AT-computed metrics —
 * otMinutes already has the BR-AT-10 minimum applied, so payroll must not recompute it.
 */
public record AttendanceForPayroll(
        LocalDate workDate,
        String shiftId,
        String shiftName,
        LocalTime shiftStartTime,
        LocalTime shiftEndTime,
        AttendanceType type,
        LocalDateTime actualCheckIn,
        LocalDateTime actualCheckOut,
        int workedMinutes,
        int otMinutes,
        int lateMinutes,
        int earlyLeaveMinutes,
        BigDecimal workCredit) {
}
