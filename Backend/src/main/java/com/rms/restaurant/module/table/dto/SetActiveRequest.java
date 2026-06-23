package com.rms.restaurant.module.table.dto;

import jakarta.validation.constraints.NotNull;

public record SetActiveRequest(@NotNull Boolean active) {}
