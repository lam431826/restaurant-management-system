package com.rms.restaurant.module.attendance.dto;

import com.rms.restaurant.common.utils.enums.AttendanceType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.List;

/**
 * UC-AT-03 A1 / UC-AT-04 bulk mark: the same type/times applied over many schedules.
 * merged=true routes one employee's consecutive shifts on one day through the BR-AT-11
 * single Vào–Ra split. substituteEmployeeId requires exactly one schedule (BR-AT-07).
 */
public record BulkAttendanceRequest(
        @NotEmpty(message = "Vui lòng chọn lịch làm việc") List<String> scheduleIds,
        @NotNull AttendanceType type,
        LocalTime checkInTime,
        LocalTime checkOutTime,
        boolean merged,
        String substituteEmployeeId,
        String note) {
}
