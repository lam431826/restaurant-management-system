package com.rms.restaurant.module.roster.dto;

import java.math.BigDecimal;
import java.time.LocalTime;

public record ShiftTemplateResponse(
        String id,
        String name,
        LocalTime startTime,
        LocalTime endTime,
        int breakMinutes,
        int headcountTarget,
        BigDecimal wage
) {}
