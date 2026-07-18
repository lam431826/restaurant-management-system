package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.ManualTimeMode;
import jakarta.validation.constraints.NotNull;

/** UC-AT-05: full settings snapshot — the UI always saves the whole form. */
public record AttendanceSettingRequest(
        int standardWorkdayMinutes,
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
        @NotNull ManualTimeMode manualDefaultTimeMode) {
}
