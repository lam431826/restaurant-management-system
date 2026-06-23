package com.rms.restaurant.module.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ManualNotificationRequest(
        @NotBlank @Email String recipient,
        @NotBlank String message
) {}
