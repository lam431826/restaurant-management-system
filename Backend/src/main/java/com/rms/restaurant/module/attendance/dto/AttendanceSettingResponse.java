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
        boolean otBeforeEnabled,
        int otBeforeMinMinutes,
        boolean otAfterEnabled,
        int otAfterMinMinutes,
        boolean mergedShiftEnabled,
        int mergedShiftMaxCount,
        int mergedShiftMaxBreakMinutes,
        ManualTimeMode manualDefaultTimeMode) {
}
