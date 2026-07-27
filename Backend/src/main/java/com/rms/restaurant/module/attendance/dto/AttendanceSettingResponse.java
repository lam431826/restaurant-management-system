package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.ManualTimeMode;

public record AttendanceSettingResponse(
        boolean halfDayEnabled,
        int halfDayMinMinutes,
        int halfDayMaxMinutes,
        boolean lateEnabled,
        int lateGraceMinutes,
        boolean earlyLeaveEnabled,
        int earlyLeaveGraceMinutes,
        boolean latePenaltyEnabled,
        int latePenaltyRoundingMinutes,
        boolean overtimeEnabled,
        int otRoundingMinutes,
        boolean mergedShiftEnabled,
        int mergedShiftMaxCount,
        int mergedShiftMaxBreakMinutes,
        ManualTimeMode manualDefaultTimeMode) {
}
