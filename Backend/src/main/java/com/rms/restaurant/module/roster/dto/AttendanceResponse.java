package com.rms.restaurant.module.roster.dto;

import com.rms.restaurant.common.utils.enums.AttendanceStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceResponse(
        String id,
        String employeeId,
        LocalDate date,
        String shiftTemplateId,
        String assignmentId,
        AttendanceStatus status,
        LocalDateTime checkInAt,
        LocalDateTime checkOutAt,
        Integer workedMinutes,
        boolean late,
        String clockOutReason
) {}
