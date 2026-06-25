package com.rms.restaurant.module.roster.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ClockActionRequest(
        @NotNull LocalDate date,
        @NotBlank String shiftTemplateId
) {}
