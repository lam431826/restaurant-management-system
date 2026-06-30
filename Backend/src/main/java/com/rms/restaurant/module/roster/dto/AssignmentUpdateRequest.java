package com.rms.restaurant.module.roster.dto;

import java.time.LocalDate;
import java.util.List;

public record AssignmentUpdateRequest(
        boolean repeatWeekly,
        List<Integer> repeatDays,
        LocalDate repeatEnd,
        boolean holidayWork
) {}
