package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkAvailabilityRequest(@NotEmpty List<String> ids, @NotNull Boolean available) {}
