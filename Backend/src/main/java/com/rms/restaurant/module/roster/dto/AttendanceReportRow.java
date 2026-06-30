package com.rms.restaurant.module.roster.dto;

public record AttendanceReportRow(
        String employeeId,
        String employeeName,
        int shiftCount,
        double workedHours,
        int lateCount,
        int noShowCount
) {}
