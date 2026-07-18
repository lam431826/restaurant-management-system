package com.rms.restaurant.module.attendance.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * UC-AT-02: employeeIds x shiftIds fan-out ("Thêm lịch tương tự cho nhân viên khác").
 * repeatWeekly=false creates one-off occurrences on {@code date}; repeatWeekly=true creates
 * a rule per pair using repeatDays (ISO 1=Mon..7=Sun), optional repeatEnd (null = endless,
 * BR-AT-04) and workOnHolidays. Field shape mirrors the old roster AssignmentCreate so the
 * frontend ScheduleModal rewires cheaply.
 */
public record ScheduleCreateRequest(
        @NotEmpty(message = "Vui lòng chọn nhân viên") List<String> employeeIds,
        @NotEmpty(message = "Vui lòng chọn ca làm việc") List<String> shiftIds,
        @NotNull(message = "Vui lòng chọn ngày bắt đầu") LocalDate date,
        boolean repeatWeekly,
        List<Integer> repeatDays,
        LocalDate repeatEnd,
        boolean workOnHolidays) {
}
