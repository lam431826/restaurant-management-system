package com.rms.restaurant.module.notification.dto;

import java.time.LocalDateTime;

public record NotificationLogResponse(
        String id,
        String type,
        String channel,
        String recipient,
        String template,
        String status,
        String errorMessage,
        String referenceId,
        String referenceType,
        LocalDateTime sentAt
) {}
