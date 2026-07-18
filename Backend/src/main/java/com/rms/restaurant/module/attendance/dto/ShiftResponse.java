package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;

import java.time.LocalTime;

public record ShiftResponse(
        String id,
        String name,
        LocalTime startTime,
        LocalTime endTime,
        LocalTime checkInWindowStart,
        LocalTime checkInWindowEnd,
        String applyScope,
        WorkShiftStatus status) {
}
