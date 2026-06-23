package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record UpdateTableRequest(
        String name,
        String note,
        String area,
        @PositiveOrZero Integer capacity,
        Integer displayOrder,
        Boolean active
) {}
