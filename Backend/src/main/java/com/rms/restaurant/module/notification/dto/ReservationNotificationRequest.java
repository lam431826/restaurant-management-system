package com.rms.restaurant.module.notification.dto;

import com.rms.restaurant.common.utils.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReservationNotificationRequest(
        @NotBlank String reservationId,
        @NotNull NotificationType type
) {}
