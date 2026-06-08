package com.rms.restaurant.module.reservation.dto;

import com.rms.restaurant.common.utils.enums.ReservationStatus;

import java.time.LocalDateTime;

public record UpdateReservationRequest(
        String tableId,
        Integer partySize,
        LocalDateTime datetime,
        String note,
        ReservationStatus status
) {}
