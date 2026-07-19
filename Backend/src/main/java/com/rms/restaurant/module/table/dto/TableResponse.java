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
        ReservationSummary upcomingReservation
) {
    public record ReservationSummary(
            String id,
            String guestName,
            String phone,
            int partySize,
            LocalDateTime datetime
    ) {}
}
