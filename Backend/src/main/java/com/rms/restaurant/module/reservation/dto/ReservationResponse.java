package com.rms.restaurant.module.reservation.dto;

import com.rms.restaurant.common.utils.enums.ReservationStatus;

import java.time.LocalDateTime;

public record ReservationResponse(
        String id,
        String tableId,
        String guestName,
        String phone,
        String guestEmail,
        int partySize,
        LocalDateTime datetime,
        String note,
        ReservationStatus status,
        LocalDateTime createdAt
) {}
