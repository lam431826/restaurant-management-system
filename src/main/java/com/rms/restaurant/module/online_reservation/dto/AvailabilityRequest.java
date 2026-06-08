package com.rms.restaurant.module.online_reservation.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record AvailabilityRequest(
        @NotNull @Future LocalDateTime datetime,
        @NotNull @Min(1) Integer partySize
) {}
