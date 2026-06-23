package com.rms.restaurant.module.reservation.dto;

import com.rms.restaurant.common.utils.enums.ReservationStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record UpdateReservationRequest(
        String tableId,
        String guestName,
        @Pattern(regexp = "^0\\d{9,10}$", message = "Phone must start with 0 and be 10-11 digits")
        String phone,
        @Email String guestEmail,
        @Min(1) @Max(20) Integer partySize,
        @Future LocalDateTime datetime,
        String note,
        ReservationStatus status
) {}
