package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotBlank;

public record TransferTableRequest(@NotBlank String fromTableId, @NotBlank String toTableId) {}
