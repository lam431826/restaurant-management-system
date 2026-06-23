package com.rms.restaurant.module.online_reservation.dto;

import java.time.LocalDateTime;

public record OnlineCancelRequestResponse(
        String maskedEmail,
        LocalDateTime expiresAt
) {}
