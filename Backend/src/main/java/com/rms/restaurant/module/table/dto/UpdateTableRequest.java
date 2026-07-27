package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record UpdateTableRequest(
        @Size(max = 20) String name,
        String note,
        String area,
        @PositiveOrZero @Max(99) Integer capacity,
        Integer displayOrder,
        Boolean active
) {}
