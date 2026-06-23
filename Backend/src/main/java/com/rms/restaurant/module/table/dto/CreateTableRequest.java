package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateTableRequest(
        @NotBlank String name,
        String note,
        String area,
        @PositiveOrZero Integer capacity,
        Integer displayOrder,
        Boolean active
) {}
