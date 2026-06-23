package com.rms.restaurant.module.reservation.dto;

import jakarta.validation.constraints.NotBlank;

public record TransferTableRequest(@NotBlank String tableId) {}
