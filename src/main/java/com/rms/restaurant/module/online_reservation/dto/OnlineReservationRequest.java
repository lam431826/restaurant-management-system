package com.rms.restaurant.module.online_reservation.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record OnlineReservationRequest(
        @NotBlank String guestName,
        @NotBlank @Pattern(regexp = "^0\\d{9,10}$") String phone,
        @Email String email,
        @NotNull @Min(1) @Max(20) Integer partySize,
        @NotNull @Future LocalDateTime datetime,
        String note
) {}
