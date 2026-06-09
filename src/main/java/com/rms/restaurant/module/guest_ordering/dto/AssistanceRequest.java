package com.rms.restaurant.module.guest_ordering.dto;

import jakarta.validation.constraints.NotBlank;

public record AssistanceRequest(@NotBlank String tableToken, @NotBlank String message) {}
