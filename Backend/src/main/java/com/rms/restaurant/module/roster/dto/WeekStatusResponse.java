package com.rms.restaurant.module.roster.dto;

import com.rms.restaurant.common.utils.enums.WeekStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WeekStatusResponse(
        LocalDate weekStart,
        WeekStatus status,
        int version,
        LocalDateTime publishedAt
) {}
