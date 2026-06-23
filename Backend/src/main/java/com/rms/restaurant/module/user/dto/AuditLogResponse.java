package com.rms.restaurant.module.user.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        String id,
        String actorId,
        String actorUsername,
        String action,
        String targetEntity,
        String targetId,
        String detail,
        String ipAddress,
        LocalDateTime createdAt
) {}
