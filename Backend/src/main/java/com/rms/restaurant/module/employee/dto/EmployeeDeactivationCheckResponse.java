package com.rms.restaurant.module.employee.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Deactivation-eligibility check (SRS §9 gap #2): hard blockers that must be resolved via the
 * owning module before the employee can be deactivated, plus soft warnings the caller must
 * acknowledge (see EMP_DEACTIVATE_WARNINGS_PENDING) but can proceed past.
 */
public record EmployeeDeactivationCheckResponse(
        boolean blocked,
        List<FutureScheduleItem> futureSchedules,
        List<UnfinalizedPayslipItem> unfinalizedPayslips,
        boolean hasOpenPosShift,
        OpenPosShiftInfo openPosShiftInfo,
        boolean hasOpenAttendanceToday,
        OpenAttendanceInfo openAttendanceInfo
) {
    public record FutureScheduleItem(String scheduleId, LocalDate workDate, String shiftId, String shiftName) {}

    public record UnfinalizedPayslipItem(String payslipId, String payslipCode,
                                          String payrollSheetId, String payrollSheetCode,
                                          String payrollSheetName, String payrollSheetStatus) {}

    public record OpenPosShiftInfo(String shiftId, LocalDateTime openedAt) {}

    public record OpenAttendanceInfo(String scheduleId, String shiftName, LocalDateTime checkInTime) {}
}
