package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.WorkShiftStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/** UC-AT-01. status is optional on create (defaults to ACTIVE). */
public record ShiftRequest(
        @NotBlank(message = "Vui lòng nhập tên ca làm việc") String name,
        @NotNull(message = "Vui lòng nhập giờ bắt đầu ca") LocalTime startTime,
        @NotNull(message = "Vui lòng nhập giờ kết thúc ca") LocalTime endTime,
        LocalTime checkInWindowStart,
        LocalTime checkInWindowEnd,
        String applyScope,
        WorkShiftStatus status) {
}
