package com.rms.restaurant.module.payroll.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PayrollHolidayResponse(
        String id,
        String name,
        LocalDate holidayDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
