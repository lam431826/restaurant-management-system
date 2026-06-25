package com.rms.restaurant.module.roster.dto;

import java.time.LocalDate;
import java.util.List;

public record AssignmentResponse(
        String id,
        String employeeId,
        String shiftTemplateId,
        LocalDate date,
        boolean repeatWeekly,
        List<Integer> repeatDays,
        LocalDate repeatEnd,
        boolean holidayWork,
        List<LocalDate> excludedDates
) {}
