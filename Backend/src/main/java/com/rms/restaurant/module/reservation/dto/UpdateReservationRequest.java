package com.rms.restaurant.module.reservation.dto;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDateTime;

public record UpdateReservationRequest(
        String tableId,
        @Min(1) @Max(20) Integer partySize,
        @Future LocalDateTime datetime,
        String note,
        ReservationStatus status
) {}
