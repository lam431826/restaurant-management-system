package com.rms.restaurant.module.attendance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** One schedule occurrence with its (optional) attendance for the timesheet grid (UC-AT-03/07). */
public record TimesheetCellResponse(
        String scheduleId,
        String employeeId,
        String employeeCode,
        String employeeName,
        String shiftId,
        String shiftName,
        LocalTime shiftStartTime,
        LocalTime shiftEndTime,
        LocalDate workDate,
        TimesheetStatus displayStatus,
        AttendanceRecordResponse record,
        List<ViolationResponse> violations,
        BigDecimal penaltyTotal,
        String substituteEmployeeId,
        String substituteEmployeeName) {
}
