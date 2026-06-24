package com.rms.restaurant.module.menu.dto;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(@NotNull Boolean available) {}
