package com.rms.restaurant.module.attendance.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** One materialized occurrence for the schedule grid (UC-AT-02). */
public record ScheduleResponse(
        String id,
        String employeeId,
        String employeeCode,
        String employeeName,
        String shiftId,
        String shiftName,
        LocalTime shiftStartTime,
        LocalTime shiftEndTime,
        LocalDate workDate,
        String ruleId,
        LocalDate ruleStartDate,
        LocalDate ruleEndDate,
        String substituteEmployeeId,
        String substituteEmployeeName) {
}
