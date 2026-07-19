package com.rms.restaurant.module.payroll.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One attendance record inside a payslip's snapshot (tab "Chấm công chi tiết").
 * Serialized as JSON into payslips.attendance_snapshot at computation time — BR-PAY-13.
 */
public record AttendanceDetailRow(
        LocalDate date,
        String shiftName,
        String status,
        LocalDateTime checkInAt,
        LocalDateTime checkOutAt,
        Integer workedMinutes,
        Integer otMinutes,
        String dayType,
        String rateApplied,
        BigDecimal amount,
        String note
) {}
