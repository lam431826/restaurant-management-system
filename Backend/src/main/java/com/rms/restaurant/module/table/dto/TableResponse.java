package com.rms.restaurant.module.table.dto;

import com.rms.restaurant.common.utils.enums.TableStatus;

import java.time.LocalDateTime;

public record TableResponse(
        String id,
        String name,
        String note,
        String area,
        int capacity,
        int displayOrder,
        boolean active,
        TableStatus status,
        String qrToken,
        String activeOrderId,
        ReservationSummary upcomingReservation,
        /** Set only when this table's OCCUPIED status came from a walk-in check-in (no
         * reservation) — used by the frontend to disable/explain why a new reservation can't
         * be assigned here yet. Null for reservation-driven occupancy. */
        LocalDateTime occupiedSince
) {
    public record ReservationSummary(
            String id,
            String guestName,
            String phone,
            int partySize,
            LocalDateTime datetime
    ) {}
}
