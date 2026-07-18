package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateTableRequest(
        @NotBlank @Size(max = 20) String name,
        String note,
        String area,
        @PositiveOrZero Integer capacity,
        Integer displayOrder,
        Boolean active
) {}
