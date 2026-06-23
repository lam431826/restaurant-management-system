package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateTableRequest(
        @Size(max = 20) String name,
        @Min(1) @Max(50) Integer capacity,
        @Size(max = 50) String area
) {}
