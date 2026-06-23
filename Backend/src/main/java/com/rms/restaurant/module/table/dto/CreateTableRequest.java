package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTableRequest(
        @NotBlank @Size(max = 20) String name,
        @NotNull @Min(1) @Max(50) Integer capacity,
        @Size(max = 50) String area
) {}
