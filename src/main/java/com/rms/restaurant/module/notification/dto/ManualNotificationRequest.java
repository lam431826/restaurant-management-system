package com.rms.restaurant.module.notification.dto;

import com.rms.restaurant.common.utils.enums.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ManualNotificationRequest(
        @NotBlank String recipient,
        @NotNull NotificationChannel channel,
        @NotBlank String message
) {}
