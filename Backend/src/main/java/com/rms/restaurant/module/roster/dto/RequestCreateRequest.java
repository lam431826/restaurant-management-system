package com.rms.restaurant.module.roster.dto;

import com.rms.restaurant.common.utils.enums.ShiftRequestType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record RequestCreateRequest(
        @NotNull ShiftRequestType type,
        @NotNull LocalDate date,
        @NotBlank String shiftTemplateId,
        String targetEmployeeId, // required when type == SWAP
        @NotBlank String reason
) {}
