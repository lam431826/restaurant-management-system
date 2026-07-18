package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.AttendanceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AttendanceRecordResponse(
        String id,
        String scheduleId,
        AttendanceType type,
        LocalDateTime actualCheckIn,
        LocalDateTime actualCheckOut,
        int workedMinutes,
        int lateMinutes,
        int earlyLeaveMinutes,
        int otMinutes,
        BigDecimal workCredit,
        boolean autoFilled,
        String note) {
}
