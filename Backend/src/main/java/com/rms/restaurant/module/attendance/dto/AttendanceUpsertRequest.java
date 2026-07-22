package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * UC-AT-03/04 single mark. Times are HH:mm. checkInDate/checkOutDate let the manager pin
 * either side to the schedule's work date or the following day (overnight shifts crossing
 * midnight); when omitted, the service falls back to its legacy anchoring — check-in on the
 * schedule's work date, check-out rolled to the next day only if its time isn't after check-in's.
 * substituteEmployeeId is only meaningful for leave types (BR-AT-07).
 * otBeforeMinutes/otAfterMinutes let the manager override the auto-computed OT (BR-AT-10)
 * for this record when marking early check-in / late check-out; null on either side keeps
 * the automatic calculation for that side.
 */
public record AttendanceUpsertRequest(
        @NotNull AttendanceType type,
        LocalDate checkInDate,
        LocalTime checkInTime,
        LocalDate checkOutDate,
        LocalTime checkOutTime,
        String substituteEmployeeId,
        String note,
        Integer otBeforeMinutes,
        Integer otAfterMinutes) {
}
