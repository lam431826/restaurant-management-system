package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/**
 * UC-AT-03/04 single mark. Times are HH:mm; the service anchors them to the schedule's
 * work date (check-out before check-in rolls to the next day — overnight shifts).
 * substituteEmployeeId is only meaningful for leave types (BR-AT-07).
 * otBeforeMinutes/otAfterMinutes let the manager override the auto-computed OT (BR-AT-10)
 * for this record when marking early check-in / late check-out; null on either side keeps
 * the automatic calculation for that side.
 */
public record AttendanceUpsertRequest(
        @NotNull AttendanceType type,
        LocalTime checkInTime,
        LocalTime checkOutTime,
        String substituteEmployeeId,
        String note,
        Integer otBeforeMinutes,
        Integer otAfterMinutes) {
}
