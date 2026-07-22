package com.rms.restaurant.module.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PayrollHolidayRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull LocalDate holidayDate
) {}
