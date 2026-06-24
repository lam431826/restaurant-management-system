package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotBlank;

public record AreaRequest(@NotBlank String name, String note, Integer displayOrder) {}
