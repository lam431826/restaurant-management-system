package com.rms.restaurant.module.roster.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

// WS-03: assign one or more shift templates, on one date, to one or more employees at once
// (the primary employee plus any "apply to other employees" picks).
public record AssignmentCreateRequest(
        @NotEmpty List<String> employeeIds,
        @NotNull LocalDate date,
        @NotEmpty List<String> shiftTemplateIds,
        boolean repeatWeekly,
        // ISO-8601 weekday values, 1=Monday..7=Sunday (java.time.DayOfWeek#getValue()).
        List<Integer> repeatDays,
        LocalDate repeatEnd,
        boolean holidayWork
) {}
