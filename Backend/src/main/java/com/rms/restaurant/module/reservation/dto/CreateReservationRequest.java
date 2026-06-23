package com.rms.restaurant.module.reservation.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record CreateReservationRequest(
        @NotBlank String guestName,
        @NotBlank @Pattern(regexp = "^0\\d{9,10}$") String phone,
        @NotNull @Min(1) @Max(20) Integer partySize,
        @NotNull @Future LocalDateTime datetime,
        String tableId,
        String note,
        @Email String guestEmail
) {}
