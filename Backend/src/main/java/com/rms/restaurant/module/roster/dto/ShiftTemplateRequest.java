package com.rms.restaurant.module.roster.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalTime;

public record ShiftTemplateRequest(
        @NotBlank String name,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @PositiveOrZero int breakMinutes,
        @PositiveOrZero int headcountTarget,
        @NotNull @PositiveOrZero BigDecimal wage
) {}
